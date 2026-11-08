# /classes 신청 카톡 알림 · /stats 현황

새 「자리 맡기」·「호스트 지원」이 들어오면 연결된 카카오 계정의 「나와의 채팅」으로 알림이 간다.
알림에는 클래스 id·인원·언어·유입 경로·누적 건수만 담고 이름·연락처는 넣지 않는다. `?me=1` 기기에서 넣은 신청(qa)은 알리지 않는다.

흐름: `class_waitlist` / `web_host_applications` INSERT → 트리거 → `class_alert_post()`(pg_net) → Edge Function `class-alert` → 카카오 「나에게 보내기」 API.
매주 월 03:00(KST) cron 이 토큰을 새로 받아 둔다(신청이 오래 없어도 끊기지 않게).

## 처음 한 번 (사람이 할 일)

1. https://developers.kakao.com → 내 애플리케이션 → 앱 만들기 (이름 예: 두레서울 알림)
2. 앱 키의 **REST API 키** 복사
3. 플랫폼 → Web 사이트 도메인에 `https://www.dureseoul.com`
4. 카카오 로그인 켜기, Redirect URI 에
   `https://wsgcrkyulgdpvukkviwa.supabase.co/functions/v1/kakao-connect`
5. 동의항목 → **카카오톡 메시지 전송**(talk_message) 을 선택 동의로
6. 보안 → Client Secret 을 켜 두었다면 그 값도 복사
7. Supabase 대시보드 → Edge Functions → Secrets 에
   `KAKAO_REST_KEY` (2번 값), 필요하면 `KAKAO_CLIENT_SECRET` (6번 값)
8. 폰에서 연결 링크(`.../kakao-connect?k=<열쇠>`)를 열고 카카오 로그인·동의 → 「나와의 채팅」에 확인 메시지가 오면 끝
   - 열쇠는 vault `kakao_connect_key`. 여러 사람이 각자 연결하면 모두에게 간다.

## /stats

`https://www.dureseoul.com/stats` (검색 노출 안 함). 열쇠(vault `class_stats_key`)를 한 번 넣으면 그 브라우저가 기억한다.
DB 함수 `class_test_stats(key)` 가 숫자만 돌려준다. 내 기기(`?me=1`)·봇 기록은 빠진다.

## 열쇠 바꾸기

```sql
select vault.update_secret(id, encode(extensions.gen_random_bytes(18), 'hex')) from vault.secrets where name = 'class_stats_key';
```
(`kakao_connect_key`, `class_alert_secret` 도 같은 방법. 바꾸면 기존 링크·브라우저 저장값은 더 이상 안 된다.)
