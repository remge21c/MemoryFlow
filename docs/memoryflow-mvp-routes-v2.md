# MemoryFlow MVP Route Map v2.0

Date: 2026-05-24  
Status: Development draft

## 1. Route Principles

```text
Public routes
-> Accessible without login

Auth routes
-> Login/sign-up/password screens

App routes
-> Require active user session

Admin routes
-> Require project role or super admin role

API routes
-> Always validate session, project membership, and feature permission

Share routes
-> Validate token hash server-side
```

## 2. Public And Auth Routes

| Route | Access | Purpose |
|---|---|---|
| `/login` | Public | User login |
| `/signup` | Public | Public user sign-up, creates pending user |
| `/pending` | Pending user | Approval waiting screen |
| `/rejected` | Rejected user | Rejected account screen |
| `/inactive` | Inactive user | Disabled account screen |
| `/forgot-password` | Phase 2 | Email password reset |

MVP password reset is handled by super admin temporary password reset, so `/forgot-password` can be a placeholder or omitted in MVP.

## 3. Main User Routes

| Route | Access | Purpose |
|---|---|---|
| `/` | Active member | Home dashboard for active project |
| `/upload` | Uploader, super admin | Upload list, edit own uploads, create new upload |
| `/storybook` | Project member | Approved or internal storybook viewer |
| `/settings` | Logged-in user | Profile settings |
| `/settings/project` | Logged-in user | Active project selection |
| `/settings/password` | Logged-in user | Password change |

## 4. Admin Routes

### Super Admin Routes

| Route | Access | Purpose |
|---|---|---|
| `/admin/projects` | Super admin | Project CRUD and active project apply |
| `/admin/members` | Super admin | Approve users, assign roles, deactivate users |
| `/admin/bgm` | Super admin | Manual BGM upload and management |
| `/admin/outputs` | Super admin | PDF outputs and output history |
| `/admin/videoflow` | Super admin | VideoFlow package export |
| `/admin/videos` | Super admin | Final video upload/manage/publish |
| `/admin/ai-images` | Super admin | AI cover image generation |
| `/admin/backups` | Super admin | Backup run status |

### Project Manager And Super Admin Routes

| Route | Access | Purpose |
|---|---|---|
| `/admin/schedules` | Project manager, super admin | Day and schedule management |
| `/admin/storybook` | Project manager, super admin | Storybook edit/approve |
| `/admin/share-links` | Project manager, super admin | Create and manage share links |

Project managers can create share links only for assigned projects and approved storybooks/videos allowed by policy.

## 5. Share Routes

| Route | Access | Purpose |
|---|---|---|
| `/share/:token` | Public with valid token | Public read-only storybook/video page |

Share route behavior:

```text
Hash token
-> Find share_links row
-> Check is_active
-> Check expires_at
-> Load approved storybook and published video only
```

## 6. API Routes

### Auth API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/auth/signup` | Create pending user |
| `POST` | `/api/auth/login` | Create session |
| `POST` | `/api/auth/logout` | Destroy session |
| `GET` | `/api/auth/me` | Current user/session |
| `POST` | `/api/auth/change-password` | Change own password |

### Super Admin User API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/users` | List users |
| `POST` | `/api/admin/users/:userId/approve` | Approve user |
| `POST` | `/api/admin/users/:userId/reject` | Reject user |
| `POST` | `/api/admin/users/:userId/deactivate` | Deactivate user |
| `POST` | `/api/admin/users/:userId/reset-password` | Issue temporary password |

### Project API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects` | List accessible projects |
| `PATCH` | `/api/projects/active` | Update current user's active project |
| `POST` | `/api/admin/projects` | Create project, super admin only |
| `GET` | `/api/projects/:projectId` | Project detail |
| `PATCH` | `/api/admin/projects/:projectId` | Update project, super admin only |
| `DELETE` | `/api/admin/projects/:projectId` | Delete/archive project, super admin only |
| `POST` | `/api/admin/projects/:projectId/complete` | Mark completed and create snapshot |

### Project Member API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/projects/:projectId/members` | List project members |
| `POST` | `/api/admin/projects/:projectId/members` | Add member/role, super admin only |
| `PATCH` | `/api/admin/projects/:projectId/members/:memberId` | Update role/status, super admin only |
| `DELETE` | `/api/admin/projects/:projectId/members/:memberId` | Remove member, super admin only |
| `POST` | `/api/admin/users/:userId/project-members` | Assign user to project role, super admin only |

### Schedule API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects/:projectId/days` | List days |
| `PATCH` | `/api/admin/projects/:projectId/days/:dayId` | Update day title |
| `GET` | `/api/projects/:projectId/schedules` | List schedules |
| `POST` | `/api/admin/projects/:projectId/schedules` | Create schedule |
| `PATCH` | `/api/admin/projects/:projectId/schedules/:scheduleId` | Update schedule |
| `DELETE` | `/api/admin/projects/:projectId/schedules/:scheduleId` | Delete schedule |

