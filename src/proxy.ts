import { NextResponse, type NextRequest } from "next/server";

// /classes 를 언어별 정적 페이지(/classes/ko, /classes/en)로 보여준다. 주소창은 /classes 그대로.
// 처음 받는 HTML부터 그 언어라서 크롬 번역 제안·탭 제목이 맞게 나온다.
// ?lang=ko|en 이 있으면 그것, 없으면 브라우저 첫 언어(Accept-Language)가 한국어일 때만 ko.
export function proxy(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("lang");
  const first = (request.headers.get("accept-language") ?? "ko").split(",")[0].trim().toLowerCase();
  const lang = q === "ko" || q === "en" ? q : first.startsWith("ko") ? "ko" : "en";
  const url = request.nextUrl.clone();
  url.pathname = `/classes/${lang}`;
  const res = NextResponse.rewrite(url);
  res.headers.set("Vary", "Accept-Language");
  return res;
}

export const config = {
  matcher: "/classes",
};
