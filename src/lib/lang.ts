export type Lang = "ko" | "en";

/** 화면 언어: ?lang=ko|en 이 있으면 그것, 아니면 브라우저 첫 언어. 서버에서는 ko. */
export function detectLang(): Lang {
  if (typeof window === "undefined") return "ko";
  const q = new URLSearchParams(window.location.search).get("lang");
  if (q === "ko" || q === "en") return q;
  return (navigator.languages?.[0] ?? navigator.language ?? "ko").toLowerCase().startsWith("ko") ? "ko" : "en";
}
