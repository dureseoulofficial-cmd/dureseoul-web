import type { Metadata } from "next";
import StatsClient from "./StatsClient";

export const metadata: Metadata = {
  title: "현황 | 두레서울",
  robots: { index: false, follow: false },
};

export default function StatsPage() {
  return <StatsClient />;
}
