import type { Metadata } from "next";
import type { Lang } from "@/lib/lang";
import ClassesClient from "./ClassesClient";

const meta = {
  ko: {
    title: "11월 클래스 | 두레서울",
    description: "호스트가 사는 서울 동네에서 열리는 소규모 클래스. 자리를 맡아두면 확정과 결제는 따로 연락드려요.",
    siteName: "두레서울",
    locale: "ko_KR",
  },
  en: {
    title: "November classes | Dureseoul",
    description: "Small classes in the hosts' own Seoul neighborhoods. Hold a spot now and we'll get in touch to confirm and take payment.",
    siteName: "Dureseoul",
    locale: "en_US",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const m = meta[lang];
  const image = { url: `https://www.dureseoul.com/og/classes-${lang}.png`, width: 1200, height: 630, alt: m.title };
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: "https://www.dureseoul.com/classes" },
    openGraph: {
      title: m.title,
      description: m.description,
      url: "https://www.dureseoul.com/classes",
      siteName: m.siteName,
      locale: m.locale,
      type: "website",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: [image.url] },
  };
}

export default async function ClassesPage({ params }: { params: Promise<{ lang: string }> }) {
  return <ClassesClient lang={(await params).lang as Lang} />;
}
