import type { Metadata } from "next";
import ClassesClient from "./ClassesClient";

export const metadata: Metadata = {
  title: "11월 클래스 | 두레서울",
  description: "호스트가 사는 서울 동네에서 열리는 소규모 클래스. 자리를 맡아두면 확정과 결제는 따로 연락드려요.",
  alternates: { canonical: "https://www.dureseoul.com/classes" },
  openGraph: {
    title: "11월 클래스 | 두레서울",
    description: "호스트가 사는 서울 동네에서 열리는 소규모 클래스. 자리를 맡아두면 확정과 결제는 따로 연락드려요.",
    url: "https://www.dureseoul.com/classes",
    siteName: "두레서울",
    type: "website",
  },
};

export default function ClassesPage() {
  return <ClassesClient />;
}
