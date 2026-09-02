import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthTokenVerifier, type AuthenticatedPrincipal } from '../application/auth-token-verifier.js';
import { parseBearerToken } from '../domain/bearer-token.js';
import { PUBLIC_ROUTE } from './public.decorator.js';

export interface AuthenticatedRequest {
  headers: { authorization?: string };
  user?: AuthenticatedPrincipal;
}

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly verifier: AuthTokenVerifier, private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    try {
      request.user = await this.verifier.verify(parseBearerToken(request.headers.authorization));
      return true;
    } catch {
      throw new UnauthorizedException('A valid bearer token is required');
    }
  }
}
