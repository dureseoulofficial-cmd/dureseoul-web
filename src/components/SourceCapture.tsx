"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureSource, track } from "@/lib/track";

/** 모든 페이지: 첫 유입 utm/ref 저장 + page_view */
export default function SourceCapture() {
  const pathname = usePathname();
  useEffect(() => {
    captureSource();
    const lang = navigator.language?.toLowerCase().startsWith("ko") ? "ko" : "en";
    track("page_view", { lang });
  }, [pathname]);
  return null;
}
