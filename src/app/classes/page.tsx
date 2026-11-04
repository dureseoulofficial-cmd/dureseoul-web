import type { Metadata } from "next";
import ClassesClient from "./ClassesClient";

export const metadata: Metadata = {
  title: "클래스 | 두레서울",
  description: "서울에 사는 호스트가 여는 소규모 클래스. 자리를 맡아두면 확정과 결제는 따로 연락드려요.",
  alternates: { canonical: "https://www.dureseoul.com/classes" },
};

export default function ClassesPage() {
  return <ClassesClient />;
}
