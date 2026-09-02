import { Controller, Get, Req } from '@nestjs/common';
import type { AuthenticatedPrincipal } from '../application/auth-token-verifier.js';
import type { AuthenticatedRequest } from './authentication.guard.js';

@Controller('auth')
export class AuthController {
  @Get('me')
  getIdentity(@Req() request: AuthenticatedRequest): AuthenticatedPrincipal {
    if (request.user === undefined) throw new Error('Authenticated principal was not attached');
    return request.user;
  }
}
