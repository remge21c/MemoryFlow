import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { env } from '../env.js';
import * as schema from './schema.js';

fs.mkdirSync(path.dirname(env.DB_PATH), { recursive: true });

export const sqlite = new Database(env.DB_PATH);
// 운영 설정 (04-database.md 5절)
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });
export { schema };
