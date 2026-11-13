-- Official beginner / writing exams (one attempt per student per exam).

create table if not exists public.efaa_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  exam_id text not null,
  score integer not null default 0,
  total integer not null default 20,
  answers jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  started_at timestamptz,
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id, exam_id)
);

create index if not exists efaa_exam_attempts_exam_idx
  on public.efaa_exam_attempts (exam_id, submitted_at desc);

alter table public.efaa_exam_attempts enable row level security;
alter table public.efaa_exam_attempts replica identity full;

drop policy if exists efaa_exam_attempts_select on public.efaa_exam_attempts;
create policy efaa_exam_attempts_select on public.efaa_exam_attempts
  for select using (true);

grant select on public.efaa_exam_attempts to anon, authenticated;
