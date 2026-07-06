// 업로더 피드(GET /projects/:id/feed) 응답 타입 — ProjectHome(전체보기)과 ScheduleList(세부일정) 공유.
import type { MediaDTO, ScheduleDTO } from '@memoryflow/shared';

export interface FeedContribution {
  id: number;
  uploader_id: number;
  uploader_name: string;
  is_mine: boolean;
  story_text: string;
  created_at: string;
  media: MediaDTO[];
}

export type FeedSchedule = ScheduleDTO & { contributions: FeedContribution[] };

export interface FeedProject {
  id: number;
  name: string;
  org_name: string | null;
  cover_url: string | null;
  bgm_url: string | null;
  start_date: string | null;
  end_date: string | null;
  schedule_type?: string;
}

export interface FeedData {
  project: FeedProject;
  days: { day_index: number; date: string | null; schedules: FeedSchedule[] }[];
}
