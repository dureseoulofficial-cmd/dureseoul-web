-- 클래스 수요 검증 v0.2.2: 테스트 표시, 현황 집계(/stats), 새 신청 카톡 알림.
-- 비밀값 3개는 vault 에 무작위로 만들고 git 에는 남기지 않는다.
--   class_stats_key   /stats 화면 열쇠
--   class_alert_secret DB → 알림 함수(class-alert) 호출 확인용
--   kakao_connect_key  카톡 연결 링크(kakao-connect) 확인용

-- 1) 내 기기·자동 검사로 넣은 신청 표시 (web_events.props.qa 와 같은 뜻)
alter table public.class_waitlist add column qa boolean not null default false;
alter table public.web_host_applications add column qa boolean not null default false;
grant insert (qa) on public.class_waitlist, public.web_host_applications to anon, authenticated;

-- 2) 비밀값
do $$
declare n text;
begin
  foreach n in array array['class_stats_key', 'class_alert_secret', 'kakao_connect_key'] loop
    if not exists (select 1 from vault.secrets where name = n) then
      perform vault.create_secret(encode(extensions.gen_random_bytes(18), 'hex'), n);
    end if;
  end loop;
end $$;

-- 3) 현황 집계. 이름·연락처는 내보내지 않고 숫자만. 열쇠가 맞아야 돌려준다.
create function public.class_test_stats(p_key text, p_since timestamptz default '2026-11-01')
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  r jsonb;
begin
  if p_key is null or p_key is distinct from (select decrypted_secret from vault.decrypted_secrets where name = 'class_stats_key') then
    perform pg_sleep(1);
    raise exception 'forbidden' using errcode = '42501';
  end if;

  with ev as (
    select e.*, coalesce(e.src->>'utm_source', e.src->>'ref', '(직접)') as source,
           coalesce(e.src->>'utm_medium', '') as medium
    from web_events e
    where e.created_at >= p_since and e.path like '/classes%'
      and coalesce((e.props->>'qa')::boolean, false) = false and coalesce((e.props->>'bot')::boolean, false) = false
  ),
  wl as (
    select w.*, coalesce(w.src->>'utm_source', w.src->>'ref', '(직접)') as source,
           coalesce(w.src->>'utm_medium', '') as medium
    from class_waitlist w where w.created_at >= p_since and not w.qa
  ),
  ha as (
    select h.*, coalesce(h.src->>'utm_source', h.src->>'ref', '(직접)') as source,
           coalesce(h.src->>'utm_medium', '') as medium
    from web_host_applications h where h.created_at >= p_since and not h.qa
  ),
  srcs as (
    select source, medium from ev union select source, medium from wl union select source, medium from ha
  ),
  classes as (
    select class_id from ev where class_id is not null union select class_id from wl
  ),
  days as (
    select distinct (created_at at time zone 'Asia/Seoul')::date as d from ev
    union select distinct (created_at at time zone 'Asia/Seoul')::date from wl
  )
  select jsonb_build_object(
    'updated_at', now(),
    'since', p_since,
    'totals', jsonb_build_object(
      'visitors', (select count(distinct visitor) from ev where name = 'page_view'),
      'clicks', (select count(distinct visitor) from ev where name = 'reserve_click'),
      'signups', (select count(*) from wl),
      'people', (select coalesce(sum(party_size), 0) from wl),
      'hosts', (select count(*) from ha)
    ),
    'by_source', coalesce((select jsonb_agg(x order by x->>'visitors' desc) from (
      select jsonb_build_object(
        'source', s.source, 'medium', s.medium,
        'visitors', (select count(distinct visitor) from ev where ev.source = s.source and ev.medium = s.medium and name = 'page_view'),
        'clicks', (select count(distinct visitor) from ev where ev.source = s.source and ev.medium = s.medium and name = 'reserve_click'),
        'signups', (select count(*) from wl where wl.source = s.source and wl.medium = s.medium),
        'hosts', (select count(*) from ha where ha.source = s.source and ha.medium = s.medium)
      ) as x from srcs s) t), '[]'::jsonb),
    'by_class', coalesce((select jsonb_agg(x order by x->>'class_id') from (
      select jsonb_build_object(
        'class_id', c.class_id,
        'viewers', (select count(distinct visitor) from ev where ev.class_id = c.class_id and name = 'class_view'),
        'clicks', (select count(distinct visitor) from ev where ev.class_id = c.class_id and name = 'reserve_click'),
        'signups', (select count(*) from wl where wl.class_id = c.class_id),
        'people', (select coalesce(sum(party_size), 0) from wl where wl.class_id = c.class_id)
      ) as x from classes c) t), '[]'::jsonb),
    'by_lang', jsonb_build_object(
      'ko', (select count(distinct visitor) from ev where name = 'page_view' and lang = 'ko'),
      'en', (select count(distinct visitor) from ev where name = 'page_view' and lang = 'en')
    ),
    'by_day', coalesce((select jsonb_agg(x order by x->>'day') from (
      select jsonb_build_object(
        'day', d.d,
        'visitors', (select count(distinct visitor) from ev where name = 'page_view' and (created_at at time zone 'Asia/Seoul')::date = d.d),
        'signups', (select count(*) from wl where (created_at at time zone 'Asia/Seoul')::date = d.d)
      ) as x from days d) t), '[]'::jsonb)
  ) into r;
  return r;
