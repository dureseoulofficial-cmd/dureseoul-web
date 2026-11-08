import "../../../globals.css";
import SourceCapture from "@/components/SourceCapture";
import type { Lang } from "@/lib/lang";

// /classes 전용 최상위 레이아웃. <html lang> 을 언어에 맞춘다 (회사 홈페이지 쪽은 (site)/layout.tsx).
export const dynamicParams = false;
export function generateStaticParams() {
  return [{ lang: "ko" }, { lang: "en" }];
}

export default async function ClassesLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
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
