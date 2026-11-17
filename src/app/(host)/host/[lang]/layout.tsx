import "../../../globals.css";
import SourceCapture from "@/components/SourceCapture";
import type { Lang } from "@/lib/lang";

// /host 전용 최상위 레이아웃. <html lang> 을 언어에 맞춘다 (src/proxy.ts 가 /host → /host/ko|en)
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ lang: "ko" }, { lang: "en" }];
}

export default async function HostLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const lang = (await params).lang as Lang;
  return (
    <html lang={lang}>
      <body>
        <SourceCapture lang={lang} />
        {children}
      </body>
    </html>
  );
}
