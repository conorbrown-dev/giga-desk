import { Module } from '@nestjs/common';
import { AuthTokenVerifier } from './application/auth-token-verifier.js';
import { JoseAuthTokenVerifier } from './infrastructure/jose-auth-token-verifier.js';
import { AuthController } from './interfaces/auth.controller.js';

@Module({
  controllers: [AuthController],
  providers: [{ provide: AuthTokenVerifier, useClass: JoseAuthTokenVerifier }],
  exports: [AuthTokenVerifier],
})
export class AuthModule {}
