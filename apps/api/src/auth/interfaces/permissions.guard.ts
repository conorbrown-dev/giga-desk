import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from './authentication.guard.js';
import { REQUIRED_PERMISSIONS } from './permissions.decorator.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<readonly string[] | undefined>(REQUIRED_PERMISSIONS, [
      context.getHandler(), context.getClass(),
    ]) ?? [];
    const principal = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (required.every((permission) => principal?.permissions.includes(permission) === true)) return true;
    throw new ForbiddenException('The authenticated identity lacks a required permission');
  }
}
