// 마이그레이션 — drizzle-kit 없이 raw DDL(CREATE TABLE IF NOT EXISTS).
// 04-database.md 스키마와 1:1. 단일 프로세스 MVP라 단순/투명하게.
import { sqlite } from './client.js';
import { encryptToken } from '../lib/tokenCrypto.js';

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  org_name TEXT,
  description TEXT,
  cover_image_path TEXT,
  bgm_path TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  default_photo_seconds INTEGER NOT NULL DEFAULT 3,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'uploader',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_member ON project_members(project_id, user_id);

CREATE TABLE IF NOT EXISTS schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  time TEXT,
  title TEXT NOT NULL,
  place TEXT,
  category TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  photo_seconds INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sched ON schedules(project_id, day_index, sort_order);

CREATE TABLE IF NOT EXISTS contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  uploader_id INTEGER NOT NULL REFERENCES users(id),
  story_text TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_contrib_sched ON contributions(schedule_id);
CREATE INDEX IF NOT EXISTS idx_contrib_up ON contributions(uploader_id);

CREATE TABLE IF NOT EXISTS media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contribution_id INTEGER NOT NULL REFERENCES contributions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_hash TEXT,
  duration_seconds REAL,
  included INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  thumb_path TEXT,
  preview_path TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_media_contrib ON media(contribution_id);
CREATE INDEX IF NOT EXISTS idx_media_hash ON media(file_hash) WHERE file_hash IS NOT NULL;

CREATE TABLE IF NOT EXISTS storybooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL UNIQUE REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  is_edit_locked INTEGER NOT NULL DEFAULT 0,
  approved_at TEXT,
  approved_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS scene_narrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  storybook_id INTEGER NOT NULL REFERENCES storybooks(id) ON DELETE CASCADE,
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  narration_text TEXT,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_narration ON scene_narrations(storybook_id, schedule_id);

CREATE TABLE IF NOT EXISTS invites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS share_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS project_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at TEXT NOT NULL
);
`;

export function migrate(): void {
  sqlite.exec(DDL);
  try {
    const columns = sqlite.prepare("PRAGMA table_info(projects)").all() as { name: string }[];
    const hasBgm = columns.some(c => c.name === 'bgm_path');
    if (!hasBgm) {
      sqlite.exec("ALTER TABLE projects ADD COLUMN bgm_path TEXT");
      console.log('[migrate] ADD COLUMN bgm_path to projects table.');
    }
    const hasScheduleType = columns.some(c => c.name === 'schedule_type');
    if (!hasScheduleType) {
      sqlite.exec("ALTER TABLE projects ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'date'");
      console.log('[migrate] ADD COLUMN schedule_type to projects table.');
    }
  } catch (e) {
    console.error('[migrate] Failed to check or alter projects table:', e);
  }
  try {
    const shareCols = sqlite.prepare("PRAGMA table_info(share_links)").all() as { name: string }[];
    if (!shareCols.some(c => c.name === 'token')) {
      sqlite.exec("ALTER TABLE share_links ADD COLUMN token TEXT");
      console.log('[migrate] ADD COLUMN token to share_links table.');
    }
  } catch (e) {
    console.error('[migrate] Failed to check or alter share_links table:', e);
  }
  try {
    const inviteCols = sqlite.prepare("PRAGMA table_info(invites)").all() as { name: string }[];
    if (!inviteCols.some(c => c.name === 'token')) {
      sqlite.exec("ALTER TABLE invites ADD COLUMN token TEXT");
      console.log('[migrate] ADD COLUMN token to invites table.');
    }
  } catch (e) {
    console.error('[migrate] Failed to check or alter invites table:', e);
  }

  // 초대/공유 링크 원문 토큰을 암호문(token_enc)으로 이관 — 평문 token은 NULL로 제거
  try {
    for (const table of ['invites', 'share_links'] as const) {
      const cols = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
      if (!cols.some((c) => c.name === 'token_enc')) {
        sqlite.exec(`ALTER TABLE ${table} ADD COLUMN token_enc TEXT`);
        console.log(`[migrate] ADD COLUMN token_enc to ${table} table.`);
      }
    }
    for (const table of ['invites', 'share_links'] as const) {
      const rows = sqlite
        .prepare(`SELECT id, token FROM ${table} WHERE token IS NOT NULL AND token_enc IS NULL`)
        .all() as { id: number; token: string }[];
      if (rows.length === 0) continue;
      const upd = sqlite.prepare(`UPDATE ${table} SET token_enc = ?, token = NULL WHERE id = ?`);
      const tx = sqlite.transaction((list: { id: number; token: string }[]) => {
        for (const r of list) upd.run(encryptToken(r.token), r.id);
      });
      tx(rows);
      console.log(`[migrate] ${table}: 평문 토큰 ${rows.length}건을 token_enc로 이관.`);
    }
  } catch (e) {
    console.error('[migrate] Failed to migrate plaintext tokens to token_enc:', e);
  }
}

// 직접 실행 시(pnpm migrate)
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  migrate();
  console.log('[migrate] schema ready at', process.env.DB_PATH ?? './data/db/memoryflow.sqlite');
  process.exit(0);
}
