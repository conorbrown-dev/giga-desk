import { ValidationPipe, type INestApplication } from '@nestjs/common';

export const configureApplication = (app: INestApplication): void => {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true, transform: true, whitelist: true }));
};
