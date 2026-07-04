// Drizzle 스키마 — 04-database.md SQLite 설계와 1:1.
import { sql } from 'drizzle-orm';
import { integer, real, sqliteTable, text, uniqueIndex, index } from 'drizzle-orm/sqlite-core';

const now = sql`(strftime('%Y-%m-%dT%H:%M:%fZ','now'))`;

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  status: text('status').notNull().default('active'), // active | inactive
  createdAt: text('created_at').notNull().default(now),
});

export const projects = sqliteTable('projects', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  orgName: text('org_name'),
  description: text('description'),
  coverImagePath: text('cover_image_path'),
  bgmPath: text('bgm_path'),
  startDate: text('start_date').notNull(),
  endDate: text('end_date').notNull(),
  status: text('status').notNull().default('active'),
  defaultPhotoSeconds: integer('default_photo_seconds').notNull().default(3),
  scheduleType: text('schedule_type').notNull().default('date'), // 'date' | 'sequence'
  createdBy: integer('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(now),
});

export const projectMembers = sqliteTable(
  'project_members',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id),
    userId: integer('user_id').notNull().references(() => users.id),
    role: text('role').notNull().default('uploader'),
    status: text('status').notNull().default('active'), // active | removed
    joinedAt: text('joined_at').notNull().default(now),
  },
  (t) => ({ uq: uniqueIndex('uq_member').on(t.projectId, t.userId) }),
);

export const schedules = sqliteTable(
  'schedules',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id),
    dayIndex: integer('day_index').notNull(),
    time: text('time'),
    title: text('title').notNull(),
    place: text('place'),
    category: text('category'),
    sortOrder: integer('sort_order').notNull().default(0),
    photoSeconds: integer('photo_seconds'), // nullable → project.default_photo_seconds
  },
  (t) => ({ idx: index('idx_sched').on(t.projectId, t.dayIndex, t.sortOrder) }),
);

export const contributions = sqliteTable(
  'contributions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    projectId: integer('project_id').notNull().references(() => projects.id),
    scheduleId: integer('schedule_id').notNull().references(() => schedules.id),
    uploaderId: integer('uploader_id').notNull().references(() => users.id),
    storyText: text('story_text'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').notNull().default(now),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({
    idxSched: index('idx_contrib_sched').on(t.scheduleId),
    idxUp: index('idx_contrib_up').on(t.uploaderId),
  }),
);

export const media = sqliteTable(
  'media',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    contributionId: integer('contribution_id').notNull().references(() => contributions.id),
    type: text('type').notNull(), // photo | video
    filePath: text('file_path').notNull(),
    fileHash: text('file_hash'),
    durationSeconds: real('duration_seconds'),
    included: integer('included', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    thumbPath: text('thumb_path'),
    previewPath: text('preview_path'),
    createdAt: text('created_at').notNull().default(now),
  },
  (t) => ({ idx: index('idx_media_contrib').on(t.contributionId) }),
);

export const storybooks = sqliteTable('storybooks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().unique().references(() => projects.id),
  status: text('status').notNull().default('draft'), // draft | approved
  isEditLocked: integer('is_edit_locked', { mode: 'boolean' }).notNull().default(false),
  approvedAt: text('approved_at'),
  approvedBy: integer('approved_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(now),
});

export const sceneNarrations = sqliteTable(
  'scene_narrations',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    storybookId: integer('storybook_id').notNull().references(() => storybooks.id),
    scheduleId: integer('schedule_id').notNull().references(() => schedules.id),
    narrationText: text('narration_text'),
    updatedAt: text('updated_at').notNull().default(now),
  },
  (t) => ({ uq: uniqueIndex('uq_narration').on(t.storybookId, t.scheduleId) }),
);

export const invites = sqliteTable('invites', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  tokenHash: text('token_hash').notNull().unique(),
  token: text('token'), // 원본 토큰 — 목록에서 다시 열람/공유할 수 있도록 보관
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  expiresAt: text('expires_at').notNull(),
  createdBy: integer('created_by').references(() => users.id),
  createdAt: text('created_at').notNull().default(now),
});

export const shareLinks = sqliteTable('share_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  tokenHash: text('token_hash').notNull().unique(),
  token: text('token'), // 원본 토큰 — 목록에서 다시 열람/공유할 수 있도록 보관 (공개 열람용 링크)
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(now),
});

export const projectVideos = sqliteTable('project_videos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  projectId: integer('project_id').notNull().references(() => projects.id),
  filePath: text('file_path').notNull(),
  status: text('status').notNull().default('uploaded'), // uploaded | published | hidden
  createdAt: text('created_at').notNull().default(now),
});

// 세션 (TRD 3장: SQLite 테이블 방식 채택)
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(), // 랜덤 토큰
  userId: integer('user_id').notNull().references(() => users.id),
  createdAt: text('created_at').notNull().default(now),
  expiresAt: text('expires_at').notNull(),
});
