import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db/client.js';
import { HttpError } from './errors.js';
import type { SessionUser } from '@memoryflow/shared';

export function requireAuth(req: FastifyRequest): SessionUser {
  if (!req.user) throw new HttpError(401, '로그인이 필요합니다');
  return req.user;
}

export function requireAdmin(req: FastifyRequest): SessionUser {
  const u = requireAuth(req);
  if (!u.is_admin) throw new HttpError(403, '관리자 권한이 필요합니다');
  return u;
}

/** 관리자이면서 해당 프로젝트 생성자(또는 전역 admin)인지. MVP: is_admin이면 모든 프로젝트 운영 가능. */
export async function requireProjectAdmin(req: FastifyRequest, projectId: number) {
  const u = requireAdmin(req);
  const p = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(eq(schema.projects.id, projectId))
    .limit(1);
  if (!p[0]) throw new HttpError(404, '프로젝트를 찾을 수 없습니다');
  return u;
}

/** 업로더가 해당 프로젝트의 active 멤버인지. */
export async function requireMember(req: FastifyRequest, projectId: number) {
  const u = requireAuth(req);
  if (u.is_admin) return u; // 관리자는 모든 프로젝트 접근
  const m = await db
    .select({ id: schema.projectMembers.id })
    .from(schema.projectMembers)
    .where(
      and(
        eq(schema.projectMembers.projectId, projectId),
        eq(schema.projectMembers.userId, u.id),
        eq(schema.projectMembers.status, 'active'),
      ),
    )
    .limit(1);
  if (!m[0]) throw new HttpError(403, '이 프로젝트의 멤버가 아닙니다');
  return u;
}

/** 스토리북 잠금 여부 (승인 OR 편집잠금). 업로더 쓰기 차단용. (types.yaml lock 규칙) */
export async function isProjectLocked(projectId: number): Promise<boolean> {
  const sb = await db
    .select({ status: schema.storybooks.status, locked: schema.storybooks.isEditLocked })
    .from(schema.storybooks)
    .where(eq(schema.storybooks.projectId, projectId))
    .limit(1);
  const s = sb[0];
  if (!s) return false;
  return s.status === 'approved' || s.locked === true;
}

export function assertNotLocked(locked: boolean) {
  if (locked) throw new HttpError(423, '승인/편집잠금 상태라 수정할 수 없습니다');
}

export { HttpError };
