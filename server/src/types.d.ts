import 'fastify';
import type { SessionUser } from '@memoryflow/shared';

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null;
  }
}
