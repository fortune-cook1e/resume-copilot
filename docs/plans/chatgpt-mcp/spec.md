# ChatGPT MCP for resumes

Status: Tickets 01–05 passed local acceptance. The isolated public test deployment passed preflight. Live ChatGPT acceptance awaits test Google OAuth configuration.

The follow-up [MCP resume creation and editing spec](../mcp-editor-parity/spec.md) records the approved expansion beyond this initial tool contract.

## Problem Statement

Users can create and edit resumes in Resume Copilot, but they have to copy information between ChatGPT and the editor when they want help writing one. A user should be able to connect their account, ask ChatGPT to create a resume from supplied facts or revise part of an existing resume, and open the saved result in Resume Copilot.

## Solution

Expose four tools through a remote MCP server connected to a private ChatGPT plugin. Users sign in to Resume Copilot with Google, review account-level read and write permissions, and authorize the connection. They can revoke it in website settings.

ChatGPT can list owned resume titles, read the fields needed for a task, create a private resume, and update supported text fields in an owned resume. For updates, ChatGPT presents the intended change and the user confirms it in the client. The server saves the approved tool request directly and rejects it if the document version has changed. The same ownership and edit rules apply to both public and private resumes.

## User Stories

1. As a resume author, I want to add Resume Copilot as a private ChatGPT plugin, so that I can work on a resume in a conversation.
2. As a returning user, I want to connect the Resume Copilot account I already use, so that the plugin works with my existing resumes.
3. As a user authorizing ChatGPT, I want to see the name and scope of the connection, so that I know it can access resumes across my account.
4. As a connected user, I want to revoke access in Resume Copilot, so that ChatGPT can no longer read or write my resumes through that connection.
5. As an author with multiple resumes, I want ChatGPT to show titles so that I can identify the one to work on.
6. As an author with two similarly named resumes, I want the tool to identify the target by its ID, so that a title match alone cannot determine where to write.
7. As an author revising a project, I want ChatGPT to read that project entry, so that it can preserve the original facts and numbers.
8. As an author tailoring a Summary, I want ChatGPT to read relevant work, project, education, or skills content when requested, so that it can base the rewrite on my existing information.
9. As an author replacing text I already wrote, I want ChatGPT to look up the current version with a metadata-only read, so that the replacement does not require sending the previous text.
10. As a resume owner, I want contact fields to stay out of MCP read responses, so that routine rewriting does not send those details to the client.
11. As an author starting a resume, I want to create a blank private resume with a title, so that I can fill it in later.
12. As an author providing facts in chat, I want a new private resume prefilled with those facts, so that I can open and refine it in the editor.
13. As an author reviewing a proposed edit, I want to see the target and intended text before I confirm, so that I can decide whether to save it.
14. As an author updating my Summary or an existing work or project description, I want only the specified text to change, so that the rest of the resume stays as I arranged it.
15. As an author with public and private resumes, I want the same editing operation for each, so that sharing status does not change my ability to edit an owned resume.
16. As an author editing in both the browser and ChatGPT, I want stale writes to be rejected, so that the newest saved changes are preserved.
17. As a connected user, I want the saved result to open in the existing editor, so that I can continue editing, previewing, or exporting it there.

## Implementation Decisions

### Connection and identity

- Serve remote MCP over Streamable HTTP on the existing public origin. Keep the API Worker behind the existing service binding. Route the MCP endpoint and exact OAuth discovery endpoints through the public Worker, with equivalent local routing.
- Use OAuth authorization code with S256 PKCE. Reuse the Better Auth Google session for the browser sign-in and consent steps. Derive the MCP user ID from the authorized account. Validate the registered client and exact redirect URI, requested scopes, token expiry, issuer and resource binding. Support token refresh for an active grant and invalidate the grant on revocation.
- Start with an explicitly configured ChatGPT OAuth client using static credentials supported by the private plugin setup. Verify the exact callback and protocol negotiation during the first slice. Use an established OAuth implementation compatible with the current Workers runtime and D1. Evaluate the Better Auth provider first. Confirm its schema and revocation behavior before selecting it.
- Separate resume read and write permissions. The consent page explains that access is account-wide. A connection may only call a tool within its granted scope. Revocation must reject subsequent calls and refreshes under that grant, including calls with a previously issued, unexpired token.
- Creating or editing a resume requires `resumes:write`. Existing read grants require additional consent before they can use either write tool.
- MCP tool calls authenticate with bearer tokens. Keep existing same-origin checks on cookie-authenticated browser mutations. Handle MCP and OAuth machine requests at their exact routes with their own protocol and authentication checks. When a request supplies an Origin, validate it according to the MCP transport requirements. Allow protocol discovery and tool metadata as needed for linking, with no account data or writes before authorization.
- Advertise read-only and write tool metadata so ChatGPT can apply its confirmation settings. The client handles presentation and confirmation of a proposed edit. The server authorizes the tool, validates the input, and verifies ownership and version. Client confirmation settings govern whether it prompts for each write.

### Tools

