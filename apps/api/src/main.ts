import "dotenv/config";
import { fileURLToPath } from "node:url";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { auth } from "express-oauth2-jwt-bearer";
import { AppModule } from "./app.module.js";
import {
  configureApplication,
  configureFrontendAssets,
} from "./configure-application.js";

const app = await NestFactory.create<NestExpressApplication>(AppModule);
configureApplication(app);
configureFrontendAssets(
  app,
  fileURLToPath(new URL("../../web/dist/", import.meta.url)),
);

app.use(auth());

await app.listen(Number(process.env["PORT"] ?? 3000));
