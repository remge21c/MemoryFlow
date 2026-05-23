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

## Planning Documents

```text
docs/memoryflow-prd-v2.md
docs/memoryflow-erd-v2.md
docs/memoryflow-mvp-routes-v2.md
docs/design system/memoryflow/DESIGN.md
```
