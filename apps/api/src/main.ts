import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApplication } from './configure-application.js';

const app = await NestFactory.create(AppModule);
configureApplication(app);
await app.listen(Number(process.env['PORT'] ?? 3000));
