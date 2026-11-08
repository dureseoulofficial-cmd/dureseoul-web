// 새 신청이 들어오면 연결된 카카오 계정들에게 「나에게 보내기」로 알린다.
// DB 트리거(class_alert_post)만 부른다: x-alert-secret 이 vault 의 class_alert_secret 과 같아야 한다.
// {"refresh": true} 는 매주 cron 이 보내는 토큰 유지용. 연락처·이름은 받지도 보내지도 않는다.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { kakaoRefresh } from "../_shared/kakao.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const STATS_URL = "https://www.dureseoul.com/stats";

type Body = {
  refresh?: boolean;
  kind?: "reserve" | "host";
  class_id?: string;
  party_size?: number;
  country?: string;
  lang?: string;
  source?: string;
  total?: number;
};

function message(b: Body): string {
  const via = b.source ? ` · ${b.source}` : "";
  if (b.kind === "host") {
    return `[두레서울] 호스트 지원 1건\n${b.country ?? ""}${via}\n누적 ${b.total ?? "?"}건`;
  }
  return `[두레서울] 자리 맡기 1건\n${b.class_id} · ${b.party_size ?? 1}명 · ${b.lang === "en" ? "영어" : "한국어"}${via}\n누적 ${b.total ?? "?"}건 / 목표 30`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method", { status: 405 });
  const { data: cfg } = await db.rpc("class_alert_config");
  if (!cfg?.class_alert_secret || req.headers.get("x-alert-secret") !== cfg.class_alert_secret) {
    return new Response("forbidden", { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as Body;

  const { data: rows } = await db.from("kakao_alert_tokens").select("*");
  const results: string[] = [];
  for (const row of rows ?? []) {
    try {
      let access = row.access_token as string;
      const soon = Date.now() + 10 * 60 * 1000;
      if (body.refresh || new Date(row.access_expires).getTime() < soon) {
        const t = await kakaoRefresh(row.refresh_token);
        access = t.access_token;
        await db.from("kakao_alert_tokens").update({
          access_token: t.access_token,
          access_expires: new Date(Date.now() + t.expires_in * 1000).toISOString(),
          ...(t.refresh_token
            ? { refresh_token: t.refresh_token, refresh_expires: new Date(Date.now() + (t.refresh_token_expires_in ?? 0) * 1000).toISOString() }
            : {}),
          updated_at: new Date().toISOString(),
        }).eq("kakao_id", row.kakao_id);
      }
      if (body.refresh) {
        results.push(`${row.kakao_id}:refreshed`);
        continue;
      }
      const template = {
        object_type: "text",
        text: message(body).slice(0, 200),
        link: { web_url: STATS_URL, mobile_web_url: STATS_URL },
        button_title: "현황 보기",
      };
      const res = await fetch("https://kapi.kakao.com/v2/api/talk/memo/default/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
        body: new URLSearchParams({ template_object: JSON.stringify(template) }),
      });
      results.push(`${row.kakao_id}:${res.status}`);
      if (!res.ok) console.error("kakao send", row.kakao_id, res.status, await res.text());
    } catch (e) {
      results.push(`${row.kakao_id}:error`);
      console.error("kakao", row.kakao_id, String(e));
    }
  }
  return Response.json({ sent: results });
});
