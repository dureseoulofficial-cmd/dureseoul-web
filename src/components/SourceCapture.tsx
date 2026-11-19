"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureSource, track } from "@/lib/track";
import { detectLang, type Lang } from "@/lib/lang";

const DEPTHS = [25, 50, 75, 100] as const;

/** 모든 페이지: 첫 유입 utm/ref 저장 + page_view. lang 을 주면(/classes) 그 언어로 기록 */
export default function SourceCapture({ lang }: { lang?: Lang }) {
  const pathname = usePathname();
  useEffect(() => {
    captureSource();
    track("page_view", { lang: lang ?? detectLang() });
  }, [pathname, lang]);

  // /classes · /host 만: 페이지를 어디까지 내려 봤는지 (25/50/75/100%, 한 번 열 때 단계마다 한 번)
  useEffect(() => {
    if (!/^\/(classes|host)/.test(pathname)) return;
    const sent = new Set<number>();
    let frame = 0;
    const check = () => {
      frame = 0;
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      const p = max <= 0 ? 100 : (window.scrollY / max) * 100;
      for (const d of DEPTHS) {
        if (p >= d - 1 && !sent.has(d)) {
          sent.add(d);
          track("scroll", { lang: lang ?? detectLang(), depth: d });
        }
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname, lang]);

  return null;
}