end $$;
revoke all on function public.class_test_stats(text, timestamptz) from public;
grant execute on function public.class_test_stats(text, timestamptz) to anon, authenticated;

-- 4) 카톡 알림 받을 계정 (카카오 「나에게 보내기」). 알림 함수만 읽고 쓴다.
create table public.kakao_alert_tokens (
  kakao_id         bigint primary key,
  nickname         text,
  access_token     text not null,
  access_expires   timestamptz not null,
  refresh_token    text not null,
  refresh_expires  timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.kakao_alert_tokens enable row level security;
revoke all on public.kakao_alert_tokens from anon, authenticated;

-- 알림 함수가 비밀값을 읽는 통로 (service_role 만)
create function public.class_alert_config() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_object_agg(name, decrypted_secret) from vault.decrypted_secrets
  where name in ('class_alert_secret', 'kakao_connect_key', 'class_stats_key');
$$;
revoke all on function public.class_alert_config() from public, anon, authenticated;
grant execute on function public.class_alert_config() to service_role;

-- 5) 새 신청 → class-alert 함수 호출. 알림이 실패해도 신청 저장은 그대로 된다.
create function public.class_alert_post(p_body jsonb) returns void
language plpgsql security definer set search_path = public as $$
begin
  perform net.http_post(
    url := 'https://wsgcrkyulgdpvukkviwa.supabase.co/functions/v1/class-alert',
    body := p_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-alert-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'class_alert_secret')),
    timeout_milliseconds := 8000);
exception when others then
  raise warning 'class_alert_post failed: %', sqlerrm;
end $$;
revoke all on function public.class_alert_post(jsonb) from public, anon, authenticated;

create function public.class_waitlist_alert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.qa then
    perform class_alert_post(jsonb_build_object(
      'kind', 'reserve',
      'class_id', new.class_id,
      'party_size', new.party_size,
      'lang', new.lang,
      'source', coalesce(new.src->>'utm_source', new.src->>'ref', '직접'),
      'total', (select count(*) from class_waitlist where not qa)));
  end if;
  return null;
end $$;
create trigger class_waitlist_alert after insert on public.class_waitlist
  for each row execute function public.class_waitlist_alert();

create function public.web_host_applications_alert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.qa then
    perform class_alert_post(jsonb_build_object(
      'kind', 'host',
      'country', left(new.country, 30),
      'lang', new.lang,
      'source', coalesce(new.src->>'utm_source', new.src->>'ref', '직접'),
      'total', (select count(*) from web_host_applications where not qa)));
  end if;
  return null;
end $$;
create trigger web_host_applications_alert after insert on public.web_host_applications
  for each row execute function public.web_host_applications_alert();

revoke all on function public.class_waitlist_alert(), public.web_host_applications_alert() from public, anon, authenticated;

-- 6) 카카오 토큰 유지: 신청이 오래 없어도 갱신 토큰(2개월)이 끊기지 않게 매주 월요일 새로 받는다
select cron.schedule('class-alert-refresh', '0 18 * * 0', $$ select public.class_alert_post('{"refresh": true}'::jsonb) $$);
