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
