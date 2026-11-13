-- Replace Play cards + Clash dictionary with 1000 new classroom words.
-- Isolated from live-room points and from all pro_* tables.

truncate table public.efaa_vocabulary restart identity;
truncate table public.efaa_vocabulary_emojis restart identity;
