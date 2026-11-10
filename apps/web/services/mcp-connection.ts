import { mcpConnectionSchema } from '@resume-copilot/contracts'
import request from '@/lib/request'

const connectionPath = '/me/mcp-connection'

export async function getMcpConnection(signal?: AbortSignal) {
  return mcpConnectionSchema.nullable().parse(await request.get(connectionPath, { signal }))
}

export async function disconnectMcp() {
  await request.delete(connectionPath)
}
