-- /host 호스트 모집 페이지 + /classes 기대 질문 (v0.3.0)
-- 1) web_host_applications: 이름 · 메신저 · 체류자격 · 분야 · 진행 언어 · 가능한 요일 · 알게 된 경로 · 어느 페이지에서 왔는지
-- 2) class_waitlist: 가장 기대되는 것 (선택)
-- 3) class_test_stats: 호스트 페이지 방문 · 체류자격 · 분야, 화면 언어별 신청, utm_campaign 별, 기대 질문
-- 4) 카톡 알림에 체류자격 · 분야 · 기대 질문을 같이 보낸다 (이름 · 연락처는 여전히 안 보냄)

alter table public.web_host_applications
  add column if not exists name text check (name is null or char_length(name) between 1 and 40),
  add column if not exists messenger text check (messenger is null or char_length(messenger) <= 60),
  add column if not exists visa text check (visa is null or visa in ('F-2', 'F-4', 'F-5', 'F-6', 'H-1', 'other', 'unsure')),
  add column if not exists category text check (category is null or category in ('food', 'culture', 'language', 'other')),
  add column if not exists class_lang text check (class_lang is null or char_length(class_lang) <= 60),
  add column if not exists days text[] check (days is null or (cardinality(days) <= 3 and days <@ array['weekday', 'sat', 'sun'])),
  add column if not exists heard_from text check (heard_from is null or char_length(heard_from) <= 100),
  add column if not exists page text not null default 'classes' check (page in ('classes', 'host'));

grant insert (name, messenger, visa, category, class_lang, days, heard_from, page) on public.web_host_applications to anon;

alter table public.class_waitlist
  add column if not exists expect text check (expect is null or expect in ('language', 'food_culture', 'friends', 'other'));

grant insert (expect) on public.class_waitlist to anon;

