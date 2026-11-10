import type { AuthService } from '../auth/auth.service'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common'
import {
  mcpResumeCreateInputSchema,
  mcpResumeCreateResultSchema,
  deletedResumeSchema,
  mcpResumeDeleteInputSchema,
  mcpResumeDuplicateInputSchema,
  mcpResumeMetadataInputSchema,
  mcpResumeMetadataResultSchema,
  mcpResumePatchInputSchema,
  mcpResumeReadInputSchema,
  mcpResumeReadResultSchema,
  mcpResumeUpdateInputSchema,
  mcpResumeUpdateResultSchema,
} from '@resume-copilot/contracts'
import type { ResumesService } from '../resumes/resumes.service'
import { z } from 'zod'
import {
  AUTH_SERVER_METADATA_PATH,
  MCP_METADATA_PATH,
  MCP_PATH,
  RESUME_EDIT_SCOPE,
  RESUME_FULL_READ_SCOPE,
  RESUME_MANAGE_SCOPE,
  RESUME_READ_SCOPE,
  RESUME_WRITE_SCOPE,
} from './protocol'
import { createResume } from './create-resume'
import { readResume } from './read-resume'

const maxReadResultBytes = 64 * 1024

export function createMcpHandler(origin: string, auth: AuthService, resumes: ResumesService) {
  const resource = origin + MCP_PATH
  const metadata = origin + MCP_METADATA_PATH
  const issuer = origin + '/api/auth'
  const noStore = { 'cache-control': 'no-store' }
  const missingScope = (scope: string) => ({
    isError: true,
    content: [{ type: 'text' as const, text: 'This tool needs additional permission.' }],
    _meta: {
      'mcp/www_authenticate': [
        `Bearer resource_metadata="${metadata}", error="insufficient_scope", scope="${scope}"`,
      ],
    },
  })

  return async (request: Request): Promise<Response> => {
    const { pathname } = new URL(request.url)
    if (pathname === MCP_METADATA_PATH && request.method === 'GET') {
      return Response.json({
        resource,
        authorization_servers: [issuer],
        scopes_supported: [
          RESUME_READ_SCOPE,
          RESUME_FULL_READ_SCOPE,
          RESUME_WRITE_SCOPE,
          RESUME_EDIT_SCOPE,
          RESUME_MANAGE_SCOPE,
        ],
        bearer_methods_supported: ['header'],
      })
    }
    if (pathname === AUTH_SERVER_METADATA_PATH && request.method === 'GET')
      return auth.getMcpAuthorizationMetadata(request)

    if (pathname !== MCP_PATH || request.method !== 'POST')
      return new Response(null, {
        status: 405,
        headers: { ...noStore, allow: pathname === MCP_PATH ? 'POST' : 'GET' },
      })

    const requestOrigin = request.headers.get('origin')
    if (requestOrigin !== null && requestOrigin !== origin)
      return new Response(null, { status: 403, headers: noStore })

    const token = /^Bearer ([A-Za-z0-9._~+/-]+=*)$/i.exec(
      request.headers.get('authorization') ?? '',
    )?.[1]
    const principal = token ? await auth.getMcpPrincipal(token, resource) : null
    const canReadFullResume = principal?.scopes.includes(RESUME_FULL_READ_SCOPE) ?? false
    const canReadSelectedContent = principal?.scopes.includes(RESUME_READ_SCOPE) ?? false
    const canRead = canReadFullResume || canReadSelectedContent
    const readScope =
      canReadSelectedContent && !canReadFullResume ? RESUME_READ_SCOPE : RESUME_FULL_READ_SCOPE
    const canWrite = principal?.scopes.includes(RESUME_WRITE_SCOPE)
    const canEdit = principal?.scopes.includes(RESUME_EDIT_SCOPE)
    const canManage = principal?.scopes.includes(RESUME_MANAGE_SCOPE)
    if (!principal || (!canRead && !canWrite && !canEdit && !canManage)) {
      const challenge = [`resource_metadata="${metadata}"`]
      if (principal) challenge.push('error="insufficient_scope"', `scope="${readScope}"`)
      else if (token) challenge.push('error="invalid_token"')
      return new Response(null, {
        status: principal ? 403 : 401,
        headers: {
          ...noStore,
          'www-authenticate': `Bearer ${challenge.join(', ')}`,
        },
      })
    }

    const server = new McpServer({ name: 'resume-copilot', version: '1.0.0' })
    server.registerTool(
      'list_resumes',
      {
        description: 'List titles and IDs of resumes owned by the connected account.',
        inputSchema: { cursor: z.uuid().optional() },
        annotations: { readOnlyHint: true },
        _meta: { securitySchemes: [{ type: 'oauth2', scopes: [readScope] }] },
      },
      async ({ cursor }) => {
        if (!canRead) return missingScope(readScope)
        const result = await resumes.listForMcp(principal.userId, cursor)
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      },
    )
    server.registerTool(
      'read_resume',
      {
        description:
          canReadSelectedContent && !canReadFullResume
            ? 'Read selected content of an owned resume by ID. Omit sections for ID, title, and version only. Contact fields require reconnecting with full resume access.'
            : 'Read an owned resume by ID. Omit sections for the full resume, including contact details and design. Pass an empty sections object for title, description, visibility, and version only.',
        inputSchema: mcpResumeReadInputSchema,
        outputSchema: mcpResumeReadResultSchema,
        annotations: { readOnlyHint: true },
        _meta: { securitySchemes: [{ type: 'oauth2', scopes: [readScope] }] },
      },
      async (input) => {
        if (!canRead) return missingScope(readScope)
        const result = await readResume(resumes, principal.userId, input, canReadFullResume)
        const text = JSON.stringify(result)
        if (new TextEncoder().encode(text).byteLength > maxReadResultBytes)
          throw new Error(
            'Resume selection is too large. Request fewer sections, fields, or entries.',
          )
        return { content: [{ type: 'text', text }], structuredContent: result }
      },
    )
    server.registerTool(
      'create_resume',
      {
        description:
          'Create a private resume with a title and optional resume description. Supply any known Basics, sections in data.modules, section order, typography, and design. Omitted fields use editor defaults. Reuse the request key only to retry the same creation.',
        inputSchema: mcpResumeCreateInputSchema,
        outputSchema: mcpResumeCreateResultSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        _meta: { securitySchemes: [{ type: 'oauth2', scopes: [RESUME_WRITE_SCOPE] }] },
      },
      async (input) => {
        if (!canWrite) return missingScope(RESUME_WRITE_SCOPE)
        const result = await createResume(resumes, principal.userId, origin, input)
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      },
    )
    server.registerTool(
      'update_resume',
      {
        description:
          'Update Summary or one existing work or project description. Use the version from read_resume. On conflict, read the latest version and ask for fresh confirmation.',
        inputSchema: mcpResumeUpdateInputSchema,
        outputSchema: mcpResumeUpdateResultSchema,
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        _meta: { securitySchemes: [{ type: 'oauth2', scopes: [RESUME_WRITE_SCOPE] }] },
      },
      async (input) => {
        if (!canWrite) return missingScope(RESUME_WRITE_SCOPE)
        if (new TextEncoder().encode(input.text).byteLength > 64 * 1024)
          throw new Error('Resume text exceeds 64 KiB.')
        const updated = await resumes
          .updateText(principal.userId, input)
          .catch((error: unknown) => {
            if (error instanceof ConflictException)
              throw new Error(
                'Resume version conflict. Read the latest version before requesting another edit.',
              )
            if (error instanceof NotFoundException) throw new Error('Resume or entry not found.')
            if (error instanceof BadRequestException)
              throw new Error('Could not read the resume content.')
            throw new Error('Could not update the resume.')
          })
        const result = {
          ...updated,
          editorUrl: origin + '/builder/' + encodeURIComponent(updated.id),
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      },
    )
    server.registerTool(
      'apply_resume_patch',
      {
        description:
          'Save a batch of resume edits together. Edit Basics, Summary, entries, sections, layout, and design. Use the version and stable IDs returned by read_resume. Present the proposed changes before saving. On conflict, read the latest version and ask for fresh confirmation.',
        inputSchema: mcpResumePatchInputSchema,
        outputSchema: mcpResumeUpdateResultSchema,
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        _meta: { securitySchemes: [{ type: 'oauth2', scopes: [RESUME_EDIT_SCOPE] }] },
      },
      async (input) => {
        if (!canEdit) return missingScope(RESUME_EDIT_SCOPE)
        if (new TextEncoder().encode(JSON.stringify(input.operations)).byteLength > 64 * 1024)
          throw new Error('Resume edits exceed 64 KiB.')
        const updated = await resumes
          .applyPatch(principal.userId, input)
          .catch((error: unknown) => {
            if (error instanceof ConflictException)
              throw new Error(
                'Resume version conflict. Read the latest version before requesting another edit.',
              )
            if (error instanceof NotFoundException) throw new Error('Resume not found.')
            if (error instanceof BadRequestException) throw new Error(error.message)
            throw new Error('Could not update the resume.')
          })
        const result = {
          ...updated,
          editorUrl: origin + '/builder/' + encodeURIComponent(updated.id),
        }
        return {
          content: [{ type: 'text', text: JSON.stringify(result) }],
          structuredContent: result,
        }
      },
    )
    const manageSecurity = { securitySchemes: [{ type: 'oauth2', scopes: [RESUME_MANAGE_SCOPE] }] }
    const editorUrl = (id: string) => origin + '/builder/' + encodeURIComponent(id)
    const manageResume = async <T extends Record<string, unknown>>(
      action: () => Promise<T>,
      conflictMessage?: string,
    ) => {
      if (!canManage) return missingScope(RESUME_MANAGE_SCOPE)
      const result = await action().catch((error: unknown) => {
        if (error instanceof NotFoundException) throw new Error('Resume not found.')
        if (error instanceof ConflictException) throw new Error(conflictMessage ?? error.message)
        if (error instanceof BadRequestException) throw new Error(error.message)
        throw new Error('Could not complete the resume operation.')
      })
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result) }],
        structuredContent: result,
      }
    }
    const staleVersion = 'Resume version conflict. Read the latest version before trying again.'
    server.registerTool(
      'update_resume_metadata',
      {
        description:
          'Change the title, description, or visibility (private/public) of an owned resume. Use the version returned by read_resume and confirm the exact changes. Visibility saves the preference. Public sharing links are not available yet.',
        inputSchema: mcpResumeMetadataInputSchema,
        outputSchema: mcpResumeMetadataResultSchema,
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        _meta: manageSecurity,
      },
      ({ resumeId, version, changes }) =>
        manageResume(async () => {
          if (new TextEncoder().encode(changes.description ?? '').byteLength > 64 * 1024)
            throw new BadRequestException('Resume description exceeds 64 KiB.')
          const { id, title, description, visibility, updatedAt } = await resumes.update(
            principal.userId,
            resumeId,
            { ...changes, expectedVersion: version },
          )
          return {
            id,
            title,
            description,
            visibility,
            version: updatedAt.getTime(),
            editorUrl: editorUrl(id),
          }
        }, staleVersion),
    )
    server.registerTool(
      'duplicate_resume',
      {
        description:
          'Copy an owned resume at the given version into a new private resume. The copy keeps the original description, content and design. Give it a new title and reuse its request key only for a retry.',
        inputSchema: mcpResumeDuplicateInputSchema,
        outputSchema: mcpResumeCreateResultSchema,
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
          idempotentHint: true,
          openWorldHint: false,
        },
        _meta: manageSecurity,
      },
      (input) =>
        manageResume(async () => {
          const result = await resumes.duplicateForMcp(principal.userId, input)
          return { ...result, editorUrl: editorUrl(result.id) }
        }),
    )
    server.registerTool(
      'delete_resume',
      {
        description:
          'Permanently delete one owned resume. Confirm the exact resume with the user before deleting. Use the version returned by read_resume and reconfirm after a conflict.',
        inputSchema: mcpResumeDeleteInputSchema,
        outputSchema: deletedResumeSchema,
        annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
        _meta: manageSecurity,
      },
      ({ resumeId, version }) =>
        manageResume(() => resumes.delete(principal.userId, resumeId, version), staleVersion),
    )
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    })
    try {
      await server.connect(transport)
      const response = await transport.handleRequest(request)
      response.headers.set('cache-control', 'no-store')
      return response
    } finally {
      await server.close()
    }
  }
}
