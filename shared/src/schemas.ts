import { z } from 'zod';
import { PROJECT_STATUS, SHARE_EXPIRES_DAYS, VIDEO_STATUS } from './enums.js';

// ── 공통 ───────────────────────────────────────────────
const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, '이메일을 입력하세요')
  .max(120)
  .email('이메일 형식을 확인해주세요');
const password = z.string().min(6, '비밀번호는 6자 이상').max(100);
const name = z.string().trim().min(1, '이름을 입력하세요').max(60);

// ── 인증 (S-01 / S-02) ─────────────────────────────────
export const loginSchema = z.object({ email, password });
export const registerSchema = z.object({ name, email, password });
export const joinSchema = z.object({ token: z.string().min(8), name, email, password });

// ── 프로젝트 (S-21) ────────────────────────────────────
const baseProject = z.object({
  name: z.string().trim().min(1).max(120),
  org_name: z.string().trim().max(120).optional().default(''),
  description: z.string().trim().max(4000).optional().default(''),
  default_photo_seconds: z.coerce.number().int().min(1).max(60).default(3),
});

export const createProjectSchema = z.union([
  baseProject.extend({
    schedule_type: z.literal('date'),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
  }).refine((v) => v.end_date >= v.start_date, {
    message: '종료일은 시작일 이후여야 합니다',
    path: ['end_date'],
  }),
  baseProject.extend({
    schedule_type: z.literal('sequence'),
    initial_sequence_count: z.coerce.number().int().min(1).max(200).default(10),
  }),
]);

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    org_name: z.string().trim().max(120).optional(),
    description: z.string().trim().max(4000).optional(),
    status: z.enum(PROJECT_STATUS).optional(),
    default_photo_seconds: z.coerce.number().int().min(1).max(60).optional(),
    // 기간 수정(날짜형 프로젝트). 보통 시작/종료를 함께 보낸다.
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional(),
  })
  .refine((v) => !(v.start_date && v.end_date) || v.end_date >= v.start_date, {
    message: '종료일은 시작일 이후여야 합니다',
    path: ['end_date'],
  });

// ── 세부일정 앞/뒤 삽입 ───────────────────────────────
export const insertScheduleSchema = z.object({
  title: z.string().trim().min(1).max(120).default('새 장면'),
  time: z.string().trim().max(20).optional().default(''),
  place: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(40).optional().default(''),
  photo_seconds: z.coerce.number().int().min(1).max(60).nullable().optional(),
});

// ── 세부일정 / 장면 (S-23) ─────────────────────────────
export const createScheduleSchema = z.object({
  day_index: z.coerce.number().int().min(0), // 0 = 사전 준비(Day 0), 1..N = 행사일

  time: z.string().trim().max(20).optional().default(''),
  title: z.string().trim().min(1).max(120),
  place: z.string().trim().max(120).optional().default(''),
  category: z.string().trim().max(40).optional().default(''),
  sort_order: z.coerce.number().int().default(0),
  photo_seconds: z.coerce.number().int().min(1).max(60).nullable().optional(),
});
export const updateScheduleSchema = createScheduleSchema.partial();

// ── 기여 (S-12) ────────────────────────────────────────
export const createContributionSchema = z.object({
  schedule_id: z.coerce.number().int(),
  story_text: z.string().trim().max(8000).optional().default(''),
});
export const updateContributionSchema = z.object({
  story_text: z.string().trim().max(8000),
});

// ── 미디어 선별/정렬 (S-26) ────────────────────────────
export const updateMediaSchema = z.object({
  included: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

// ── 내레이션 upsert (S-26) ─────────────────────────────
export const upsertNarrationSchema = z.object({
  schedule_id: z.coerce.number().int(),
  narration_text: z.string().max(20000),
});

// ── AI (S-26, PRD 9장) ─────────────────────────────────
export const aiMergeSchema = z.object({ schedule_id: z.coerce.number().int() });
export const aiSummarizeSchema = z.object({
  schedule_id: z.coerce.number().int(),
  narration_text: z.string().max(20000),
});

// ── 초대 링크 (S-24) ───────────────────────────────────
export const createInviteSchema = z.object({
  expires_days: z.coerce.number().int().min(1).max(365).default(7),
});

// ── 공유 링크 (S-28) ───────────────────────────────────
export const createShareLinkSchema = z.object({
  expires_days: z
    .union([z.literal(30), z.literal(60), z.literal(120), z.literal(180), z.literal(360)])
    .default(SHARE_EXPIRES_DAYS[0]),
});

// ── 멤버 관리 (S-25) ───────────────────────────────────
export const setTempPasswordSchema = z.object({ password });

// ── 내 비밀번호 변경 (설정) ────────────────────────────
export const changePasswordSchema = z.object({
  current_password: z.string().min(1, '현재 비밀번호를 입력하세요'),
  new_password: password,
});

// ── 최종 영상 상태 (S-29) ──────────────────────────────
export const updateVideoStatusSchema = z.object({ status: z.enum(VIDEO_STATUS) });

// ── 영상 구간 자르기 ───────────────────────────────────
export const trimMediaSchema = z
  .object({
    start_seconds: z.number().min(0),
    end_seconds: z.number().positive(),
  })
  .refine((v) => v.end_seconds - v.start_seconds >= 1, {
    message: '잘라낼 구간은 1초 이상이어야 합니다',
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type JoinInput = z.infer<typeof joinSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type InsertScheduleInput = z.infer<typeof insertScheduleSchema>;
export type CreateScheduleInput = z.infer<typeof createScheduleSchema>;
export type CreateContributionInput = z.infer<typeof createContributionSchema>;
export type UpsertNarrationInput = z.infer<typeof upsertNarrationSchema>;
