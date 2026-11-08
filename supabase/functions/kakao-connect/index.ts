// 카톡 알림 받을 계정 연결. 브라우저에서 연다.
//   1) .../kakao-connect?k=<kakao_connect_key>  → 카카오 로그인으로 보냄 (state = 같은 열쇠)
//   2) 카카오가 ?code=..&state=.. 로 돌려보냄 → 토큰 저장, 확인 메시지 한 통 보냄
// 열쇠가 없으면 아무도 연결할 수 없다 (모르는 사람이 알림을 받아가지 않게).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { kakaoExchange, REDIRECT_URI, restKey } from "../_shared/kakao.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

function page(title: string, line: string, status = 200) {
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="margin:0;background:#F1ECE2;color:#0A0B0E;font:16px/1.6 system-ui,sans-serif"><main style="max-width:420px;margin:0 auto;padding:48px 20px"><h1 style="font-size:22px;margin:0 0 8px">${title}</h1><p style="margin:0;color:#0A0B0Ea6">${line}</p></main></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const { data: cfg } = await db.rpc("class_alert_config");
  const connectKey: string | undefined = cfg?.kakao_connect_key;
  const k = url.searchParams.get("k");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!restKey()) return page("준비 안 됨", "Supabase에 KAKAO_REST_KEY가 아직 없어요.", 503);

  if (k) {
    if (!connectKey || k !== connectKey) return page("링크가 맞지 않아요", "연결 링크를 다시 확인해 주세요.", 403);
    const auth = new URL("https://kauth.kakao.com/oauth/authorize");
    auth.search = new URLSearchParams({
      client_id: restKey()!,
      redirect_uri: REDIRECT_URI,
      response_type: "code",
      scope: "talk_message",
      state: k,
    }).toString();
    return Response.redirect(auth.toString(), 302);
  }

  if (url.searchParams.get("error")) {
    return page("연결 안 됨", `카카오: ${url.searchParams.get("error_description") ?? url.searchParams.get("error")}`.slice(0, 200), 400);
  }

  if (code) {
    if (!connectKey || state !== connectKey) return page("링크가 맞지 않아요", "처음 링크부터 다시 열어 주세요.", 403);
    try {
      const t = await kakaoExchange(code);
      const me = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
      if (!me?.id) throw new Error("user/me");
      const { error } = await db.from("kakao_alert_tokens").upsert({
        kakao_id: me.id,
        nickname: me.properties?.nickname ?? null,
        access_token: t.access_token,
        access_expires: new Date(Date.now() + t.expires_in * 1000).toISOString(),
        refresh_token: t.refresh_token!,
        refresh_expires: new Date(Date.now() + (t.refresh_token_expires_in ?? 0) * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      });
      if (error) throw new Error(error.message);
      const template = {
        object_type: "text",
        text: "[두레서울] 알림 연결됐어요. 새 신청이 들어오면 여기로 알려드려요.",
        link: { web_url: "https://www.dureseoul.com/stats", mobile_web_url: "https://www.dureseoul.com/stats" },
        button_title: "현황 보기",
      };
      const sent = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${t.access_token}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams({ template_object: JSON.stringify(template) }),
      });
      if (!sent.ok) {
        const why = await sent.text();
        console.error("kakao test send", sent.status, why);
        return page("연결은 됐는데 메시지가 안 가요", `카카오 응답 ${sent.status}. 앱 설정의 「카카오톡 메시지 전송」 동의 항목과 Web 도메인(www.dureseoul.com)을 확인해 주세요.`, 200);
      }
      return page("연결됐어요", "카톡 「나와의 채팅」에 확인 메시지를 보냈어요. 이 창은 닫아도 돼요.");
    } catch (e) {
      console.error("kakao connect", String(e));
      return page("연결 안 됨", "토큰을 받지 못했어요. 처음 링크부터 다시 열어 주세요.", 500);
    }
  }

  return page("두레서울 알림", "연결 링크로 열어 주세요.", 400);
});
