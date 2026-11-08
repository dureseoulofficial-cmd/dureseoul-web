"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureSource, track } from "@/lib/track";
import { detectLang, type Lang } from "@/lib/lang";

/** 모든 페이지: 첫 유입 utm/ref 저장 + page_view. lang 을 주면(/classes) 그 언어로 기록 */
export default function SourceCapture({ lang }: { lang?: Lang }) {
  const pathname = usePathname();
  useEffect(() => {
    captureSource();
    track("page_view", { lang: lang ?? detectLang() });
  }, [pathname, lang]);
  return null;
}
