-- 광고 테스트용 기록 (v0.3.1)
-- 1) web_events 에 'scroll' 이벤트 (props.depth = 25/50/75/100, 페이지 한 번 열 때 단계마다 한 번)
-- 2) class_test_stats: 광고별(utm_campaign × utm_content) 표, 페이지별 스크롤 도달 수

alter table public.web_events drop constraint if exists web_events_name_check;
alter table public.web_events add constraint web_events_name_check
  check (name in ('page_view', 'class_view', 'reserve_click', 'reserve_submit', 'host_submit', 'scroll'));

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
           coalesce(e.src->>'utm_campaign', '(없음)') as campaign,
           coalesce(e.src->>'utm_content', '') as content
    from web_events e
    where e.created_at >= p_since and (e.path like '/classes%' or e.path like '/host%')
      and coalesce((e.props->>'qa')::boolean, false) = false and coalesce((e.props->>'bot')::boolean, false) = false
  ),
  ev as (select * from ev_all where path like '/classes%'),
  evh as (select * from ev_all where path like '/host%'),
  wl as (
    select w.*, coalesce(w.src->>'utm_source', w.src->>'ref', '(직접)') as source,
           coalesce(w.src->>'utm_medium', '') as medium,
           coalesce(w.src->>'utm_campaign', '(없음)') as campaign,
           coalesce(w.src->>'utm_content', '') as content
    from class_waitlist w where w.created_at >= p_since and not w.qa
  ),
  ha as (
    select h.*, coalesce(h.src->>'utm_source', h.src->>'ref', '(직접)') as source,
           coalesce(h.src->>'utm_medium', '') as medium,
           coalesce(h.src->>'utm_campaign', '(없음)') as campaign,
           coalesce(h.src->>'utm_content', '') as content
    from web_host_applications h where h.created_at >= p_since and not h.qa
  ),
  srcs as (
    select source, medium from ev union select source, medium from wl union select source, medium from ha
  ),
  camps as (
    select campaign from ev_all union select campaign from wl union select campaign from ha
  ),
  ads as (
    select campaign, content from ev_all where content <> ''
    union select campaign, content from wl where content <> ''
    union select campaign, content from ha where content <> ''
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
    'scroll', jsonb_build_object(
      'classes', jsonb_build_object(
        'visitors', (select count(distinct visitor) from ev where name = 'page_view'),
        'd25', (select count(distinct visitor) from ev where name = 'scroll' and props->>'depth' = '25'),
        'd50', (select count(distinct visitor) from ev where name = 'scroll' and props->>'depth' = '50'),
        'd75', (select count(distinct visitor) from ev where name = 'scroll' and props->>'depth' = '75'),
        'd100', (select count(distinct visitor) from ev where name = 'scroll' and props->>'depth' = '100')),
      'host', jsonb_build_object(
        'visitors', (select count(distinct visitor) from evh where name = 'page_view'),
        'd25', (select count(distinct visitor) from evh where name = 'scroll' and props->>'depth' = '25'),
        'd50', (select count(distinct visitor) from evh where name = 'scroll' and props->>'depth' = '50'),
        'd75', (select count(distinct visitor) from evh where name = 'scroll' and props->>'depth' = '75'),
        'd100', (select count(distinct visitor) from evh where name = 'scroll' and props->>'depth' = '100'))
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
    'by_ad', coalesce((select jsonb_agg(x order by x->>'campaign', x->>'content') from (
      select jsonb_build_object(
        'campaign', a.campaign, 'content', a.content,
        'visitors', (select count(distinct visitor) from ev_all e where e.campaign = a.campaign and e.content = a.content and name = 'page_view'),
        'scroll50', (select count(distinct visitor) from ev_all e where e.campaign = a.campaign and e.content = a.content and name = 'scroll' and props->>'depth' = '50'),
        'clicks', (select count(distinct visitor) from ev e where e.campaign = a.campaign and e.content = a.content and name = 'reserve_click'),
        'signups', (select count(*) from wl where wl.campaign = a.campaign and wl.content = a.content),
        'hosts', (select count(*) from ha where ha.campaign = a.campaign and ha.content = a.content)
      ) as x from ads a) t), '[]'::jsonb),
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
