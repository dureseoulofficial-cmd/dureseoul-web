"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureSource, track } from "@/lib/track";
import { detectLang } from "@/lib/lang";

/** 모든 페이지: 첫 유입 utm/ref 저장 + page_view */
export default function SourceCapture() {
  const pathname = usePathname();
  useEffect(() => {
    captureSource();
    track("page_view", { lang: detectLang() });
  }, [pathname]);
  return null;
}
