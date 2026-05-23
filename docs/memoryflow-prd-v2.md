# MemoryFlow PRD v2.0

Document ID: MF-PRD-2026-002  
Date: 2026-05-24  
Status: Development draft

## 1. Product Overview

MemoryFlow is a project-based web application for collecting travel, retreat, and event memories through photos, videos, and notes. Project managers curate uploaded content into a final storybook, while the super admin handles AI-assisted media preparation, PDF generation, final video upload, and sharing.

MemoryFlow runs on `vibeflow-server` with PostgreSQL and local file storage. Video rendering is handled separately on the ASUS TUF Gaming A18 using VideoFlow and Remotion. Completed MP4 videos are manually uploaded back to MemoryFlow.

## 2. Operating Architecture

```text
vibeflow-server
- MemoryFlow web app
- PostgreSQL
- Local file storage
- Codex CLI AI Worker
- Media Worker using sharp and ffmpeg
- Nginx
- Cloudflare
- Docker Compose

ASUS TUF Gaming A18
- VideoFlow / Remotion
- Imports MemoryFlow export package
- Renders final video
- Manually uploads completed MP4 to MemoryFlow
```

## 3. Core Flow

```text
User signs up
-> Super admin approves user
-> Super admin assigns user to project
-> Uploader uploads photos/videos/notes
-> Project manager edits storybook
-> Text AI review runs
-> Project manager approves storybook
-> Super admin generates PDF
-> Super admin exports VideoFlow package
-> A18 renders final video
-> Super admin uploads final MP4
-> Share link is issued
```

## 4. Roles And Permissions

### Super Admin

The super admin has full system access.

Allowed:

```text
Create/delete projects
Approve/reject/deactivate users
Assign project members and roles
Run all AI text features
Generate AI images
Upload and manage BGM
Generate PDF reports
Generate VideoFlow export packages
Upload/delete final videos
Create/manage share links
Unlock approved storybooks
Access all projects
```

### Project Manager

The project manager can manage assigned projects only.

Allowed:

```text
Manage schedules
Review and organize uploads
Edit storybook
Run text AI review and summaries
Approve storybook
Create share links
```

Not allowed:

```text
Generate AI images
Manage BGM
Generate PDF reports
Generate VideoFlow packages
Upload/delete final videos
Manage users
Create/delete projects
```

### Uploader

Allowed:

```text
Upload photos/videos/notes to assigned projects
Edit/delete own uploads before storybook approval
View approved storybook and final videos
```

After storybook approval, uploader access becomes read-only.

### External Viewer

External viewers use `/share/:token` without logging in.

Allowed:

```text
View approved storybook
Watch published final videos
Download shared files when enabled
```

Not allowed:

```text
Login
Upload
Comment
Like
Edit
View private project data
```

## 5. Authentication And User Approval

Public sign-up is allowed, but newly registered users are not active immediately.

```text
Sign up
-> users.status = pending
-> Super admin approves user
-> Super admin assigns project and role
-> User can access assigned projects
```

User statuses:

```text
pending
active
rejected
inactive
```

MVP password reset is handled by super admin temporary password reset. Email-based password reset is Phase 2.

## 6. Project And Schedule Structure

Project creation fields:

```text
Project name
Organization/group name
Description
Cover image
Start date
End date
Status
```

When a project is created, days are generated from start and end dates.

```text
2026-07-15 ~ 2026-07-17
-> Day 1 / 2026-07-15
-> Day 2 / 2026-07-16
-> Day 3 / 2026-07-17
```

Each day has schedules:

```text
Time
Title
Location
Category
Sort order
```

Uploads must be attached to a project, day, and schedule.

## 7. Status Model

States are separated by domain.

```text
projects.status
- active
- completed
- archived

storybooks.status
- draft
- approved

project_videos.status
- uploaded
- published
- hidden
```

After storybook approval, project uploads and upload edits are locked. Only the super admin can unlock an approved storybook.

## 8. Upload Policy

Photos:

```text
Max 10MB per photo
Multiple photos per upload allowed
```

Uploader field videos:

```text
One video file per upload item
Max 100MB
Allowed formats: mp4, mov, webm
```

Final videos:

```text
Max 2GB
MP4 recommended
Super admin only
```

Likes and comments are excluded from MVP.

## 9. Storybook

The storybook is the final web-based project record.

Features:

```text
Day/schedule timeline
Photo/video/note display
Manager editing
Include/exclude content
Sort content
Edit notes
Run text AI review
Approve final storybook
```

Static HTML export is excluded from MVP. The storybook web page serves the HTML viewing role.

## 10. AI Features

AI runs through Codex CLI backend on `vibeflow-server`. GPT mini-class models are the default.

Processing flow:

```text
User clicks AI button
-> Browser calls server API
-> Server creates ai_jobs row
-> AI Worker runs codex exec --json
-> Result is stored in PostgreSQL
-> Admin reviews and applies result
```

