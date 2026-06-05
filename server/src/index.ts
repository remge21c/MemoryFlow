import { buildApp } from './app.js';
import { env } from './env.js';

const app = await buildApp();
try {
  await app.listen({ port: env.PORT, host: '0.0.0.0' });
  app.log.info(`MemoryFlow API → http://localhost:${env.PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
