import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google";
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Dureseoul | 두레서울",
  description: "두레서울 — 옛 두레의 품앗이를, 메가시티 서울에서 세계를 잇는 소프트웨어로.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={`${interTight.variable}`}>
      <body>{children}</body>
    </html>
  );
}
