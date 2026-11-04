"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Archivo_Black, IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import { classes, type DureClass } from "@/data/classes";
import { getSrc, insertRow, track } from "@/lib/track";

const display = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--f-disp" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });
const kr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-kr" });

type Lang = "ko" | "en";

const copy = {
  ko: {
    home: "두레서울",
    eyebrow: "11월 클래스",
    title: "서울에 사는 사람이 여는 작은 클래스",
    lead: "호스트가 자기 동네에서 직접 진행해요. 자리를 맡아두면 확정과 결제는 따로 연락드려요.",
    placeholder: "자리표시자",
    noPhoto: "사진 준비 중",
    from: "출신",
    when: "날짜",
    where: "장소",
    price: "가격",
    seats: "정원",
    seatsUnit: (n: number) => `${n}명`,
    won: (n: number) => `${n.toLocaleString("ko-KR")}원`,
    reserve: "자리 맡아두기",
    sheetTitle: "자리 맡아두기",
    name: "이름",
    contact: "이메일 또는 휴대폰",
    contactHint: "확정 안내를 받을 곳",
    party: "인원",
    partyUnit: (n: number) => `${n}명`,
    heard: "어떻게 알게 됐나요? (선택)",
    heardHint: "예: 친구 소개, 인스타그램, 숙소",
    privacy: "연락처는 이 클래스 안내에만 쓰고, 검증 기간이 끝나면 3개월 안에 지워요.",
    privacyLink: "개인정보처리방침",
    submit: "맡아두기",
    sending: "보내는 중",
    close: "닫기",
    doneTitle: "자리를 맡아뒀어요",
    doneLine: "확정·결제 안내는 개별 연락드려요.",
    errName: "이름을 적어 주세요.",
    errContact: "이메일이나 휴대폰 번호를 확인해 주세요.",
    errSave: "저장하지 못했어요. 잠시 후 다시 시도해 주세요.",
    errRate: "신청이 몰리고 있어요. 잠시 후 다시 시도해 주세요.",
    hostLink: "호스트로 클래스 열기",
    hostTitle: "호스트로 클래스 열기",
    hostLead: "서울에 살면서 나누고 싶은 게 있다면 남겨 주세요. 읽고 이메일로 연락드려요.",
    email: "이메일",
    country: "출신 국가",
    idea: "하고 싶은 클래스 한 줄",
    ideaHint: "예: 집에서 만드는 멕시코 타코",
    hostSubmit: "보내기",
    hostDone: "받았어요. 읽어 보고 이메일로 연락드릴게요.",
    errEmail: "이메일 주소를 확인해 주세요.",
    errHost: "국가와 클래스 내용을 적어 주세요.",
    footer: "주식회사 두레서울",
  },
  en: {
    home: "Dureseoul",
    eyebrow: "November classes",
    title: "Small classes hosted by people who live in Seoul",
    lead: "Each host runs the class in their own neighborhood. Hold a spot and we'll contact you to confirm and arrange payment.",
    placeholder: "Placeholder",
    noPhoto: "Photo coming",
    from: "From",
    when: "Date",
    where: "Place",
    price: "Price",
    seats: "Spots",
    seatsUnit: (n: number) => `${n}`,
    won: (n: number) => `₩${n.toLocaleString("en-US")}`,
    reserve: "Hold a spot",
    sheetTitle: "Hold a spot",
    name: "Name",
    contact: "Email or phone",
    contactHint: "Where we should send the confirmation",
    party: "People",
    partyUnit: (n: number) => `${n}`,
    heard: "How did you hear about us? (optional)",
    heardHint: "e.g. a friend, Instagram, your guesthouse",
    privacy: "We only use your contact for this class and delete it within 3 months after the trial period ends.",
    privacyLink: "Privacy policy",
    submit: "Hold my spot",
    sending: "Sending",
    close: "Close",
    doneTitle: "Your spot is held",
    doneLine: "We'll contact you directly to confirm and arrange payment.",
    errName: "Please enter your name.",
    errContact: "Please check your email or phone number.",
    errSave: "We couldn't save that. Please try again in a moment.",
    errRate: "Lots of requests right now. Please try again in a moment.",
    hostLink: "Host a class",
    hostTitle: "Host a class",
    hostLead: "If you live in Seoul and have something to share, leave a note. We'll read it and reply by email.",
    email: "Email",
    country: "Home country",
    idea: "Your class in one line",
    ideaHint: "e.g. Home-style Mexican tacos",
    hostSubmit: "Send",
    hostDone: "Got it. We'll read it and email you.",
    errEmail: "Please check your email address.",
    errHost: "Please add your country and class idea.",
    footer: "Dureseoul Inc.",
  },
} as const;

