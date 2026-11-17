import type { Metadata } from "next";
import type { Lang } from "@/lib/lang";
import HostClient from "./HostClient";

const meta = {
  en: {
    title: "Host a class in Seoul | Dureseoul",
    description: "Live in Seoul? Teach a dish, a craft or your language. We set up your first three classes with you: rehearsal, venue, guests, no commission.",
    siteName: "Dureseoul",
    locale: "en_US",
  },
  ko: {
    title: "서울에서 클래스 열기 | 두레서울",
    description: "서울에 사는 외국인 호스트의 첫 클래스 3번을 두레서울이 같이 준비해요. 리허설, 공간, 손님 모으기, 수수료 없음.",
    siteName: "두레서울",
    locale: "ko_KR",
  },
} as const;

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const lang = (await params).lang as Lang;
  const m = meta[lang];
  const image = { url: `https://www.dureseoul.com/og/host-${lang}.png`, width: 1200, height: 630, alt: m.title };
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: "https://www.dureseoul.com/host" },
    openGraph: {
      title: m.title,
      description: m.description,
      url: "https://www.dureseoul.com/host",
      siteName: m.siteName,
      locale: m.locale,
      type: "website",
      images: [image],
    },
    twitter: { card: "summary_large_image", title: m.title, description: m.description, images: [image.url] },
  };
}

export default async function HostPage({ params }: { params: Promise<{ lang: string }> }) {
  return <HostClient lang={(await params).lang as Lang} />;
}