create or replace function public.web_host_applications_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.email := lower(btrim(new.email));
  new.country := btrim(new.country);
  new.idea := btrim(new.idea);
  new.name := nullif(btrim(coalesce(new.name, '')), '');
  new.messenger := nullif(btrim(coalesce(new.messenger, '')), '');
  new.class_lang := nullif(btrim(coalesce(new.class_lang, '')), '');
  new.heard_from := nullif(btrim(coalesce(new.heard_from, '')), '');
  if new.days is not null and cardinality(new.days) = 0 then new.days := null; end if;
  new.created_at := now();
  if exists (select 1 from web_host_applications where email = new.email and idea = new.idea) then
    return null;
  end if;
  if (select count(*) from web_host_applications where email = new.email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from web_host_applications where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.web_host_applications_alert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.qa then
    perform class_alert_post(jsonb_build_object(
      'kind', 'host',
      'country', left(new.country, 30),
      'visa', new.visa,
      'category', new.category,
      'page', new.page,
      'lang', new.lang,
      'source', coalesce(new.src->>'utm_source', new.src->>'ref', '직접'),
      'total', (select count(*) from web_host_applications where not qa)));
  end if;
  return null;
end $$;

create or replace function public.class_waitlist_alert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not new.qa then
    perform class_alert_post(jsonb_build_object(
      'kind', 'reserve',
      'class_id', new.class_id,
      'party_size', new.party_size,
      'expect', new.expect,
      'lang', new.lang,
      'source', coalesce(new.src->>'utm_source', new.src->>'ref', '직접'),
      'total', (select count(*) from class_waitlist where not qa)));
  end if;
  return null;
end $$;

create or replace function public.class_test_stats(p_key text, p_since timestamptz default '2026-11-01')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  if p_key is null or p_key is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'class_stats_key') then
    perform pg_sleep(1);
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with ev_all as (
    select e.*, coalesce(e.src->>'utm_source', e.src->>'ref', '(직접)') as source,
           coalesce(e.src->>'utm_medium', '') as medium,
           coalesce(e.src->>'utm_campaign', '(없음)') as campaign
    from web_events e
    where e.created_at >= p_since and (e.path like '/classes%' or e.path like '/host%')
      and coalesce((e.props->>'qa')::boolean, false) = false and coalesce((e.props->>'bot')::boolean, false) = false
  ),
  ev as (select * from ev_all where path like '/classes%'),
  evh as (select * from ev_all where path like '/host%'),
  wl as (
    select w.*, coalesce(w.src->>'utm_source', w.src->>'ref', '(직접)') as source,
           coalesce(w.src->>'utm_medium', '') as medium,
           coalesce(w.src->>'utm_campaign', '(없음)') as campaign
    from class_waitlist w where w.created_at >= p_since and not w.qa
  ),
  ha as (
    select h.*, coalesce(h.src->>'utm_source', h.src->>'ref', '(직접)') as source,
           coalesce(h.src->>'utm_medium', '') as medium,
           coalesce(h.src->>'utm_campaign', '(없음)') as campaign
    from web_host_applications h where h.created_at >= p_since and not h.qa
  ),
  srcs as (
    select source, medium from ev union select source, medium from wl union select source, medium from ha
  ),
  camps as (
    select campaign from ev_all union select campaign from wl union select campaign from ha
  ),
  classes as (
    select class_id from ev where class_id is not null union select class_id from wl
  ),
  days as (
    select distinct (created_at at time zone 'Asia/Seoul')::date as d from ev_all
    union select distinct (created_at at time zone 'Asia/Seoul')::date from wl
    union select distinct (created_at at time zone 'Asia/Seoul')::date from ha
  )
  select jsonb_build_object(
    'updated_at', now(),
    'since', p_since,
    'totals', jsonb_build_object(
      'visitors', (select count(distinct visitor) from ev where name = 'page_view'),
      'clicks', (select count(distinct visitor) from ev where name = 'reserve_click'),
      'signups', (select count(*) from wl),
      'signups_ko', (select count(*) from wl where lang = 'ko'),
      'signups_en', (select count(*) from wl where lang = 'en'),
      'people', (select coalesce(sum(party_size), 0) from wl),
      'hosts', (select count(*) from ha)
    ),
    'host', jsonb_build_object(
      'visitors', (select count(distinct visitor) from evh where name = 'page_view'),
      'visitors_ko', (select count(distinct visitor) from evh where name = 'page_view' and lang = 'ko'),
      'visitors_en', (select count(distinct visitor) from evh where name = 'page_view' and lang = 'en'),
      'applications', (select count(*) from ha),
      'from_host_page', (select count(*) from ha where page = 'host'),
      'by_visa', coalesce((select jsonb_object_agg(k, n) from (select coalesce(visa, '(없음)') k, count(*) n from ha group by 1) t), '{}'::jsonb),
      'by_category', coalesce((select jsonb_object_agg(k, n) from (select coalesce(category, '(없음)') k, count(*) n from ha group by 1) t), '{}'::jsonb)
    ),
    'by_source', coalesce((select jsonb_agg(x order by x->>'visitors' desc) from (
      select jsonb_build_object(
        'source', s.source, 'medium', s.medium,
        'visitors', (select count(distinct visitor) from ev where ev.source = s.source and ev.medium = s.medium and name = 'page_view'),
        'clicks', (select count(distinct visitor) from ev where ev.source = s.source and ev.medium = s.medium and name = 'reserve_click'),
        'signups', (select count(*) from wl where wl.source = s.source and wl.medium = s.medium),
        'hosts', (select count(*) from ha where ha.source = s.source and ha.medium = s.medium)
      ) as x from srcs s) t), '[]'::jsonb),
    'by_campaign', coalesce((select jsonb_agg(x order by x->>'campaign') from (
      select jsonb_build_object(
        'campaign', c.campaign,
        'visitors', (select count(distinct visitor) from ev where ev.campaign = c.campaign and name = 'page_view'),
        'host_visitors', (select count(distinct visitor) from evh where evh.campaign = c.campaign and name = 'page_view'),
        'signups', (select count(*) from wl where wl.campaign = c.campaign),
        'signups_ko', (select count(*) from wl where wl.campaign = c.campaign and lang = 'ko'),
        'signups_en', (select count(*) from wl where wl.campaign = c.campaign and lang = 'en'),
        'hosts', (select count(*) from ha where ha.campaign = c.campaign)
      ) as x from camps c) t), '[]'::jsonb),
    'by_class', coalesce((select jsonb_agg(x order by x->>'class_id') from (
      select jsonb_build_object(
        'class_id', c.class_id,
        'viewers', (select count(distinct visitor) from ev where ev.class_id = c.class_id and name = 'class_view'),
        'clicks', (select count(distinct visitor) from ev where ev.class_id = c.class_id and name = 'reserve_click'),
        'signups', (select count(*) from wl where wl.class_id = c.class_id),
        'people', (select coalesce(sum(party_size), 0) from wl where wl.class_id = c.class_id)
      ) as x from classes c) t), '[]'::jsonb),
    'by_expect', coalesce((select jsonb_object_agg(k, n) from (select coalesce(expect, '(없음)') k, count(*) n from wl group by 1) t), '{}'::jsonb),
    'by_lang', jsonb_build_object(
      'ko', (select count(distinct visitor) from ev where name = 'page_view' and lang = 'ko'),
      'en', (select count(distinct visitor) from ev where name = 'page_view' and lang = 'en')
    ),
    'by_day', coalesce((select jsonb_agg(x order by x->>'day') from (
      select jsonb_build_object(
        'day', d.d,
        'visitors', (select count(distinct visitor) from ev where name = 'page_view' and (created_at at time zone 'Asia/Seoul')::date = d.d),
        'host_visitors', (select count(distinct visitor) from evh where name = 'page_view' and (created_at at time zone 'Asia/Seoul')::date = d.d),
        'signups', (select count(*) from wl where (created_at at time zone 'Asia/Seoul')::date = d.d),
        'hosts', (select count(*) from ha where (created_at at time zone 'Asia/Seoul')::date = d.d)
      ) as x from days d) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
