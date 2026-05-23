-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('pending', 'active', 'rejected', 'inactive');

-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('super_admin');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('active', 'completed', 'archived');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('project_manager', 'uploader');

-- CreateEnum
CREATE TYPE "ProjectMemberStatus" AS ENUM ('active', 'removed');

-- CreateEnum
CREATE TYPE "UploadType" AS ENUM ('photo', 'video');

-- CreateEnum
CREATE TYPE "UploadFileType" AS ENUM ('image', 'video');

-- CreateEnum
CREATE TYPE "StorybookStatus" AS ENUM ('draft', 'approved');

-- CreateEnum
CREATE TYPE "ProjectVideoStatus" AS ENUM ('uploaded', 'published', 'hidden');

-- CreateEnum
CREATE TYPE "ShareLinkType" AS ENUM ('storybook', 'video', 'both');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'canceled');

-- CreateEnum
CREATE TYPE "MediaJobType" AS ENUM ('thumbnail', 'preview', 'cover_candidate', 'video_frame');

-- CreateEnum
CREATE TYPE "AiJobType" AS ENUM ('storybook_review', 'memo_summary', 'caption_timeline', 'bgm_keywords', 'project_cover_image', 'day_cover_image', 'video_cover_image', 'pdf_cover_image');

-- CreateEnum
CREATE TYPE "BgmSource" AS ENUM ('manual', 'generated');

-- CreateEnum
CREATE TYPE "OutputType" AS ENUM ('pdf');

