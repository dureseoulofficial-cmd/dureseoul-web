"use client";

// 클래스 수요 검증 현황 (내부용). 숫자만 보여주고 이름·연락처는 없다.
// 열쇠는 이 브라우저에만 저장한다. 서버 함수 class_test_stats 가 열쇠를 확인한다.
import { useCallback, useEffect, useState } from "react";
import { classes } from "@/data/classes";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/track";

const KEY = "dure_stats_key";
const GOAL_VISITORS = 300;
const GOAL_SIGNUPS = 30;
const GOAL_HOST_APPS = 10;
const GOAL_HOSTS = 3; // 확정 호스트 = classes.ts 에서 placeholder 가 아닌 카드 수

const VISA_LABEL: Record<string, string> = { other: "기타", unsure: "모름" };
const CATEGORY_LABEL: Record<string, string> = { food: "요리", culture: "문화·공예", language: "언어", other: "기타" };
const EXPECT_LABEL: Record<string, string> = { language: "외국어 대화", food_culture: "음식·문화", friends: "새 사람", other: "기타" };

type Row = { source: string; medium: string; visitors: number; clicks: number; signups: number; hosts: number };
type ClassRow = { class_id: string; viewers: number; clicks: number; signups: number; people: number };
type CampaignRow = { campaign: string; visitors: number; host_visitors: number; signups: number; signups_ko: number; signups_en: number; hosts: number };
type AdRow = { campaign: string; content: string; visitors: number; scroll50: number; clicks: number; signups: number; hosts: number };
type Depth = { visitors: number; d25: number; d50: number; d75: number; d100: number };
type Counts = Record<string, number>;
type Stats = {
  updated_at: string;
  totals: { visitors: number; clicks: number; signups: number; signups_ko: number; signups_en: number; people: number; hosts: number };
  host: { visitors: number; visitors_ko: number; visitors_en: number; applications: number; from_host_page: number; by_visa: Counts; by_category: Counts };
  by_source: Row[];
  by_campaign: CampaignRow[];
  by_ad?: AdRow[];
  scroll?: { classes: Depth; host: Depth };
  by_expect: Counts;
  by_class: ClassRow[];
  by_lang: { ko: number; en: number };
  by_day: { day: string; visitors: number; host_visitors: number; signups: number; hosts: number }[];
};

