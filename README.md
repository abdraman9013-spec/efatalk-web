# EFA Talk (efatalk.fyi)

Premium practice platform for **English For All Academy** — official students, live classes, lessons, exams, and gamification.

- **Production:** https://www.efatalk.fyi
- **Stack:** Next.js 16 · TypeScript · Supabase · Daily.co · Railway
- **Tables:** `efaa_*` in Postgres (see `supabase/migrations/`)

## Local dev

```bash
npm install
cp .env.example .env.local   # fill Supabase + optional keys
npm run dev
```

Open http://localhost:3000

## Docs

- `docs/challenge-2026-implementation.md` — challenge system
- `public/about.txt` · `public/llms.txt` — public site description

## Security

Do not commit `.env.local`, service role keys, or Daily secrets. This repo is **private** (code review / presentation only).