-- CreateEnum
CREATE TYPE "BackupType" AS ENUM ('daily', 'weekly', 'snapshot');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile_image_path" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'pending',
    "global_role" "GlobalRole",
    "active_project_id" UUID,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "org_name" TEXT,
    "description" TEXT,
    "cover_image_path" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "status" "ProjectMemberStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_days" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "day_number" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "title" TEXT,
    "cover_image_path" TEXT,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_schedules" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "time" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "category" TEXT,
    "sort_order" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "project_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "UploadType" NOT NULL,
    "memo" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_in_storybook" BOOLEAN NOT NULL DEFAULT true,
    "admin_note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upload_files" (
    "id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "file_type" "UploadFileType" NOT NULL,
    "storage_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "preview_path" TEXT,
    "cover_candidate_path" TEXT,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "duration_seconds" DECIMAL(65,30),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upload_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storybooks" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "status" "StorybookStatus" NOT NULL DEFAULT 'draft',
    "title" TEXT,
    "opening_text" TEXT,
    "closing_text" TEXT,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ,
    "unlocked_by" UUID,
    "unlocked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "storybooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "storybook_items" (
    "id" UUID NOT NULL,
    "storybook_id" UUID NOT NULL,
    "upload_id" UUID NOT NULL,
    "day_id" UUID NOT NULL,
    "schedule_id" UUID NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "storybook_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_bgms" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "source" "BgmSource" NOT NULL DEFAULT 'manual',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_bgms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_videos" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "thumbnail_path" TEXT,
    "duration_seconds" DECIMAL(65,30),
    "size_bytes" BIGINT NOT NULL,
    "status" "ProjectVideoStatus" NOT NULL DEFAULT 'uploaded',
    "uploaded_by" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "project_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outputs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "OutputType" NOT NULL,
    "title" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "cover_image_path" TEXT,
    "generated_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ,

    CONSTRAINT "outputs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "share_links" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "project_id" UUID NOT NULL,
    "type" "ShareLinkType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "disabled_at" TIMESTAMPTZ,

    CONSTRAINT "share_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_jobs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "storybook_id" UUID,
    "requested_by" UUID NOT NULL,
    "type" "AiJobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "input_json" JSONB NOT NULL,
    "result_json" JSONB,
    "model" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "ai_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_jobs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "upload_file_id" UUID,
    "type" "MediaJobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMPTZ,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "media_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "backup_runs" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "backup_type" "BackupType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pending',
    "db_dump_path" TEXT,
    "files_archive_path" TEXT,
    "manifest_path" TEXT,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "backup_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "projects_status_idx" ON "projects"("status");

-- CreateIndex
CREATE INDEX "projects_start_date_end_date_idx" ON "projects"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

-- CreateIndex
CREATE INDEX "project_members_project_id_idx" ON "project_members"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE INDEX "project_days_project_id_sort_order_idx" ON "project_days"("project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "project_days_project_id_day_number_key" ON "project_days"("project_id", "day_number");

-- CreateIndex
CREATE UNIQUE INDEX "project_days_project_id_date_key" ON "project_days"("project_id", "date");

-- CreateIndex
CREATE INDEX "project_schedules_day_id_sort_order_idx" ON "project_schedules"("day_id", "sort_order");

-- CreateIndex
CREATE INDEX "project_schedules_project_id_idx" ON "project_schedules"("project_id");

-- CreateIndex
CREATE INDEX "uploads_project_id_created_at_idx" ON "uploads"("project_id", "created_at");

-- CreateIndex
CREATE INDEX "uploads_user_id_created_at_idx" ON "uploads"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "uploads_schedule_id_sort_order_idx" ON "uploads"("schedule_id", "sort_order");

-- CreateIndex
CREATE INDEX "upload_files_upload_id_sort_order_idx" ON "upload_files"("upload_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "storybooks_project_id_key" ON "storybooks"("project_id");

-- CreateIndex
CREATE INDEX "storybook_items_storybook_id_sort_order_idx" ON "storybook_items"("storybook_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "storybook_items_storybook_id_upload_id_key" ON "storybook_items"("storybook_id", "upload_id");

-- CreateIndex
CREATE INDEX "project_bgms_project_id_idx" ON "project_bgms"("project_id");

-- CreateIndex
CREATE INDEX "project_videos_project_id_idx" ON "project_videos"("project_id");

-- CreateIndex
CREATE INDEX "outputs_project_id_idx" ON "outputs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "share_links_token_hash_key" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_token_hash_idx" ON "share_links"("token_hash");

-- CreateIndex
CREATE INDEX "share_links_project_id_idx" ON "share_links"("project_id");

-- CreateIndex
CREATE INDEX "ai_jobs_status_created_at_idx" ON "ai_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "ai_jobs_project_id_idx" ON "ai_jobs"("project_id");

-- CreateIndex
CREATE INDEX "media_jobs_status_created_at_idx" ON "media_jobs"("status", "created_at");

-- CreateIndex
CREATE INDEX "media_jobs_project_id_idx" ON "media_jobs"("project_id");

-- CreateIndex
CREATE INDEX "backup_runs_project_id_created_at_idx" ON "backup_runs"("project_id", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_active_project_id_fkey" FOREIGN KEY ("active_project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_days" ADD CONSTRAINT "project_days_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_schedules" ADD CONSTRAINT "project_schedules_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "project_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "project_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "project_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upload_files" ADD CONSTRAINT "upload_files_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybooks" ADD CONSTRAINT "storybooks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybooks" ADD CONSTRAINT "storybooks_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybooks" ADD CONSTRAINT "storybooks_unlocked_by_fkey" FOREIGN KEY ("unlocked_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybook_items" ADD CONSTRAINT "storybook_items_storybook_id_fkey" FOREIGN KEY ("storybook_id") REFERENCES "storybooks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybook_items" ADD CONSTRAINT "storybook_items_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybook_items" ADD CONSTRAINT "storybook_items_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "project_days"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "storybook_items" ADD CONSTRAINT "storybook_items_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "project_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bgms" ADD CONSTRAINT "project_bgms_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_bgms" ADD CONSTRAINT "project_bgms_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_videos" ADD CONSTRAINT "project_videos_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_videos" ADD CONSTRAINT "project_videos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outputs" ADD CONSTRAINT "outputs_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "share_links" ADD CONSTRAINT "share_links_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_storybook_id_fkey" FOREIGN KEY ("storybook_id") REFERENCES "storybooks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_jobs" ADD CONSTRAINT "ai_jobs_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_jobs" ADD CONSTRAINT "media_jobs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_jobs" ADD CONSTRAINT "media_jobs_upload_file_id_fkey" FOREIGN KEY ("upload_file_id") REFERENCES "upload_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "backup_runs" ADD CONSTRAINT "backup_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