Text AI:

```text
Storybook review
Day note summary
Privacy-risk text detection
Caption and narration drafts
BGM mood and keyword recommendation
PDF text generation support
```

AI suggestions never auto-approve content. A human must apply and approve changes.

AI image generation is super-admin only.

Targets:

```text
Project cover image
Day cover image
Final video cover
PDF cover image
```

## 11. Media Processing

Default media derivatives are generated locally, not by AI.

Photo derivatives:

```text
sharp
480px thumbnail
1280px preview
1920x1080 cover_candidate
```

Video derivatives:

```text
ffmpeg
Extract frame at 1 second
Generate 1280 or 1920 cover candidate
```

AI images are for representative/cover use only.

## 12. BGM

MVP does not generate music automatically.

Features:

```text
Manual BGM upload
Project BGM list
Preview playback
Active BGM selection
Download
Delete
```

AI may recommend mood, keywords, or prompts, but does not generate audio in MVP.

## 13. VideoFlow Integration

MemoryFlow does not render videos.

```text
MemoryFlow organizes production data
-> Super admin exports VideoFlow package
-> A18 imports package into VideoFlow/Remotion
-> A18 renders video
-> Super admin manually uploads completed MP4
```

Export package:

```text
project.json
caption-timeline.json
Image/video file bundle
BGM file
Cover image
```

## 14. PDF And Outputs

MVP includes:

```text
Storybook web page
Share storybook page
PDF report
Final video upload and sharing
```

MVP excludes:

```text
DOCX report
Static HTML export
```

PDF generation is super-admin only.

## 15. Share Links

Share links are verified server-side.

```text
/share/:token request
-> Hash token
-> Find share_links.token_hash
-> Check is_active
-> Check expires_at
-> Return approved public storybook/video data only
```

Raw tokens are never stored. Only `token_hash` is stored.

Expiration options:

```text
30 days
60 days
120 days
180 days
360 days
```

Default expiration is 30 days.

## 16. File Storage

Files are stored on the D HDD mounted at `/mnt/data`.

```text
/mnt/data/storage/
  projects/
    {projectId}/
      uploads/
        photos/
        videos/
      bgm/
      outputs/
        pdf/
      final-videos/
      thumbnails/
```

The database stores file paths and metadata only.

Files are not served from public static directories. Server APIs validate session or share token access before streaming. Final videos support HTTP Range requests for inline playback.

## 17. Backup Policy

Storage layout:

```text
C SSD
- Ubuntu OS
- Docker
- App
- PostgreSQL live data

D HDD
- /mnt/data/storage
- /mnt/data/backup
```

Backup schedule:

```text
Before project starts
-> Every 7 days

During project date range
-> Once per day

After project ends
-> Every 7 days

When project is marked completed
-> One completed snapshot
```

Backup contents:

```text
Project DB export
Project file archive
Uploaded photos/videos
BGM
PDF outputs
Final videos
manifest.json
```

## 18. Deployment And Operations

MVP is developed locally first. The server is prepared in parallel.

Server installation targets:

```text
Ubuntu Server
Docker
Docker Compose
PostgreSQL
Nginx
Cloudflare
SSH
Codex CLI
ffmpeg
sharp dependencies
```

Deployment is automated through GitHub Actions.

```text
Push to main
-> GitHub Actions builds Docker image
-> Push to GitHub Container Registry
-> SSH into vibeflow-server
-> docker compose pull
-> docker compose up -d
```

## 19. Design System

MemoryFlow uses the design system in `docs/design-system/MASTER.md`.

Visual direction:

```text
Tech Utility with Soft Warmth
Content-first travel documentation
Calm, practical, organized
No marketing landing-page feel
No decorative gradients, glassmorphism, or heavy shadows
```

Core tokens:

```text
Primary: #196946
Background: #f8f9ff
Surface: #ffffff / #eff3ff / #e9eef9
Text: #171c24
Border: #bfc9c0
Font: Inter
Minimum tap target: 44px
```

Component rules:

```text
Buttons, inputs, tags: 8px radius
Cards and image blocks: 12px radius
Depth is expressed through tonal layers and 1px outlines, not shadows
Korean text uses word-break: keep-all and overflow-wrap: anywhere
```

## 20. MVP Scope

Included:

```text
Sign up and login
Super admin approval
Project creation
Day auto-generation
Schedule management
Project member/role management
Photo/video/note uploads
Storybook editing and approval
Text AI review and summaries
PDF generation
Manual BGM upload
Share links
Final video manual upload
Media streaming with access control
Backup script
GitHub Actions deployment
```

Phase 2:

```text
DOCX report
Static HTML export
Email password reset
Email/Kakao/SMS notifications
Automatic BGM generation
VideoFlow automatic upload
External third backup
```


