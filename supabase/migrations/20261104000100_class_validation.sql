-- 클래스 수요 검증 (2026-11, 2주): dureseoul.com/classes 의 「자리 맡아두기」와 「호스트로 클래스 열기」.
-- 앱(dureseoul-app)의 마이그레이션과 별개. 앱의 host_applications(로그인 사용자 심사용)와 이름이 겹치지 않게
-- 웹 신청은 web_host_applications 로 둔다.
-- anon 은 INSERT 만 한다(SELECT·UPDATE·DELETE 없음). 형식·길이는 CHECK, 정리·중복·시간당 제한은 트리거.
-- 보관: 검증 종료 후 3개월 안에 삭제 (개인정보처리방침 /privacy 에 적음).

-- 1) 클래스 자리 맡기
create table public.class_waitlist (
  id          bigint generated always as identity primary key,
  class_id    text        not null check (class_id ~ '^[a-z0-9-]{1,40}$'),
  name        text        not null check (char_length(name) between 1 and 40),
  contact     text        not null check (char_length(contact) <= 80 and (
                 contact ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'   -- 이메일
              or contact ~  '^\+?[0-9]{9,15}$')),                          -- 휴대폰(숫자만, 국가번호 허용)
  party_size  smallint    not null check (party_size between 1 and 2),
  heard_from  text        check (heard_from is null or char_length(heard_from) <= 100),
  src         jsonb       check (src is null or (jsonb_typeof(src) = 'object' and length(src::text) <= 600)),
  lang        text        not null default 'ko' check (lang in ('ko', 'en')),
  created_at  timestamptz not null default now()
);
create unique index class_waitlist_once on public.class_waitlist (class_id, contact);
create index class_waitlist_created on public.class_waitlist (created_at);

create function public.class_waitlist_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.name := btrim(new.name);
  new.contact := case when position('@' in new.contact) > 0
                      then lower(btrim(new.contact))
                      else regexp_replace(new.contact, '[[:space:]().-]', '', 'g') end;
  new.heard_from := nullif(btrim(coalesce(new.heard_from, '')), '');
  new.created_at := now();
  -- 같은 연락처 + 같은 클래스는 조용히 무시 (에러 없이 성공처럼)
  if exists (select 1 from class_waitlist where class_id = new.class_id and contact = new.contact) then
    return null;
  end if;
  -- 시간당 제한: 같은 연락처 5건, 전체 60건
  if (select count(*) from class_waitlist where contact = new.contact and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from class_waitlist where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger class_waitlist_guard before insert on public.class_waitlist
  for each row execute function public.class_waitlist_guard();

-- 2) 호스트 관심 신청 (웹)
create table public.web_host_applications (
  id          bigint generated always as identity primary key,
  email       text        not null check (char_length(email) <= 80 and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[a-z]{2,}$'),
  country     text        not null check (char_length(country) between 1 and 60),
  idea        text        not null check (char_length(idea) between 1 and 200),
  src         jsonb       check (src is null or (jsonb_typeof(src) = 'object' and length(src::text) <= 600)),
  lang        text        not null default 'ko' check (lang in ('ko', 'en')),
  created_at  timestamptz not null default now()
);
create index web_host_applications_created on public.web_host_applications (created_at);

create function public.web_host_applications_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := lower(btrim(new.email));
  new.country := btrim(new.country);
  new.idea := btrim(new.idea);
  new.created_at := now();
  -- 같은 이메일 + 같은 내용은 무시
  if exists (select 1 from web_host_applications where email = new.email and idea = new.idea) then
    return null;
  end if;
  -- 시간당 제한: 같은 이메일 3건, 전체 30건
  if (select count(*) from web_host_applications where email = new.email and created_at > now() - interval '1 hour') >= 3
     or (select count(*) from web_host_applications where created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
create trigger web_host_applications_guard before insert on public.web_host_applications
  for each row execute function public.web_host_applications_guard();

-- 3) 권한: anon·authenticated 는 정해진 컬럼 INSERT 만
alter table public.class_waitlist enable row level security;
alter table public.web_host_applications enable row level security;
revoke all on public.class_waitlist, public.web_host_applications from anon, authenticated;
grant insert (class_id, name, contact, party_size, heard_from, src, lang) on public.class_waitlist to anon, authenticated;
grant insert (email, country, idea, src, lang) on public.web_host_applications to anon, authenticated;
create policy insert_only on public.class_waitlist for insert to anon, authenticated with check (true);
create policy insert_only on public.web_host_applications for insert to anon, authenticated with check (true);
revoke all on function public.class_waitlist_guard(), public.web_host_applications_guard() from public, anon, authenticated;
