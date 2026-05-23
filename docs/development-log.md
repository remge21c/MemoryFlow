# MemoryFlow Development Log

## 2026-05-24

Implemented and pushed:

```text
a8de1de Add super admin project management
3e2d53c Add admin schedule management
a3b9524 Connect core pages to project data
f6d4ae2 Add local upload foundation
```

Verified:

```text
npm run lint
npx tsc --noEmit
npm run build
Browser check: /, /settings/project, /storybook, /admin/projects, /admin/schedules, /upload
Upload API smoke test with local storage write and cleanup
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

