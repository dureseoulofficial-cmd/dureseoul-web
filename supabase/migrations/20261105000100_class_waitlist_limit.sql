-- 클래스 자리 맡기: 전체 시간당 상한 60 -> 200.
-- 광고나 인스타 게시 직후 신청이 몰릴 때 실제 신청자가 막히지 않게 한다.
-- 연락처별 5건/시간은 그대로 둔다 (같은 클래스 중복은 이미 무시).
create or replace function public.class_waitlist_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.name := btrim(new.name);
  new.contact := case when position('@' in new.contact) > 0
                      then lower(btrim(new.contact))
                      else regexp_replace(new.contact, '[[:space:]().-]', '', 'g') end;
  new.heard_from := nullif(btrim(coalesce(new.heard_from, '')), '');
  new.created_at := now();
  if exists (select 1 from class_waitlist where class_id = new.class_id and contact = new.contact) then
    return null;
  end if;
  if (select count(*) from class_waitlist where contact = new.contact and created_at > now() - interval '1 hour') >= 5
     or (select count(*) from class_waitlist where created_at > now() - interval '1 hour') >= 200 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end $$;
revoke all on function public.class_waitlist_guard() from public, anon, authenticated;
