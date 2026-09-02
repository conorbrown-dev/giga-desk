import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

export const configureApplication = (app: INestApplication): void => {
  (app as NestExpressApplication).useBodyParser('json', { limit: '13mb' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
};