### Upload API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects/:projectId/uploads` | List uploads |
| `POST` | `/api/projects/:projectId/uploads` | Create upload |
| `POST` | `/api/uploads` | Create upload for current active project |
| `GET` | `/api/projects/:projectId/uploads/:uploadId` | Upload detail |
| `PATCH` | `/api/projects/:projectId/uploads/:uploadId` | Update own upload before approval |
| `DELETE` | `/api/projects/:projectId/uploads/:uploadId` | Soft delete own upload before approval |
| `PATCH` | `/api/uploads/:uploadId` | Update current user's upload before approval |
| `DELETE` | `/api/uploads/:uploadId` | Soft delete current user's upload before approval |
| `POST` | `/api/projects/:projectId/uploads/:uploadId/files` | Upload media files |
| `DELETE` | `/api/projects/:projectId/uploads/:uploadId/files/:fileId` | Remove file before approval |
| `DELETE` | `/api/uploads/:uploadId/files/:fileId` | Remove current user's upload file before approval |

### Storybook API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/projects/:projectId/storybook` | Get storybook |
| `PATCH` | `/api/admin/projects/:projectId/storybook` | Edit storybook metadata |
| `PATCH` | `/api/admin/projects/:projectId/uploads/:uploadId/storybook` | Update storybook include flag and admin caption |
| `POST` | `/api/admin/projects/:projectId/storybook/items` | Add item |
| `PATCH` | `/api/admin/projects/:projectId/storybook/items/:itemId` | Update caption/order/visibility |
| `POST` | `/api/admin/projects/:projectId/storybook/reorder` | Reorder items |
| `POST` | `/api/admin/projects/:projectId/storybook/approve` | Approve storybook |
| `POST` | `/api/admin/projects/:projectId/storybook/unlock` | Unlock storybook, super admin only |

### AI API

| Method | Route | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/ai/storybook-review` | Project manager, super admin | Create text AI review job |
| `POST` | `/api/ai/memo-summary` | Project manager, super admin | Create memo summary job |
| `POST` | `/api/ai/caption-timeline` | Super admin | Create caption timeline job |
| `POST` | `/api/ai/bgm-keywords` | Super admin | Create BGM keyword job |
| `POST` | `/api/ai/images` | Super admin | Create AI image generation job |
| `GET` | `/api/ai/jobs/:jobId` | Job owner or super admin | Poll AI job status |

### BGM API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/projects/:projectId/bgm` | List BGM, super admin |
| `POST` | `/api/admin/projects/:projectId/bgm` | Upload BGM, super admin |
| `PATCH` | `/api/admin/projects/:projectId/bgm/:bgmId` | Set active/update title, super admin |
| `DELETE` | `/api/admin/projects/:projectId/bgm/:bgmId` | Delete BGM, super admin |

### Output And VideoFlow API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/admin/projects/:projectId/outputs/pdf` | Generate PDF, super admin |
| `GET` | `/api/admin/projects/:projectId/outputs` | List outputs, super admin |
| `POST` | `/api/admin/projects/:projectId/videoflow/export` | Generate export package, super admin |
| `GET` | `/api/admin/projects/:projectId/videoflow/export/:exportId/download` | Download export package, super admin |

### Final Video API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/projects/:projectId/videos` | List final videos, super admin |
| `POST` | `/api/admin/projects/:projectId/videos` | Upload final video, super admin |
| `PATCH` | `/api/admin/projects/:projectId/videos/:videoId` | Update title/status, super admin |
| `DELETE` | `/api/admin/projects/:projectId/videos/:videoId` | Delete final video, super admin |

### Share Link API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/projects/:projectId/share-links` | List share links |
| `POST` | `/api/admin/projects/:projectId/share-links` | Create share link |
| `PATCH` | `/api/admin/projects/:projectId/share-links/:shareLinkId` | Disable share link |
| `GET` | `/api/share/:token` | Public share data |

### Media API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/media/:fileId` | Stream protected upload media with Range support |
| `GET` | `/api/share/:token/media/:fileId` | Stream public shared storybook media with Range support |

### Backup API

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/admin/backups` | List backup runs, super admin |
| `POST` | `/api/admin/projects/:projectId/backups/snapshot` | Manual completed snapshot, super admin |

## 7. MVP Page Build Order

Recommended implementation order:

```text
1. Auth pages
2. Super admin user approval
3. Project CRUD and Day generation
4. Project member management
5. Shared app/admin layout
6. Schedule management
7. Upload page
8. Media processing
9. Storybook editor
10. Text AI review jobs
11. Storybook approval and upload lock
12. Share link page
13. BGM management
14. PDF generation
15. VideoFlow export
16. Final video upload and streaming
17. Backup script and backup status
18. GitHub Actions deployment
```

## 8. Layout Notes

Desktop:

```text
Fixed left sidebar
64px logo area
64px top title bar
Scrollable content area
Active project name displayed read-only
```

Mobile:

```text
Sticky top bar
Hamburger menu
Read-only active project badge
FAB for upload where applicable
```

Project switching is only available at `/settings/project`.


