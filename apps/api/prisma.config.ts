import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const localDatabaseUrl = 'postgresql://giga_desk:giga_desk@127.0.0.1:5442/giga_desk?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env['DATABASE_URL'] ?? localDatabaseUrl },
});
