-- Intermediate / Advanced speaking topics (admin can add, hide, list).

create table if not exists public.efaa_debate_topics (
  id text primary key,
  level text not null check (level in ('intermediate', 'advanced')),
  title_en text not null,
  title_fr text not null default '',
  title_ar text not null default '',
  questions jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists efaa_debate_topics_level_sort
  on public.efaa_debate_topics (level, active, sort_order);

alter table public.efaa_debate_topics enable row level security;
alter table public.efaa_debate_topics replica identity full;

drop policy if exists efaa_debate_topics_select on public.efaa_debate_topics;
create policy efaa_debate_topics_select on public.efaa_debate_topics
  for select using (active = true);

grant select on public.efaa_debate_topics to anon, authenticated;