| Tool            | Input and behavior                                                                                                                                                                                                                                                                                                                    | Output                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_resumes`  | List only the connected user's resumes. Keep results bounded with a way to fetch more.                                                                                                                                                                                                                                                | Title and ID for each resume, plus pagination metadata when needed.                                                                         |
| `read_resume`   | Require one resume ID. Allow a metadata-only read or explicit selection of supported content fields or sections and, where applicable, entry IDs. Use an allowlist for the response projection.                                                                                                                                       | ID, title, current version and requested content, with stable IDs for returned entries. Exclude contact fields and account data.            |
| `create_resume` | Accept a title and optional structured user-provided content. Use existing defaults for omitted values, server-generated IDs for new records and entries, and private visibility. The tool may receive contact fields the user supplies for the new resume.                                                                           | Saved resume ID, title, version and link to the authenticated editor. Omit contact details from the response.                               |
| `update_resume` | Require resume ID, the version read by the client and an allowed field target. Target existing work and project entries by stable entry ID. Validate and apply only the specified text to the latest matching revision. Support the Summary section, work descriptions, and project descriptions including their rich-text summaries. | Saved ID, new version and editor link. Return an explicit conflict on a stale version so the client can reread and seek fresh confirmation. |

- Reuse the existing resume service, Zod validation, defaults and editor format. Construct partial changes against the stored document. A missing Summary on an older resume can be initialized with the existing Summary defaults when the user supplies text. Preserve section order, styling, visibility, contact fields, and other entries on updates.
- Scope every operation to the authenticated owner. A valid ID from a different account receives the same missing-resource response as an unknown ID. List and read requests never expand to other accounts based on public visibility.
- The initial read allowlist covers Summary, Experience, Projects, Education, and Skills. Omitted selectors return metadata only. Experience, Projects, Education, and Skills accept explicit field lists and entry IDs. Contact fields and profile links are outside the projection. Selected text preserves stored Markdown. Reject a projection over 64 KiB and ask the client to narrow the selection.
- Compare and advance the version in the same conditional write. Use a version that advances even for rapid writes. Browser saves advance the same version. Protect against a stale browser autosave restoring an older document after an MCP write, and preserve the unsaved browser draft when reporting a conflict. Keep compatible existing API callers in scope when choosing the version contract.
- Use the stored `updatedAt` in epoch milliseconds as the version. The editor sends it as `expectedVersion` and receives HTTP 409 on a stale save. PATCH callers that omit it retain the existing unconditional behavior. On conflict, the editor pauses autosave and offers to open the latest saved version in another tab while keeping the local draft open.
- Use a request key for retries of the same create operation. Return the original result on a retry with the same account, key and input. Reject a reused key with different input. A validation error or failed conditional write leaves the stored document unchanged.
- Save a create request receipt and its private resume in the same D1 batch. Keep the receipt if the resume is deleted so a delayed retry cannot restore it. Creation accepts up to 64 KiB of validated input and supports optional basics, Summary, Experience, Projects, Education, and Skills.
- Keep the Workers and D1 free tier as the hosting constraint. Bound request and response sizes, use indexed ownership and lookup queries, and check runtime limits before live acceptance. Avoid logging tokens, authorization codes, contacts or resume contents.

## Testing Decisions

- Use the existing compiled API HTTP integration seam with isolated Miniflare/D1. Exercise OAuth and MCP through requests rather than calling internals. Use synthetic owners and resumes. Stub the external Google exchange for automated tests and exercise the application's actual authentication and persistence.
- Test observable decisions: correct owner and scope; invalid or replayed OAuth exchange; revoked token and refresh denial; projected fields and contact omission; private defaults and safe create retry; precise edit target; public/private edit parity; concurrent saves and stale-write rejection.
- Extend an existing browser journey where it is needed to verify the browser's behavior on a save conflict. Use a real ChatGPT private plugin with a disposable resume for the final OAuth, list, read, create, confirm, update, reopen and revoke flow. Automated protocol tests and real-client acceptance provide separate evidence.
- Check the existing sign-in, browser Origin enforcement and manual resume operations as applicable. Keep production data out of integration tests and make live verification contingent on an authorized test deployment and an account with custom plugin access.

## Out of Scope

Public plugin distribution, other client acceptance, in-product chat, external model API calls from Resume Copilot, experience-library tools, job application tools, resume deletion, publishing or changing sharing settings, MCP PDF export, and adding or removing work or project entries on existing resumes. Version history and one-click undo are deferred. The first release reports conflicts and asks for a fresh edit against the latest version.

## Further Notes

This spec supersedes the earlier Codex-first entry point and website approval proposal for the MVP described here. The manual editor remains the destination for inspecting the saved result. Complete the six approved slices in dependency order and enable the private plugin for live acceptance after the authorization, revocation and write protections are in place.

- [ChatGPT custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server)
- [ChatGPT plugin authentication](https://developers.openai.com/plugins/build/auth)
- [Reactive Resume MCP guide](https://docs.rxresu.me/guides/using-the-mcp-server)
- [Better Auth OAuth provider](https://better-auth.com/docs/plugins/oauth-provider)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 limits](https://developers.cloudflare.com/d1/platform/limits/)
