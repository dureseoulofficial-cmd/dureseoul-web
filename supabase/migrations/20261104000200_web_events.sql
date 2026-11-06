-- 클래스 수요 검증용 웹 이벤트
-- 이벤트는 다섯 개만: page_view, class_view, reserve_click, reserve_submit, host_submit
-- src = 첫 유입 utm/ref, props.qa = 내 기기·자동 검사·봇. 개인정보(이름·연락처)는 넣지 않는다.
create table public.web_events (
  id         bigint generated always as identity primary key,
  name       text        not null check (name in ('page_view', 'class_view', 'reserve_click', 'reserve_submit', 'host_submit')),
  class_id   text        check (class_id is null or class_id ~ '^[a-z0-9-]{1,40}$'),
  path       text        check (path is null or char_length(path) <= 200),
  visitor    text        check (visitor is null or visitor ~ '^[a-z0-9-]{8,40}$'),   -- 브라우저마다 무작위 id
  src        jsonb       check (src is null or (jsonb_typeof(src) = 'object' and length(src::text) <= 600)),
  props      jsonb       not null default '{}' check (jsonb_typeof(props) = 'object' and length(props::text) <= 600),
  lang       text        check (lang is null or lang in ('ko', 'en')),
  created_at timestamptz not null default now()
);
create index web_events_created on public.web_events (created_at);
create index web_events_name on public.web_events (name, created_at);

create function public.web_events_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.created_at := now();
  -- 폭주 방지: 시간당 전체 3000건을 넘으면 조용히 버린다
  if (select count(*) from web_events where created_at > now() - interval '1 hour') >= 3000 then
    return null;
  end if;
  return new;
end $$;
create trigger web_events_guard before insert on public.web_events
  for each row execute function public.web_events_guard();

alter table public.web_events enable row level security;
revoke all on public.web_events from anon, authenticated;
grant insert (name, class_id, path, visitor, src, props, lang) on public.web_events to anon, authenticated;
create policy insert_only on public.web_events for insert to anon, authenticated with check (true);
revoke all on function public.web_events_guard() from public, anon, authenticated;
