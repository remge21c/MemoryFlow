// 서버 응답 DTO 타입 (client/server 공유). 런타임 검증보단 타입 계약용.
import type {
  MediaType,
  ProjectStatus,
  StorybookStatus,
  VideoStatus,
  MemberStatus,
} from './enums.js';

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  is_admin: boolean;
}

export interface TokenValidation {
  valid: boolean;
  expired: boolean;
  project_name: string;
}

export interface ProjectDTO {
  id: number;
  name: string;
  org_name: string | null;
  description: string | null;
  cover_image_path: string | null;
  cover_url: string | null;
  bgm_path: string | null;
  bgm_url: string | null;
  schedule_type: 'date' | 'sequence';
  start_date: string | null;  // sequence 타입은 null
  end_date: string | null;    // sequence 타입은 null
  status: ProjectStatus;
  default_photo_seconds: number;
  created_by: number;
  created_at: string;
  day_count: number;  // sequence 타입은 현재 순번 수
}

export interface ScheduleDTO {
  id: number;
  project_id: number;
  day_index: number;
  time: string | null;
  title: string;
  place: string | null;
  category: string | null;
  sort_order: number;
  photo_seconds: number | null;
}

export interface MediaDTO {
  id: number;
  contribution_id: number;
  type: MediaType;
  file_path: string;
  duration_seconds: number | null;
  included: boolean;
  sort_order: number;
  url: string; // /api/media/:id
  thumb_url: string | null;
}

export interface ContributionDTO {
  id: number;
  schedule_id: number;
  uploader_id: number;
  uploader_name: string;
  story_text: string | null;
  sort_order: number;
  is_mine: boolean;
  media: MediaDTO[];
}

export interface SceneDTO {
  schedule: ScheduleDTO;
  contributions: ContributionDTO[];
  media: MediaDTO[]; // 모든 기여의 미디어 평탄화(선별 그리드용)
  narration: string;
  scene_seconds: number;
  target_chars: number;
}

export interface MemberDTO {
  member_id: number;
  user_id: number;
  name: string;
  email: string;
  role: string;
  status: MemberStatus;
  joined_at: string;
}

export interface InviteDTO {
  id: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  url: string; // /join/:token (발급 직후 1회만 원본 노출)
}

export interface ShareLinkDTO {
  id: number;
  is_active: boolean;
  expires_at: string;
  created_at: string;
  url: string;
}

export interface VideoDTO {
  id: number;
  project_id: number;
  file_path: string;
  status: VideoStatus;
  created_at: string;
  url: string;
}

export interface StorybookDTO {
  id: number;
  project_id: number;
  status: StorybookStatus;
  is_edit_locked: boolean;
  approved_at: string | null;
}
