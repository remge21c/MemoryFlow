import { buildApp } from './app.js';
import { env } from './env.js';
import { sqlite } from './db/client.js';

const app = await buildApp();

// 종료 시 WAL을 본 DB 파일로 병합(TRUNCATE) 후 정상 종료.
// (백업/스냅샷이 -wal 파일을 놓쳐도 최근 쓰기가 유실되지 않도록 본 파일을 항상 완결시킨다)
let closing = false;
async function shutdown(signal: string) {
  if (closing) return;
  closing = true;
  app.log.info(`${signal} 수신 — 종료 처리 (WAL 체크포인트)`);
  try {
    await app.close();
    sqlite.pragma('wal_checkpoint(TRUNCATE)');
    sqlite.close();
  } catch (e) {
    app.log.error(e);
  }
  process.exit(0);
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

try {
  // 기본은 루프백만 노출(로컬·동일호스트 Nginx 리버스프록시 앞단). 크로스호스트 접근이 필요한
  // 경우에만 HOST=0.0.0.0 등으로 명시 opt-in한다.
  const host = process.env.HOST ?? '127.0.0.1';
  await app.listen({ port: env.PORT, host });
  app.log.info(`MemoryFlow API → http://${host}:${env.PORT}`);
  app.log.info(`DB_PATH → ${env.DB_PATH}`); // 실제 사용 중인 DB 파일 확인용 (임시 폴백 감지)
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
