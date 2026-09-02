import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { AuthModule } from './auth/auth.module.js';
import { AuthenticationGuard } from './auth/interfaces/authentication.guard.js';
import { PermissionsGuard } from './auth/interfaces/permissions.guard.js';
import { ExecutionModule } from './execution/execution.module.js';
import { HealthController } from './health.controller.js';
import { WorkManagementModule } from './work-management/work-management.module.js';

@Module({
  imports: [CqrsModule.forRoot(), AuthModule, WorkManagementModule, ExecutionModule],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthenticationGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
