alter table public.efaa_web add column if not exists practice_students jsonb not null default '[]'::jsonb;
