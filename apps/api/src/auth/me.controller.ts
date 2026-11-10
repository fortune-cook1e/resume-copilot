import { Controller, Delete, Get, Header, Req, UseGuards } from '@nestjs/common'
import { McpConnectionsService } from './mcp-connections.service'
import { SessionGuard, type AuthenticatedRequest } from './session.guard'

@Controller('me')
@UseGuards(SessionGuard)
export class MeController {
  constructor(private readonly mcpConnections: McpConnectionsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  me(@Req() request: AuthenticatedRequest) {
    return request.trustedUser
  }

  @Get('mcp-connection')
  @Header('Cache-Control', 'no-store')
  mcpConnection(@Req() request: AuthenticatedRequest) {
    return this.mcpConnections.get(request.trustedUser!.id)
  }

  @Delete('mcp-connection')
  @Header('Cache-Control', 'no-store')
  disconnectMcp(@Req() request: AuthenticatedRequest) {
    return this.mcpConnections.disconnect(request.trustedUser!.id)
  }
}
