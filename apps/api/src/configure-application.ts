import { ValidationPipe, type INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { NextFunction, Request, Response } from 'express';

const isApiRequest = (path: string): boolean => path === '/api' || path.startsWith('/api/');

export const configureFrontendAssets = (app: NestExpressApplication, frontendDirectory: string): void => {
  app.useStaticAssets(frontendDirectory);
  app.use((request: Request, response: Response, next: NextFunction) => {
    if (isApiRequest(request.path)) {
      next();
      return;
    }
    response.sendFile('index.html', { root: frontendDirectory }, (error?: Error) => {
      if (error) next(error);
    });
  });
};

export const configureApplication = (app: INestApplication): void => {
  (app as NestExpressApplication).useBodyParser('json', { limit: '13mb' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
};
