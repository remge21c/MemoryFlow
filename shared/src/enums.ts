// 공통 enum (specs/shared/types.yaml)
export const USER_STATUS = ['active', 'inactive'] as const;
export const MEMBER_STATUS = ['active', 'removed'] as const;
export const PROJECT_STATUS = ['active', 'completed', 'archived'] as const;
export const STORYBOOK_STATUS = ['draft', 'approved'] as const;
export const MEDIA_TYPE = ['photo', 'video'] as const;
export const VIDEO_STATUS = ['uploaded', 'published', 'hidden'] as const;

export const SHARE_EXPIRES_DAYS = [30, 60, 120, 180, 360] as const;
export const DEFAULT_SHARE_EXPIRES_DAYS = 30;

export type UserStatus = (typeof USER_STATUS)[number];
export type MemberStatus = (typeof MEMBER_STATUS)[number];
export type ProjectStatus = (typeof PROJECT_STATUS)[number];
export type StorybookStatus = (typeof STORYBOOK_STATUS)[number];
export type MediaType = (typeof MEDIA_TYPE)[number];
export type VideoStatus = (typeof VIDEO_STATUS)[number];
