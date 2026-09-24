import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import type { CurrentUser } from '@resume-copilot/contracts';
import { AuthService } from './auth.service';

export type TrustedUser = CurrentUser;
export type AuthenticatedRequest = Request & { trustedUser?: TrustedUser };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    let session;
    try {
      session = await this.authService.getSession(request.headers);
    } catch {
      // Dependency failures must not masquerade as invalid credentials.
      throw new ServiceUnavailableException();
    }
    if (!session?.user?.emailVerified) throw new UnauthorizedException();
    request.trustedUser = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    };
    return true;
  }
}
