// 클래스 수요 검증용 유입 경로·이벤트 기록 (Supabase 프로젝트 Dureseoul, 공개 키 + insert-only 테이블)
// 공개(publishable) 키라 코드에 있어도 된다. 테이블 권한은 INSERT 뿐이다.
const SUPABASE_URL = "https://wsgcrkyulgdpvukkviwa.supabase.co";
const SUPABASE_KEY = "sb_publishable_1MQaAP1B5hW-xec40i7gYQ_tz0yzX5u";

const SRC_KEY = "dure_src";
const QA_KEY = "dure_qa";
const VISITOR_KEY = "dure_vid";
const SRC_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"] as const;

export type EventName = "page_view" | "class_view" | "reserve_click" | "reserve_submit" | "host_submit";
export type Src = Partial<Record<(typeof SRC_PARAMS)[number], string>>;

function store(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

function read(key: string): string | null {
  try {
    return store()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function write(key: string, value: string | null) {
  try {
    if (value === null) store()?.removeItem(key);
    else store()?.setItem(key, value);
  } catch {
    /* 사생활 보호 모드 등: 기록 없이 계속 */
  }
}

/** 첫 유입의 utm/ref 를 한 번만 저장한다. 이미 있으면 덮어쓰지 않는다. ?me=1 이면 이 기기를 내부 사용자로 표시. */
export function captureSource() {
  if (typeof window === "undefined") return;
  const q = new URLSearchParams(window.location.search);
  if (q.get("me") === "1") write(QA_KEY, "1");
  if (q.get("me") === "0") write(QA_KEY, null);
  if (read(SRC_KEY)) return;
  const src: Src = {};
  for (const k of SRC_PARAMS) {
    const v = q.get(k)?.trim();
    if (v) src[k] = v.slice(0, 100);
  }
  if (Object.keys(src).length) write(SRC_KEY, JSON.stringify(src));
}

export function getSrc(): Src | undefined {
  const raw = read(SRC_KEY);
  if (!raw) return undefined;
  try {
    const v = JSON.parse(raw);
    return v && typeof v === "object" && Object.keys(v).length ? (v as Src) : undefined;
  } catch {
    return undefined;
  }
}

/** 헤드리스 브라우저·자동화 도구·검색 봇 */
export function isBot(): boolean {
  if (typeof navigator === "undefined") return false;
  return /HeadlessChrome|bot|crawler|spider|facebookexternalhit|Slurp|preview/i.test(navigator.userAgent) || navigator.webdriver === true;
}

/** 내 기기(?me=1)이거나 자동 검사·봇이면 qa */
export function isQa(): boolean {
  return read(QA_KEY) === "1" || isBot();
}

function visitorId(): string | null {
  let v = read(VISITOR_KEY);
  if (v && /^[a-z0-9-]{8,40}$/.test(v)) return v;
  try {
    v = crypto.randomUUID();
  } catch {
    v = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  }
  write(VISITOR_KEY, v);
  return read(VISITOR_KEY) ? v : null;
}

/** INSERT 만 한다. 같은 내용 중복은 서버가 조용히 무시한다. */
export async function insertRow(table: string, row: Record<string, unknown>, keepalive = false): Promise<{ ok: boolean; rateLimited?: boolean }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      keepalive,
      headers: { apikey: SUPABASE_KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => ({}));
    if (body?.code === "23505") return { ok: true }; // 거의 동시에 두 번 눌렀을 때
    return { ok: false, rateLimited: /rate_limited/.test(body?.message ?? "") };
  } catch {
    return { ok: false };
  }
}

export function track(name: EventName, opts: { classId?: string; lang?: "ko" | "en" } = {}) {
  if (typeof window === "undefined") return;
  const props: Record<string, boolean> = {};
  if (isQa()) props.qa = true;
  if (isBot()) props.bot = true;
  const row: Record<string, unknown> = {
    name,
    path: window.location.pathname.slice(0, 200),
    visitor: visitorId(),
    props,
    lang: opts.lang ?? null,
  };
  if (opts.classId) row.class_id = opts.classId;
  const src = getSrc();
  if (src) row.src = src;
  void insertRow("web_events", row, true);
}
