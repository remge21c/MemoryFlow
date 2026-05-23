# MemoryFlow

MemoryFlow is a project-based travel memory app for collecting photos, videos, and notes, curating them into a storybook, and publishing final PDFs/videos through controlled share links.

## Current Stack

```text
Next.js App Router
TypeScript
Tailwind CSS
Prisma
PostgreSQL
Docker Compose for local DB
```

## Local Development

Install dependencies:

```bash
npm install
```

Create local environment:

```bash
copy .env.example .env
```

Start local PostgreSQL:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Generate Prisma Client:

```bash
npm run prisma:generate
```

Run migrations when migration files are added:

```bash
npm run prisma:migrate
```

Seed development data:

```bash
npm run db:seed
```

Default local super admin:

```text
Email: admin@memoryflow.local
Password: MemoryFlow!2026
```

Start the app:

```bash
npm run dev
```

## Verification

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Implemented MVP Foundation

```text
Auth:
- Email/password login and signup
- Pending/rejected/inactive account states
- Super admin approval flow

Admin:
- User approval, rejection, deactivation
- Project role assignment
- Project creation with automatic Day generation
- Project status changes
- Schedule create/update/delete for active projects

Core app:
- Active project selection at /settings/project
- Home dashboard backed by PostgreSQL project data
- Storybook viewer backed by PostgreSQL schedules/uploads
- Local upload foundation using LOCAL_STORAGE_ROOT
```

## Local Storage

Uploaded files are stored under `LOCAL_STORAGE_ROOT`.

```text
storage/
└── projects/{projectId}/uploads/{uploadId}/...
```

The local `storage/` folder is ignored by Git.

## Planning Documents

```text
docs/memoryflow-prd-v2.md
docs/memoryflow-erd-v2.md
docs/memoryflow-mvp-routes-v2.md
docs/design-system/MASTER.md
docs/design-system/pages/README.md
docs/design-system/reference/memoryflow/DESIGN.md
```
