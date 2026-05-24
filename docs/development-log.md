# MemoryFlow Development Log

## 2026-05-24

Implemented and pushed:

```text
a8de1de Add super admin project management
3e2d53c Add admin schedule management
a3b9524 Connect core pages to project data
f6d4ae2 Add local upload foundation
5181db2 Add storybook editing and approval flow
b416e81 Add public storybook share links
25964a8 Add protected and shared media streaming
5a8779f Add upload edit and delete management
current Add storybook ordering and preview
current Add account management and approval assignment flow
current Add admin permission boundaries
current Tighten first-use role UX
current Improve member approval UX
current Improve project management UX
current Improve schedule management UX
current Improve storybook approval UX
current Improve upload UX
current Improve home dashboard UX
```

Verified:

```text
npm run lint
npx tsc --noEmit
npm run build
Browser check: /, /settings/project, /storybook, /admin/projects, /admin/schedules, /upload
Upload API smoke test with local storage write and cleanup
Storybook approval smoke test:
- Create test upload
- Save include flag and admin caption
- Approve storybook
- Confirm upload API is locked with 409
- Unlock storybook
- Clean up test upload/file/storybook item
Share link smoke test:
- Create test upload
- Approve storybook
- Issue 30-day share link
- Confirm /share/:token renders without login
- Disable link
- Confirm disabled token no longer renders the storybook
- Clean up test upload/file/storybook item/share link
Media streaming smoke test:
- Create test image upload
- Confirm /api/media/:fileId streams image/jpeg with an authenticated session
- Approve storybook and issue share link
- Confirm /api/share/:token/media/:fileId streams image/jpeg without login
- Clean up test upload/file/storybook item/share link
Upload management smoke test:
- Create two-file photo upload
- Update Day, schedule, and memo
- Delete one upload file and confirm physical file removal
- Soft delete upload
- Clean up test upload folder
Storybook ordering and preview smoke test:
- Create two test uploads in the same schedule
- Move the second upload upward
- Confirm DB sort order changed
- Confirm /admin/storybook/preview renders the reordered items
- Clean up test uploads and files
Account and member approval smoke test:
- Add /settings account profile and password forms
- Add account profile/password API routes
- Approve a temporary pending user with project and role in one API call
- Confirm user status, active project, and project membership
- Clean up temporary user
Browser smoke test:
- Login as super admin
- Confirm /settings renders account forms
- Confirm /admin/members renders project and role controls
Admin permission matrix smoke test:
- Super admin can access /admin/projects, /admin/members, /admin/schedules, /admin/storybook
- Project manager sees an admin entry and can access schedules/storybook
- Project manager is redirected from super-admin-only pages to /forbidden
- Uploader does not see admin links
- Uploader is redirected from all /admin pages to /forbidden
- Temporary test users are removed after verification
First-use role flow smoke test:
- Sign up temporary users and confirm pending users redirect to /pending
- Approve one user as uploader and one as project manager
- Confirm uploader lands on dashboard with upload entry and can create a small test upload
- Confirm uploader is blocked from admin pages
- Confirm project manager sees admin schedule entry but no upload nav/CTA
- Confirm project manager can access schedules/storybook and is blocked from member management
- Confirm project manager /upload page does not expose file controls
- Browser smoke test confirms uploader and project manager mobile UX
Member approval UX smoke test:
- Create a temporary pending user
- Confirm /admin/members renders the pending user in the approval flow
- Confirm project and role controls plus approval actions are present
- Clean up temporary pending user
Project management UX smoke test:
- Create a temporary active user as a manager candidate
- Create a temporary project with that user selected as project manager
- Confirm generated Day records, draft storybook, active project application, and manager membership
- Confirm active project can be switched with the project apply API
- Confirm /admin/projects renders project creation, manager selector, current project label, and project status summary
- Clean up temporary project and manager candidate
Schedule management UX smoke test:
- Confirm /admin/schedules renders schedule summary and create controls
- Create, update, and delete a temporary schedule through the API
- Confirm browser renders day/category selectors, time inputs, and schedule action buttons
Storybook approval UX smoke test:
- Confirm /admin/storybook renders review summary, approval readiness, preview, and share link controls
- Create a temporary upload with local media file
- Save storybook title/opening/closing text
- Save upload include state and admin caption
- Approve storybook and confirm generated storybook item caption
- Unlock storybook and clean up temporary upload/media
- Browser smoke test confirms textareas, action buttons, and status badges render
Upload UX smoke test:
- Confirm /upload renders summary cards, upload controls, file input, Day/schedule selectors, and memo textarea
- Create a small image upload through the browser UI
- Confirm the upload is persisted with one media file
- Delete the temporary upload through the authenticated API
Home dashboard UX smoke test:
- Confirm / renders project status, schedule progress, Day timeline, recent uploads, storybook status, and video status
- Confirm desktop and mobile viewports render the dashboard cards and primary links
Upload UX v2 smoke test:
- Confirm /upload renders the drag/drop file area, browse button, selected schedule summary, memo counter, and file list
- Confirm client upload flow creates one image upload with one media file
- Confirm the temporary upload can be deleted through the authenticated API
Storybook viewer UX smoke test:
- Confirm /storybook empty state renders useful actions when no storybook uploads exist
- Create a temporary storybook upload with local media
- Confirm /storybook renders summary cards, Day timeline, media preview, and story text
- Clean up the temporary upload through the authenticated API
Share page UX smoke test:
- Create a temporary upload, approve the storybook, and issue a 30-day share link
- Confirm /share/:token renders without login with expiry/read-only status and media preview
- Disable the share link and confirm the public page no longer renders story content
- Unlock storybook and clean up the temporary upload/media
Final video upload smoke test:
- Upload a temporary WebM final video through the super-admin project video API
- Confirm authenticated video streaming from /api/videos/:videoId
- Confirm /admin/gallery renders the uploaded final video
- Confirm / renders the latest video title/player and soft-delete the temporary video
Output gallery UX smoke test:
- Confirm /admin/gallery renders summary counts for videos, share links, and reports
- Confirm video, share link, and report tabs can be switched in the browser
- Confirm empty report state and share-link management state render without errors
Output generation smoke test:
- Extend OutputType to html/pdf/doc and apply migration 0002_add_output_types
- Generate temporary HTML, PDF, and DOC outputs from an approved storybook
- Confirm /api/outputs/:outputId streams text/html, application/pdf, and application/msword
- Confirm generated outputs render in /admin/gallery and clean up temporary output files
AI review smoke test:
- Add super-admin storybook review API with OpenAI Responses API support and local fallback
- Create a temporary upload containing a phone-like sensitive string
- Confirm AI review stores a completed aiJob with summary, privacy flags, caption drafts, and BGM keywords
- Confirm /admin/storybook renders the AI review action and clean up temporary upload/job
Operations readiness:
- Add production Dockerfile and docker-compose.prod.yml for web + PostgreSQL
- Add .env.production.example, deploy script, backup script, and operations guide
- Validate docker compose production config with required env vars
- Confirm lint, typecheck, and production build pass after operations files are added
Full-screen role QA:
- Create isolated QA project, manager account, uploader account, Day schedule, and local media upload
- Confirm super admin can access dashboard, upload, storybook, project/member/schedule/storybook/gallery admin screens
- Confirm project manager can access schedule/storybook admin screens only and cannot use media upload
- Confirm uploader can upload media, has no admin entry, and is blocked from admin storybook
- Approve storybook, confirm new uploader uploads are locked with 409, and issue a 30-day share link
- Confirm public share page renders media without login, exposes no admin entry, and invalid token renders no media
- Clean up isolated QA project, users, upload, and share link
```

Current local super admin:

```text
admin@memoryflow.local
MemoryFlow!2026
```

Notes:

```text
The development server can lock Prisma's Windows query engine.
If npm run build fails with EPERM on query_engine-windows.dll.node,
stop the local Next.js dev server, run the build, then restart npm run dev.
```
