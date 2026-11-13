-- Top 10 class board, game-point → +15 board, infinite everyday words.
-- Does not touch pro_* tables or current_streak.

alter table public.efaa_user_game_state
  add column if not exists last_board_threshold integer not null default 0;

update public.efaa_user_game_state
set last_board_threshold = greatest(last_board_threshold, floor(personal_points / 100.0)::integer)
where last_board_threshold < floor(personal_points / 100.0)::integer;

create or replace function public.efaa_flush_game_board_bonus(p_user_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  next_threshold integer;
  steps integer;
  awarded integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 or p_user_id = 'efaa-admin' then
    return 0;
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    return 0;
  end if;

  next_threshold := floor(rec.personal_points / 100.0)::integer;
  if next_threshold <= coalesce(rec.last_board_threshold, 0) then
    return 0;
  end if;

  steps := next_threshold - coalesce(rec.last_board_threshold, 0);
  awarded := steps * 15;

  update public.efaa_user_game_state
  set last_board_threshold = next_threshold,
      updated_at = now()
  where user_id = p_user_id;

  update public.efaa_user_gamification
  set total_points = least(10000, total_points + awarded),
      updated_at = now()
  where user_id = p_user_id
    and user_id <> 'efaa-admin';

  return awarded;
end;
$$;

grant execute on function public.efaa_flush_game_board_bonus(text) to anon, authenticated;

create or replace function public.efaa_add_game_points(p_user_id text, p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  gain integer := greatest(coalesce(p_points, 0), 0);
  bonus integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  if gain = 0 then
    return to_jsonb(rec) || jsonb_build_object('board_bonus', 0);
  end if;

  update public.efaa_user_game_state
  set personal_points = personal_points + gain,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  bonus := public.efaa_flush_game_board_bonus(p_user_id);
  select * into rec from public.efaa_user_game_state where user_id = p_user_id;
  return to_jsonb(rec) || jsonb_build_object('board_bonus', bonus);
end;
$$;

grant execute on function public.efaa_add_game_points(text, integer) to anon, authenticated;

create or replace function public.efaa_award_game_win(p_user_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_game_state%rowtype;
  board public.efaa_countries_leaderboard%rowtype;
  bonus integer := 0;
begin
  if p_user_id is null or length(trim(p_user_id)) = 0 then
    raise exception 'user_id required';
  end if;

  select * into rec from public.efaa_user_game_state where user_id = p_user_id for update;
  if rec.user_id is null then
    raise exception 'game state missing';
  end if;

  update public.efaa_user_game_state
  set personal_points = personal_points + 2,
      updated_at = now()
  where user_id = p_user_id
  returning * into rec;

  insert into public.efaa_countries_leaderboard (country_code, country_name, flag_emoji, total_score)
  values (rec.country_code, rec.country_code, public.efaa_flag_emoji(rec.country_code), 20)
  on conflict (country_code) do update
    set total_score = efaa_countries_leaderboard.total_score + 20,
        updated_at = now()
  returning * into board;

  bonus := public.efaa_flush_game_board_bonus(p_user_id);
  select * into rec from public.efaa_user_game_state where user_id = p_user_id;

  return jsonb_build_object(
    'personal_points', rec.personal_points,
    'lightning_bolts', rec.lightning_bolts,
    'country_code', rec.country_code,
    'country_score', board.total_score,
    'personal_gained', 2,
    'country_gained', 20,
    'board_bonus', bonus
  );
end;
$$;

grant execute on function public.efaa_award_game_win(text) to anon, authenticated;

create or replace function public.efaa_leaderboard_for(p_user_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me public.efaa_user_gamification%rowtype;
  rival public.efaa_user_gamification%rowtype;
  my_rank integer := 1;
  top_rows jsonb;
  gap integer := 0;
  me_name text;
  rival_name text;
begin
  select * into me from public.efaa_user_gamification where user_id = p_user_id;
  me_name := coalesce(nullif(public.efaa_student_board_name(p_user_id), ''), me.display_name);

  select jsonb_agg(row_to_json(t))
    into top_rows
  from (
    select
      g.user_id,
      coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name) as display_name,
      g.nationality,
      g.current_streak,
      g.diamonds_count,
      g.total_points,
      public.efaa_student_avatar_url(g.user_id) as photo
    from public.efaa_user_gamification g
    where g.user_id <> 'efaa-admin'
      and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
      and (
        exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
        or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
      )
    order by g.total_points desc, g.diamonds_count desc, g.current_streak desc, g.user_id asc
    limit 10
  ) t;

  if me.user_id is null then
    return jsonb_build_object('top', coalesce(top_rows, '[]'::jsonb), 'me', null, 'rank', null, 'rival', null, 'gap', 0);
  end if;

  select count(*)::integer + 1
  into my_rank
  from public.efaa_user_gamification g
  where g.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and (
      g.total_points > coalesce(me.total_points, 0)
      or (g.total_points = coalesce(me.total_points, 0) and g.diamonds_count > coalesce(me.diamonds_count, 0))
      or (
        g.total_points = coalesce(me.total_points, 0)
        and g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.current_streak > coalesce(me.current_streak, 0)
      )
      or (
        g.total_points = coalesce(me.total_points, 0)
        and g.diamonds_count = coalesce(me.diamonds_count, 0)
        and g.current_streak = coalesce(me.current_streak, 0)
        and g.user_id < me.user_id
      )
    );

  select *
  into rival
  from public.efaa_user_gamification g
  where g.user_id <> me.user_id
    and g.user_id <> 'efaa-admin'
    and btrim(coalesce(nullif(public.efaa_student_board_name(g.user_id), ''), g.display_name, '')) <> ''
    and (
      exists (select 1 from public.efaa_practice_students p where p.id::text = g.user_id)
      or exists (select 1 from public.efaa_active_students a where a.id::text = g.user_id)
    )
    and g.total_points > coalesce(me.total_points, 0)
  order by g.total_points asc, g.diamonds_count asc, g.user_id asc
  limit 1;

  if rival.user_id is not null then
    gap := rival.total_points - coalesce(me.total_points, 0);
    rival_name := coalesce(nullif(public.efaa_student_board_name(rival.user_id), ''), rival.display_name);
  end if;

  return jsonb_build_object(
    'top', coalesce(top_rows, '[]'::jsonb),
    'me', to_jsonb(me) || jsonb_build_object(
      'display_name', coalesce(me_name, me.display_name),
      'photo', public.efaa_student_avatar_url(me.user_id)
    ),
    'rank', my_rank,
    'rival', case
      when rival.user_id is null then null
      else to_jsonb(rival) || jsonb_build_object(
        'display_name', coalesce(rival_name, rival.display_name),
        'photo', public.efaa_student_avatar_url(rival.user_id)
      )
    end,
    'gap', greatest(gap, 0)
  );
end;
$$;

grant execute on function public.efaa_leaderboard_for(text) to anon, authenticated;

create or replace function public.get_adaptive_words(user_id text, limit_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.efaa_user_mastery%rowtype;
  effective integer;
  lo integer;
  hi integer;
  cap integer;
  words jsonb;
  have integer := 0;
begin
  rec := public.efaa_ensure_user_mastery(get_adaptive_words.user_id);
  effective := rec.current_mastery_index;
  if rec.account_created_at > now() - interval '14 days' then
    effective := least(effective, 20);
  end if;
  effective := greatest(1, least(100, effective));
  lo := greatest(1, effective - 20);
  hi := least(100, effective + 20);
  cap := greatest(1, least(coalesce(limit_amount, 20), 50));

  select coalesce(jsonb_agg(to_jsonb(picked)), '[]'::jsonb)
  into words
  from (
    select id, word_en, translation_fr, translation_ar, difficulty_index, category, image_url
    from public.efaa_vocabulary
    where difficulty_index between lo and hi
    order by random()
    limit cap
  ) picked;

  have := coalesce(jsonb_array_length(words), 0);
  if have < greatest(6, cap / 2) then
    select coalesce(jsonb_agg(to_jsonb(picked)), '[]'::jsonb)
    into words
    from (
      select id, word_en, translation_fr, translation_ar, difficulty_index, category, image_url
      from public.efaa_vocabulary
      order by random()
      limit cap
    ) picked;
    lo := 1;
    hi := 100;
  end if;

  return jsonb_build_object(
    'user_id', rec.user_id,
    'mastery_index', rec.current_mastery_index,
    'effective_mastery', effective,
    'matches_won', rec.matches_won,
    'account_created_at', rec.account_created_at,
    'range', jsonb_build_array(lo, hi),
    'words', coalesce(words, '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_adaptive_words(text, integer) to anon, authenticated;

insert into public.efaa_vocabulary (word_en, translation_fr, translation_ar, difficulty_index, category)
values
  ('RICE', 'riz', 'أرز', 3, 'food'),
  ('TEA', 'thé', 'شاي', 2, 'food'),
  ('MILK', 'lait', 'حليب', 3, 'food'),
  ('FISH', 'poisson', 'سمك', 4, 'food'),
  ('MEAT', 'viande', 'لحم', 5, 'food'),
  ('SALT', 'sel', 'ملح', 3, 'food'),
  ('SUGAR', 'sucre', 'سكر', 3, 'food'),
  ('FRUIT', 'fruit', 'فاكهة', 4, 'food'),
  ('ORANGE', 'orange', 'برتقال', 4, 'food'),
  ('BANANA', 'banane', 'موز', 3, 'food'),
  ('CHICKEN', 'poulet', 'دجاج', 6, 'food'),
  ('SOUP', 'soupe', 'شوربة', 5, 'food'),
  ('DOOR', 'porte', 'باب', 3, 'home'),
  ('TABLE', 'table', 'طاولة', 3, 'home'),
  ('CHAIR', 'chaise', 'كرسي', 3, 'home'),
  ('BED', 'lit', 'سرير', 3, 'home'),
  ('KEY', 'clé', 'مفتاح', 4, 'home'),
  ('ROOM', 'chambre', 'غرفة', 4, 'home'),
  ('KITCHEN', 'cuisine', 'مطبخ', 7, 'home'),
  ('STREET', 'rue', 'شارع', 5, 'places'),
  ('SHOP', 'magasin', 'محل', 5, 'places'),
  ('HOSPITAL', 'hôpital', 'مستشفى', 8, 'places'),
  ('CHURCH', 'église', 'كنيسة', 7, 'places'),
  ('MOSQUE', 'mosquée', 'مسجد', 6, 'places'),
  ('RIVER', 'rivière', 'نهر', 6, 'nature'),
  ('RAIN', 'pluie', 'مطر', 4, 'nature'),
  ('WIND', 'vent', 'ريح', 4, 'nature'),
  ('TREE', 'arbre', 'شجرة', 3, 'nature'),
  ('FLOWER', 'fleur', 'زهرة', 4, 'nature'),
  ('MOON', 'lune', 'قمر', 3, 'nature'),
  ('STAR', 'étoile', 'نجمة', 3, 'nature'),
  ('FIRE', 'feu', 'نار', 3, 'nature'),
  ('EARTH', 'terre', 'أرض', 6, 'nature'),
  ('BIRD', 'oiseau', 'طائر', 4, 'animals'),
  ('COW', 'vache', 'بقرة', 4, 'animals'),
  ('GOAT', 'chèvre', 'ماعز', 5, 'animals'),
  ('HORSE', 'cheval', 'حصان', 5, 'animals'),
  ('FATHER', 'père', 'أب', 4, 'people'),
  ('SISTER', 'sœur', 'أخت', 5, 'people'),
  ('BROTHER', 'frère', 'أخ', 5, 'people'),
  ('BABY', 'bébé', 'طفل رضيع', 4, 'people'),
  ('MAN', 'homme', 'رجل', 2, 'people'),
  ('WOMAN', 'femme', 'امرأة', 3, 'people'),
  ('STUDENT', 'élève', 'طالب', 7, 'school'),
  ('LESSON', 'leçon', 'درس', 6, 'school'),
  ('PAPER', 'papier', 'ورق', 4, 'school'),
  ('PEN', 'stylo', 'قلم', 3, 'school'),
  ('BAG', 'sac', 'حقيبة', 4, 'objects'),
  ('SHOE', 'chaussure', 'حذاء', 5, 'objects'),
  ('HAT', 'chapeau', 'قبعة', 4, 'objects'),
  ('CAR', 'voiture', 'سيارة', 4, 'life'),
  ('BUS', 'bus', 'حافلة', 4, 'life'),
  ('ROAD', 'route', 'طريق', 5, 'life'),
  ('JOB', 'travail', 'عمل', 6, 'life'),
  ('MORNING', 'matin', 'صباح', 6, 'life'),
  ('EVENING', 'soir', 'مساء', 6, 'life'),
  ('TODAY', 'aujourd''hui', 'اليوم', 5, 'life'),
  ('TOMORROW', 'demain', 'غدا', 7, 'life'),
  ('YES', 'oui', 'نعم', 1, 'life'),
  ('PLEASE', 's''il te plaît', 'من فضلك', 6, 'life'),
  ('THANKS', 'merci', 'شكرا', 4, 'life'),
  ('HELLO', 'bonjour', 'مرحبا', 2, 'life'),
  ('GOODBYE', 'au revoir', 'وداعا', 5, 'life'),
  ('LOVE', 'amour', 'حب', 8, 'feelings'),
  ('ANGRY', 'en colère', 'غاضب', 9, 'feelings'),
  ('TIRED', 'fatigué', 'متعب', 7, 'feelings'),
  ('HUNGRY', 'affamé', 'جائع', 7, 'feelings'),
  ('THIRSTY', 'assoiffé', 'عطشان', 8, 'feelings'),
  ('STRONG', 'fort', 'قوي', 8, 'feelings'),
  ('KIND', 'gentil', 'لطيف', 8, 'feelings'),
  ('BRAVE', 'courageux', 'شجاع', 10, 'feelings'),
  ('PEACE', 'paix', 'سلام', 11, 'abstract'),
  ('TRUTH', 'vérité', 'حقيقة', 12, 'abstract'),
  ('HOPE', 'espoir', 'أمل', 11, 'abstract'),
  ('POWER', 'pouvoir', 'قوة', 12, 'abstract'),
  ('FUTURE', 'avenir', 'مستقبل', 13, 'abstract'),
  ('CHOICE', 'choix', 'اختيار', 14, 'abstract'),
  ('STORY', 'histoire', 'قصة', 10, 'abstract'),
  ('MUSIC', 'musique', 'موسيقى', 7, 'life'),
  ('GAME', 'jeu', 'لعبة', 5, 'life'),
  ('TEAM', 'équipe', 'فريق', 8, 'life'),
  ('GOAL', 'but', 'هدف', 9, 'life'),
  ('PLAN', 'plan', 'خطة', 10, 'life'),
  ('IDEA', 'idée', 'فكرة', 11, 'abstract'),
  ('REASON', 'raison', 'سبب', 13, 'abstract'),
  ('PROBLEM', 'problème', 'مشكلة', 12, 'abstract'),
  ('ANSWER', 'réponse', 'جواب', 9, 'school'),
  ('QUESTION', 'question', 'سؤال', 8, 'school'),
  ('VOICE', 'voix', 'صوت', 9, 'life'),
  ('SMILE', 'sourire', 'ابتسامة', 8, 'feelings'),
  ('HEART', 'cœur', 'قلب', 7, 'feelings'),
  ('HAND', 'main', 'يد', 3, 'objects'),
  ('EYE', 'œil', 'عين', 3, 'objects'),
  ('WATERMELON', 'pastèque', 'بطيخ', 8, 'food'),
  ('ONION', 'oignon', 'بصل', 6, 'food'),
  ('TOMATO', 'tomate', 'طماطم', 5, 'food'),
  ('OIL', 'huile', 'زيت', 5, 'food'),
  ('PLATE', 'assiette', 'طبق', 5, 'home'),
  ('CUP', 'tasse', 'كوب', 4, 'home'),
  ('SOAP', 'savon', 'صابون', 5, 'home'),
  ('CLOTHES', 'vêtements', 'ملابس', 7, 'life'),
  ('MARKETPLACE', 'marché', 'سوق', 9, 'places'),
  ('NEIGHBOR', 'voisin', 'جار', 10, 'people'),
  ('LEADER', 'leader', 'قائد', 14, 'people'),
  ('COUNTRY', 'pays', 'بلد', 8, 'places'),
  ('LANGUAGE', 'langue', 'لغة', 10, 'school'),
  ('ENGLISH', 'anglais', 'إنجليزي', 7, 'school'),
  ('PRACTICE', 'pratique', 'تدريب', 11, 'school'),
  ('CONFIDENCE', 'confiance', 'ثقة', 16, 'abstract'),
  ('RESPECT', 'respect', 'احترام', 15, 'abstract'),
  ('COURAGE', 'courage', 'شجاعة', 15, 'abstract'),
  ('SUCCESS', 'succès', 'نجاح', 14, 'abstract'),
  ('PATIENCE', 'patience', 'صبر', 16, 'abstract'),
  ('HONEST', 'honnête', 'صادق', 13, 'feelings'),
  ('SIMPLE', 'simple', 'بسيط', 10, 'abstract'),
  ('READY', 'prêt', 'جاهز', 8, 'feelings')
on conflict (word_key) do nothing;

insert into public.efaa_vocabulary_emojis (word_en, translation_fr, emoji, translation_ar)
values
  ('Rice', 'Riz', '🍚', 'أرز'),
  ('Tea', 'Thé', '🍵', 'شاي'),
  ('Meat', 'Viande', '🥩', 'لحم'),
  ('Salt', 'Sel', '🧂', 'ملح'),
  ('Sugar', 'Sucre', '🍬', 'سكر'),
  ('Fruit', 'Fruit', '🍇', 'فاكهة'),
  ('Orange', 'Orange', '🍊', 'برتقال'),
  ('Chicken', 'Poulet', '🍗', 'دجاج'),
  ('Soup', 'Soupe', '🍲', 'شوربة'),
  ('Room', 'Chambre', '🛏️', 'غرفة'),
  ('Kitchen', 'Cuisine', '🍳', 'مطبخ'),
  ('Street', 'Rue', '🛣️', 'شارع'),
  ('Shop', 'Magasin', '🏪', 'محل'),
  ('Hospital', 'Hôpital', '🏥', 'مستشفى'),
  ('Church', 'Église', '⛪', 'كنيسة'),
  ('Mosque', 'Mosquée', '🕌', 'مسجد'),
  ('River', 'Rivière', '🌊', 'نهر'),
  ('Wind', 'Vent', '💨', 'ريح'),
  ('Earth', 'Terre', '🌍', 'أرض'),
  ('Cow', 'Vache', '🐄', 'بقرة'),
  ('Goat', 'Chèvre', '🐐', 'ماعز'),
  ('Horse', 'Cheval', '🐴', 'حصان'),
  ('Father', 'Père', '👨', 'أب'),
  ('Mother', 'Mère', '👩', 'أم'),
  ('Sister', 'Sœur', '👧', 'أخت'),
  ('Brother', 'Frère', '👦', 'أخ'),
  ('Baby', 'Bébé', '👶', 'رضيع'),
  ('Student', 'Élève', '🧑‍🎓', 'طالب'),
  ('Lesson', 'Leçon', '📝', 'درس'),
  ('Paper', 'Papier', '📄', 'ورق'),
  ('Road', 'Route', '🛤️', 'طريق'),
  ('Morning', 'Matin', '🌅', 'صباح'),
  ('Evening', 'Soir', '🌇', 'مساء'),
  ('Love', 'Amour', '💕', 'حب'),
  ('Smile', 'Sourire', '😊', 'ابتسامة'),
  ('Music', 'Musique', '🎵', 'موسيقى'),
  ('Game', 'Jeu', '🎮', 'لعبة'),
  ('Team', 'Équipe', '👥', 'فريق'),
  ('Goal', 'But', '🥅', 'هدف'),
  ('Voice', 'Voix', '🗣️', 'صوت'),
  ('Eye', 'Œil', '👁️', 'عين'),
  ('Tomato', 'Tomate', '🍅', 'طماطم'),
  ('Onion', 'Oignon', '🧅', 'بصل'),
  ('Oil', 'Huile', '🫒', 'زيت'),
  ('Plate', 'Assiette', '🍽️', 'طبق'),
  ('Cup', 'Tasse', '🥤', 'كوب'),
  ('Soap', 'Savon', '🧼', 'صابون'),
  ('Clothes', 'Vêtements', '👕', 'ملابس'),
  ('Neighbor', 'Voisin', '🤝', 'جار'),
  ('Country', 'Pays', '🏳️', 'بلد'),
  ('English', 'Anglais', '🇬🇧', 'إنجليزي'),
  ('Practice', 'Pratique', '🏋️', 'تدريب'),
  ('Peace', 'Paix', '🕊️', 'سلام'),
  ('Hope', 'Espoir', '🌈', 'أمل'),
  ('Future', 'Avenir', '🔮', 'مستقبل'),
  ('Question', 'Question', '❓', 'سؤال'),
  ('Answer', 'Réponse', '✅', 'جواب'),
  ('Thanks', 'Merci', '🙏', 'شكرا'),
  ('Hello', 'Bonjour', '👋', 'مرحبا'),
  ('Yes', 'Oui', '👍', 'نعم')
on conflict (word_en) do nothing;