function readKey() {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function saveKey(v: string) {
  try {
    if (v) localStorage.setItem(KEY, v);
    else localStorage.removeItem(KEY);
  } catch {
    /* 저장 못 해도 이번 화면은 보여준다 */
  }
}

const confirmedHosts = classes.filter((c) => !c.placeholder).length;

/** {"F-2": 3, "unsure": 1} → "F-2 3 · 모름 1" */
function countLine(c: Counts | undefined, label: Record<string, string> = {}) {
  const e = Object.entries(c ?? {}).sort((a, b) => b[1] - a[1]);
  return e.length ? e.map(([k, n]) => `${label[k] ?? k} ${n}`).join(" · ") : "–";
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 1000) / 10}%` : "–");

function classTitle(id: string) {
  const c = classes.find((x) => x.id === id);
  return c && !c.placeholder ? c.title.ko : id;
}

export default function StatsClient() {
  const [key, setKey] = useState("");
  const [input, setInput] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (k: string) => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/class_test_stats`, {
        method: "POST",
        headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ p_key: k }),
      });
      if (res.status === 401 || res.status === 403) {
        saveKey("");
        setKey("");
        setErr("열쇠가 맞지 않아요.");
        return;
      }
      if (!res.ok) throw new Error(String(res.status));
      setStats(await res.json());
      saveKey(k);
      setKey(k);
    } catch {
      setErr("불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const k = readKey();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장된 열쇠로 처음 한 번 불러오기
    if (k) void load(k);
  }, [load]);

  if (!key && !stats) {
    return (
      <main className="min-h-screen bg-[#F1ECE2] text-[#0A0B0E] px-4 py-12">
        <form
          className="mx-auto max-w-sm"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) void load(input.trim());
          }}
        >
          <h1 className="text-[22px] font-bold">클래스 현황</h1>
          <p className="mt-1 text-[14px] text-[#0A0B0E]/65">열쇠를 한 번 넣으면 이 브라우저에서는 다시 묻지 않아요.</p>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-5 w-full rounded-lg border border-[#0A0B0E]/20 bg-white px-3 py-3 text-[16px] font-mono"
            placeholder="열쇠"
          />
          {err && <p className="mt-2 text-[14px] text-[#E8542E]">{err}</p>}
          <button disabled={busy} className="mt-3 w-full rounded-lg bg-[#0A0B0E] py-3 text-[15px] font-bold text-[#F1ECE2] disabled:opacity-50">
            {busy ? "확인 중" : "보기"}
          </button>
        </form>
      </main>
    );
  }

  const t = stats?.totals;
  return (
    <main className="min-h-screen bg-[#F1ECE2] text-[#0A0B0E] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="flex items-baseline justify-between gap-3">
          <h1 className="text-[22px] font-bold">클래스 현황</h1>
          <button onClick={() => void load(key)} disabled={busy} className="text-[14px] underline underline-offset-4 disabled:opacity-50">
            {busy ? "불러오는 중" : "새로고침"}
          </button>
        </header>
        {stats && (
          <p className="mt-1 text-[13px] text-[#0A0B0E]/55">
            {new Date(stats.updated_at).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })} 기준 · 내 기기(?me=1)·봇 제외
          </p>
        )}
        {err && <p className="mt-2 text-[14px] text-[#E8542E]">{err}</p>}

        {t && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Goal label="방문자" value={t.visitors} goal={GOAL_VISITORS} />
              <Goal label="자리 맡기" value={t.signups} goal={GOAL_SIGNUPS} sub={`한국어 화면 ${t.signups_ko} · 영어 화면 ${t.signups_en} · ${t.people}명`} />
              <Tile label="신청 비율" value={pct(t.signups, t.visitors)} sub={`버튼 누름 ${pct(t.clicks, t.visitors)} · 방문 한 ${stats.by_lang.ko} / 영 ${stats.by_lang.en}`} />
              <Goal label="호스트 지원" value={t.hosts} goal={GOAL_HOST_APPS} sub={`확정 ${confirmedHosts} / ${GOAL_HOSTS} · 호스트 페이지 방문 ${stats.host.visitors}`} />
            </section>

            <section className="mt-6 rounded-xl bg-white p-4 text-[14px] leading-[1.9]">
              <p><span className="text-[#0A0B0E]/55">호스트 체류자격</span> {countLine(stats.host.by_visa, VISA_LABEL)}</p>
              <p><span className="text-[#0A0B0E]/55">호스트 분야</span> {countLine(stats.host.by_category, CATEGORY_LABEL)}</p>
              <p><span className="text-[#0A0B0E]/55">손님 기대</span> {countLine(stats.by_expect, EXPECT_LABEL)}</p>
            </section>

            <Table
              title="캠페인별 (utm_campaign)"
              head={["캠페인", "클래스 방문", "호스트 페이지", "신청 한/영", "호스트"]}
              rows={stats.by_campaign.map((r) => [r.campaign, r.visitors, r.host_visitors, `${r.signups_ko} / ${r.signups_en}`, r.hosts])}
            />

            <Table
              title="광고별 (utm_campaign · utm_content)"
              head={["광고", "방문", "절반 이상 봄", "버튼", "신청", "신청 비율", "호스트"]}
              rows={(stats.by_ad ?? []).map((r) => [
                `${r.campaign} · ${r.content}`,
                r.visitors,
                pct(r.scroll50, r.visitors),
                r.clicks,
                r.signups,
                pct(r.signups, r.visitors),
                r.hosts,
              ])}
            />

            {stats.scroll && (
              <Table
                title="어디까지 내려 봤나"
                head={["페이지", "방문", "25%", "50%", "75%", "끝까지"]}
                rows={(
                  [
                    ["/classes", stats.scroll.classes],
                    ["/host", stats.scroll.host],
                  ] as const
                ).map(([name, d]) => [name, d.visitors, pct(d.d25, d.visitors), pct(d.d50, d.visitors), pct(d.d75, d.visitors), pct(d.d100, d.visitors)])}
              />
            )}

            <Table
              title="어디서 왔나"
              head={["경로", "방문", "버튼", "신청", "신청 비율", "호스트"]}
              rows={stats.by_source.map((r) => [
                r.medium ? `${r.source} / ${r.medium}` : r.source,
                r.visitors,
                r.clicks,
                r.signups,
                pct(r.signups, r.visitors),
                r.hosts,
              ])}
            />
            <Table
              title="클래스별"
              head={["클래스", "본 사람", "버튼", "신청", "인원"]}
              rows={stats.by_class.map((r) => [classTitle(r.class_id), r.viewers, r.clicks, r.signups, r.people])}
            />
            <Table
              title="날짜별"
              head={["날짜", "방문", "신청", "호스트 페이지", "호스트"]}
              rows={[...stats.by_day].reverse().map((r) => [r.day.slice(5), r.visitors, r.signups, r.host_visitors, r.hosts])}
            />
          </>
        )}
      </div>
    </main>
  );
}

function Goal({ label, value, goal, sub }: { label: string; value: number; goal: number; sub?: string }) {
  const w = Math.min(100, (value / goal) * 100);
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-[13px] text-[#0A0B0E]/60">{label}</p>
      <p className="mt-1 text-[26px] font-bold tabular-nums leading-none">
        {value}
        <span className="ml-1 text-[14px] font-normal text-[#0A0B0E]/45">/ {goal}</span>
      </p>
      <div className="mt-3 h-1.5 rounded-full bg-[#0A0B0E]/10">
        <div className="h-1.5 rounded-full bg-[#E8542E]" style={{ width: `${w}%` }} />
      </div>
      {sub && <p className="mt-2 text-[12px] text-[#0A0B0E]/55">{sub}</p>}
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <p className="text-[13px] text-[#0A0B0E]/60">{label}</p>
      <p className="mt-1 text-[26px] font-bold tabular-nums leading-none">{value}</p>
      {sub && <p className="mt-3 text-[12px] text-[#0A0B0E]/55">{sub}</p>}
    </div>
  );
}

function Table({ title, head, rows }: { title: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <section className="mt-8">
      <h2 className="text-[16px] font-bold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 text-[14px] text-[#0A0B0E]/55">아직 기록이 없어요.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-xl bg-white">
          <table className="w-full min-w-[420px] text-[14px]">
            <thead>
              <tr className="text-left text-[12px] text-[#0A0B0E]/55">
                {head.map((h, i) => (
                  <th key={h} className={`px-3 py-2 font-normal ${i ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, j) => (
                <tr key={j} className="border-t border-[#0A0B0E]/8">
                  {r.map((c, i) => (
                    <td key={i} className={`px-3 py-2 ${i ? "text-right tabular-nums" : "break-all"}`}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
