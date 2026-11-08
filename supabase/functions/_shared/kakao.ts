// 카카오 REST API 키(KAKAO_REST_KEY)와 선택 클라이언트 시크릿(KAKAO_CLIENT_SECRET)은
// Supabase 대시보드 Edge Functions → Secrets 에 사람이 직접 넣는다. 코드·git 에는 없다.
export type KakaoToken = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

export const REDIRECT_URI = "https://wsgcrkyulgdpvukkviwa.supabase.co/functions/v1/kakao-connect";

export function restKey(): string | undefined {
  return Deno.env.get("KAKAO_REST_KEY") || undefined;
}

async function tokenCall(params: Record<string, string>): Promise<KakaoToken> {
  const key = restKey();
  if (!key) throw new Error("KAKAO_REST_KEY 없음");
  const secret = Deno.env.get("KAKAO_CLIENT_SECRET");
  const res = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({ client_id: key, ...(secret ? { client_secret: secret } : {}), ...params }),
  });
  const j = await res.json();
  if (!res.ok || !j.access_token) throw new Error(`token ${res.status} ${j.error_code ?? j.error ?? ""}`);
  return j as KakaoToken;
}

export function kakaoExchange(code: string) {
  return tokenCall({ grant_type: "authorization_code", redirect_uri: REDIRECT_URI, code });
}

export function kakaoRefresh(refreshToken: string) {
  return tokenCall({ grant_type: "refresh_token", refresh_token: refreshToken });
}