const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;
const PHONE = /^\+?[0-9]{9,15}$/;

function normalizeContact(v: string) {
  const t = v.trim();
  return t.includes("@") ? t.toLowerCase() : t.replace(/[\s().-]/g, "");
}

const noop = () => () => {};

function detectLang(): Lang {
  const q = new URLSearchParams(window.location.search).get("lang");
  if (q === "ko" || q === "en") return q;
  return (navigator.languages?.[0] ?? navigator.language ?? "ko").toLowerCase().startsWith("ko") ? "ko" : "en";
}

export default function ClassesClient() {
  // 서버에서는 ko, 브라우저에서는 브라우저 언어 (?lang=en 으로 강제 가능)
  const lang = useSyncExternalStore<Lang>(noop, detectLang, () => "ko");
  const ready = useSyncExternalStore(noop, () => true, () => false);
  const [open, setOpen] = useState<DureClass | null>(null);
  const [hostOpen, setHostOpen] = useState(false);
  const t = copy[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <main
      className={`${display.variable} ${mono.variable} ${kr.variable} min-h-screen bg-[#F1ECE2] text-[#0A0B0E] [font-family:var(--f-kr),system-ui,sans-serif] transition-opacity duration-200 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className={`${lang === "ko" ? "font-bold" : "[font-family:var(--f-disp)]"} text-[18px] tracking-tight`}>
            {t.home}
          </Link>
          <span className="[font-family:var(--f-mono)] text-[12px] text-[#0A0B0E]/60">{t.eyebrow}</span>
        </header>

        <section className="pt-4 pb-8 sm:pt-10 sm:pb-12 border-t border-[#0A0B0E]/15">
          <h1 className="text-[28px] sm:text-[40px] font-bold leading-[1.2] tracking-[-0.02em] break-keep max-w-[18em]">{t.title}</h1>
          <p className="mt-4 text-[15px] sm:text-[17px] leading-[1.7] text-[#0A0B0E]/70 break-keep max-w-[34em]">{t.lead}</p>
        </section>

        <ul className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
          {classes.map((c) => (
            <ClassCard key={c.id} c={c} lang={lang} onReserve={() => {
              track("reserve_click", { classId: c.id, lang });
              setOpen(c);
            }} />
          ))}
        </ul>

        <footer className="mt-14 pt-6 border-t border-[#0A0B0E]/15 flex flex-col gap-4 text-[13px] text-[#0A0B0E]/60">
          <button type="button" onClick={() => setHostOpen((v) => !v)} className="self-start underline underline-offset-4 decoration-[#0A0B0E]/30 hover:text-[#0A0B0E] min-h-[44px]" aria-expanded={hostOpen}>
            {t.hostLink}
          </button>
          {hostOpen && <HostForm lang={lang} />}
          <div className="flex flex-wrap gap-x-4 gap-y-1 [font-family:var(--f-mono)] text-[12px]">
            <span>{t.footer}</span>
            <Link href="/privacy" className="underline underline-offset-2">{t.privacyLink}</Link>
          </div>
        </footer>
      </div>

      {open && <ReserveSheet c={open} lang={lang} onClose={() => setOpen(null)} />}
    </main>
  );
}

function ClassCard({ c, lang, onReserve }: { c: DureClass; lang: Lang; onReserve: () => void }) {
  const t = copy[lang];
  const ref = useRef<HTMLLIElement>(null);

  // 카드가 화면에 절반 이상 보이면 class_view 한 번
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          track("class_view", { classId: c.id, lang });
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const row = (label: string, value: string) => (
    <div className="flex gap-3 py-2 border-t border-[#0A0B0E]/10 text-[14px]">
      <dt className="w-12 shrink-0 [font-family:var(--f-mono)] text-[12px] leading-[1.9] text-[#0A0B0E]/55">{label}</dt>
      <dd className="min-w-0 break-keep">{value}</dd>
    </div>
  );

  return (
    <li ref={ref} className="bg-[#FBF8F2] border border-[#0A0B0E]/12 rounded-[6px] overflow-hidden flex flex-col">
      <div className="relative aspect-[4/3] bg-[#E6E0D3]">
        {c.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={c.photo} alt={c.host[lang]} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-3 border border-dashed border-[#0A0B0E]/25 rounded-[4px] grid place-items-center [font-family:var(--f-mono)] text-[12px] text-[#0A0B0E]/45">
            {t.noPhoto}
          </div>
        )}
        {c.placeholder && (
          <span className="absolute left-3 top-3 bg-[#0A0B0E] text-[#F1ECE2] [font-family:var(--f-mono)] text-[11px] px-2 py-[3px] rounded-[3px]">
            {t.placeholder}
          </span>
        )}
      </div>
      <div className="p-4 sm:p-5 flex flex-col flex-1">
        <p className="text-[14px] text-[#0A0B0E]/70">
          <span className="font-bold text-[#0A0B0E]">{c.host[lang]}</span>
          <span className="mx-1.5 text-[#0A0B0E]/30">·</span>
          {c.origin[lang]}
        </p>
        <h2 className="mt-2 text-[19px] font-bold leading-[1.35] tracking-[-0.01em] break-keep">{c.title[lang]}</h2>
        <dl className="mt-4 mb-5">
          {row(t.when, c.date[lang])}
          {row(t.where, c.place[lang])}
          {row(t.price, c.price ? t.won(c.price) : "—")}
          {row(t.seats, c.capacity ? t.seatsUnit(c.capacity) : "—")}
        </dl>
        <button
          type="button"
          onClick={onReserve}
          className="mt-auto min-h-[48px] rounded-[6px] bg-[#E8542E] text-white font-bold text-[15px] active:translate-y-px hover:bg-[#d84a25] transition-colors"
        >
          {t.reserve}
        </button>
      </div>
    </li>
  );
}

const inputCls =
  "w-full min-h-[48px] rounded-[6px] border border-[#0A0B0E]/20 bg-white px-3 text-[16px] outline-none focus:border-[#4C8DFF] focus:ring-2 focus:ring-[#4C8DFF]/25";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[12px] text-[#0A0B0E]/50">{hint}</span>}
    </label>
  );
}

function ReserveSheet({ c, lang, onClose }: { c: DureClass; lang: Lang; onClose: () => void }) {
  const t = copy[lang];
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [party, setParty] = useState(1);
  const [heard, setHeard] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const ct = normalizeContact(contact);
    if (!n) return setErr(t.errName);
    if (ct.length > 80 || !(EMAIL.test(ct) || PHONE.test(ct))) return setErr(t.errContact);
    setErr("");
    setBusy(true);
    const src = getSrc();
    const res = await insertRow("class_waitlist", {
      class_id: c.id,
      name: n.slice(0, 40),
      contact: ct,
      party_size: party,
      heard_from: heard.trim().slice(0, 100) || null,
      ...(src ? { src } : {}),
      lang,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.rateLimited ? t.errRate : t.errSave);
    track("reserve_submit", { classId: c.id, lang });
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <button type="button" aria-label={t.close} onClick={onClose} className="absolute inset-0 bg-[#0A0B0E]/45" />
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto bg-[#F1ECE2] rounded-t-[12px] sm:rounded-[10px] px-4 sm:px-6 pt-5 pb-[max(20px,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="sheet-title" className="text-[20px] font-bold">{done ? t.doneTitle : t.sheetTitle}</h2>
            <p className="mt-1 text-[14px] text-[#0A0B0E]/65 break-keep">{c.title[lang]} · {c.date[lang]}</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 min-h-[44px] px-2 [font-family:var(--f-mono)] text-[12px] text-[#0A0B0E]/60 underline underline-offset-2">
            {t.close}
          </button>
        </div>

        {done ? (
          <p className="mt-6 mb-4 text-[16px] leading-[1.7]">{t.doneLine}</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4" noValidate>
            <Field label={t.name}>
              <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" required />
            </Field>
            <Field label={t.contact} hint={t.contactHint}>
              <input className={inputCls} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={80} autoComplete="email" inputMode="email" autoCapitalize="none" spellCheck={false} required />
            </Field>
            <fieldset>
              <legend className="block text-[13px] font-medium mb-1.5">{t.party}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[1, 2].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setParty(n)}
                    aria-pressed={party === n}
                    className={`min-h-[48px] rounded-[6px] border text-[15px] font-medium ${party === n ? "bg-[#0A0B0E] text-[#F1ECE2] border-[#0A0B0E]" : "bg-white border-[#0A0B0E]/20"}`}
                  >
                    {t.partyUnit(n)}
                  </button>
                ))}
              </div>
            </fieldset>
            <Field label={t.heard}>
              <input className={inputCls} value={heard} onChange={(e) => setHeard(e.target.value)} maxLength={100} placeholder={t.heardHint} />
            </Field>
            <p className="text-[12px] leading-[1.6] text-[#0A0B0E]/55 break-keep">
              {t.privacy}{" "}
              <Link href="/privacy#class-waitlist" className="underline underline-offset-2">{t.privacyLink}</Link>
            </p>
            {err && <p role="alert" className="text-[13px] text-[#B83A1A]">{err}</p>}
            <button type="submit" disabled={busy} className="w-full min-h-[52px] rounded-[6px] bg-[#E8542E] text-white font-bold text-[16px] disabled:opacity-60">
              {busy ? t.sending : t.submit}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function HostForm({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const [email, setEmail] = useState("");
  const [country, setCountry] = useState("");
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (em.length > 80 || !EMAIL.test(em)) return setErr(t.errEmail);
    if (!country.trim() || !idea.trim()) return setErr(t.errHost);
    setErr("");
    setBusy(true);
    const src = getSrc();
    const res = await insertRow("web_host_applications", {
      email: em,
      country: country.trim().slice(0, 60),
      idea: idea.trim().slice(0, 200),
      ...(src ? { src } : {}),
      lang,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.rateLimited ? t.errRate : t.errSave);
    track("host_submit", { lang });
    setDone(true);
  }

  if (done) return <p className="text-[15px] text-[#0A0B0E]">{t.hostDone}</p>;

  return (
    <form onSubmit={submit} className="max-w-md space-y-4 text-[#0A0B0E]" noValidate>
      <p className="text-[14px] leading-[1.7] text-[#0A0B0E]/70 break-keep">{t.hostLead}</p>
      <Field label={t.email}>
        <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={80} type="email" autoComplete="email" autoCapitalize="none" />
      </Field>
      <Field label={t.country}>
        <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} autoComplete="country-name" />
      </Field>
      <Field label={t.idea}>
        <input className={inputCls} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={200} placeholder={t.ideaHint} />
      </Field>
      {err && <p role="alert" className="text-[13px] text-[#B83A1A]">{err}</p>}
      <button type="submit" disabled={busy} className="min-h-[48px] px-6 rounded-[6px] bg-[#0A0B0E] text-[#F1ECE2] font-bold text-[15px] disabled:opacity-60">
        {busy ? t.sending : t.hostSubmit}
      </button>
    </form>
  );
}
