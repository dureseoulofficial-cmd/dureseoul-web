"use client";

// /host: 서울에 사는 외국인 호스트 모집. 첫 3회를 두레서울이 같이 준비한다는 걸 보여주고 짧은 신청서를 받는다.
// 숫자(수수료 · 참가비 · 최소 보장 · 예시 계산)는 2026-11 합의안 기준. 바뀌면 여기와 docs/host-questions.md 를 같이 고친다.
import { useState } from "react";
import Link from "next/link";
import { Choices, EMAIL, Field, fontVars, inputCls } from "@/components/form";
import { getSrc, insertRow, isQa, track } from "@/lib/track";
import type { Lang } from "@/lib/lang";

type Visa = "F-2" | "F-4" | "F-5" | "F-6" | "H-1" | "other" | "unsure";
type Category = "food" | "culture" | "language" | "other";
type Day = "weekday" | "sat" | "sun";

const copy = {
  en: {
    home: "Dureseoul",
    switchLang: "한국어",
    switchHref: "/host?lang=ko",
    title: "Host a class in Seoul",
    lead: "You live in Seoul and have something to teach: a dish from home, a craft, your language. We set up your first three classes with you.",
    applyNow: "Apply",
    helpTitle: "What we do for your first three classes",
    help: [
      ["Plan it together", "We send you a list of questions first, then talk for 30 minutes about what to teach and how to fill two hours."],
      ["Rehearse once", "You run the class once for four of our friends, in the real venue. We pay for the venue and ingredients, and they tell you what worked."],
      ["Photos and class page", "We take photos at the rehearsal and write your class page in English and Korean."],
      ["Find the guests", "Koreans who want to meet someone from your country, and people from your own community. Most classes have 4 to 8 guests."],
      ["Be there on the day", "One of us comes to your first class to help with check-in and timing."],
    ],
    moneyTitle: "Money",
    money: [
      "No commission on your first three classes. After that we keep 20%, card fees included.",
      "Guests pay around ₩50,000 for a cooking class, ingredients included. We set the price together.",
      "The venue fee comes out of the class fee. We book the venue.",
      "For your first three classes you get at least ₩100,000, even if only a few guests come.",
    ],
    exampleTitle: "Example: a cooking class with 6 guests",
    example: [
      ["6 guests × ₩50,000", "₩300,000"],
      ["Venue, 3 hours", "−₩54,000"],
      ["Ingredients", "−₩60,000"],
    ],
    exampleTotal: ["To you", "₩186,000"],
    tax: "If you're paid as an individual, 3.3% income tax is withheld and reported for you.",
    whoTitle: "Who can host",
    who: [
      "F-2, F-4, F-5 and F-6 visa holders can host any kind of class.",
      "Working holiday (H-1) can host food and culture classes, but not language classes.",
      "Other visas need a permit from Immigration before any paid activity, so we're starting with these. Not sure about yours? Pick “Not sure” and we'll check together.",
    ],
    whenTitle: "When",
    when: "Rehearsals in early December. First classes on weekends from mid-December.",
    formTitle: "Apply",
    formLead: "Takes about two minutes. We reply by email with the question list.",
    name: "Name",
    email: "Email",
    emailHint: "We'll reply here.",
    messenger: "KakaoTalk or Instagram ID (optional)",
    country: "Home country",
    visa: "Visa",
    visaOpts: [
      { id: "F-2", label: "F-2" },
      { id: "F-4", label: "F-4" },
      { id: "F-5", label: "F-5" },
      { id: "F-6", label: "F-6" },
      { id: "H-1", label: "H-1 working holiday" },
      { id: "other", label: "Other" },
      { id: "unsure", label: "Not sure" },
    ],
    category: "Type of class",
    categoryOpts: [
      { id: "food", label: "Food" },
      { id: "culture", label: "Culture or craft" },
      { id: "language", label: "Language" },
      { id: "other", label: "Other" },
    ],
    langWarn: "Language classes need an F visa. You can still apply with a food or culture class.",
    idea: "Your class, in one line",
    ideaHint: "e.g. Home-style Mexican tacos",
    classLang: "Language you'll teach in",
    classLangHint: "e.g. English, with a little Korean",
    days: "Days that work (pick any)",
    dayOpts: [
      { id: "weekday", label: "Weekday evenings" },
      { id: "sat", label: "Saturday" },
      { id: "sun", label: "Sunday" },
    ],
    heard: "How did you hear about us? (optional)",
    heardHint: "e.g. a friend",
    privacy: "We use these details only to reply to your application, and delete them within 3 months after the trial ends if you don't host.",
    privacyLink: "Privacy policy",
    submit: "Send application",
    sending: "Sending",
    doneTitle: "Got it",
    doneLine: "We'll email you with the question list. If you added a KakaoTalk or Instagram ID, we may message you there too.",
    errName: "Please add your name.",
    errEmail: "Please check your email address.",
    errCountry: "Please add your home country.",
    errVisa: "Please pick your visa, or “Not sure”.",
    errCategory: "Please pick a type of class.",
    errIdea: "Please describe your class in one line.",
    errSave: "That didn't save. Please try again in a moment.",
    errRate: "We can't save right now. Please try again in a minute.",
    footer: "Dureseoul Inc.",
  },
  ko: {
    home: "두레서울",
    switchLang: "English",
    switchHref: "/host?lang=en",
    title: "서울에서 클래스 열기",
    lead: "서울에 살면서 고향 요리, 공예, 모국어처럼 가르치고 싶은 게 있다면, 첫 클래스 3번은 두레서울이 같이 준비해요.",
    applyNow: "지원하기",
    helpTitle: "첫 클래스 3번 동안 우리가 하는 일",
    help: [
      ["같이 계획", "질문 리스트를 먼저 보내드리고, 30분 통화로 무엇을 가르칠지, 2시간을 어떻게 채울지 같이 정해요."],
      ["리허설 한 번", "실제 장소에서 두레서울 지인 4명을 손님으로 한 번 미리 해 봐요. 공간비와 재료비는 우리가 내고, 끝나면 피드백을 드려요."],
      ["사진과 소개 페이지", "리허설 때 사진을 찍고, 클래스 소개를 한국어와 영어로 써요."],
      ["손님 모으기", "그 나라 사람을 만나고 싶은 한국인과, 호스트와 같은 나라 커뮤니티 사람들을 모아요. 클래스는 보통 4~8명이에요."],
      ["첫날 같이", "첫 클래스 날 우리 중 한 명이 가서 손님 맞이와 시간 진행을 도와요."],
    ],
    moneyTitle: "돈",
    money: [
      "첫 3번은 수수료가 없어요. 그 뒤로는 20%이고, 카드 수수료가 포함돼요.",
      "요리 클래스 참가비는 1인 5만 원 안팎이에요(재료 포함). 가격은 같이 정해요.",
      "공간비는 참가비에서 나가고, 공간 예약은 우리가 해요.",
      "첫 3번은 손님이 적게 와도 최소 10만 원을 보장해요.",
    ],
    exampleTitle: "예시: 손님 6명 요리 클래스",
    example: [
      ["6명 × 50,000원", "300,000원"],
      ["공간 3시간", "−54,000원"],
      ["재료비", "−60,000원"],
    ],
    exampleTotal: ["호스트 몫", "186,000원"],
    tax: "개인으로 받으면 3.3% 원천징수를 대신 신고해 드려요.",
    whoTitle: "누가 열 수 있나",
    who: [
      "F-2, F-4, F-5, F-6 비자는 모든 클래스를 열 수 있어요.",
      "워킹홀리데이(H-1)는 요리·문화 클래스는 되고, 언어 클래스는 안 돼요.",
      "다른 비자는 돈을 받는 활동 전에 출입국 허가가 필요해서 지금은 위 비자로 시작해요. 잘 모르겠으면 「잘 모름」을 고르세요. 같이 확인해요.",
    ],
    whenTitle: "언제",
    when: "12월 초에 리허설, 12월 중순부터 주말에 첫 클래스.",
    formTitle: "지원하기",
    formLead: "2분 정도 걸려요. 이메일로 질문 리스트와 함께 답장드려요.",
    name: "이름",
    email: "이메일",
    emailHint: "답장은 여기로 드려요.",
    messenger: "카카오톡 또는 인스타그램 아이디 (선택)",
    country: "출신 국가",
    visa: "체류자격",
    visaOpts: [
      { id: "F-2", label: "F-2" },
      { id: "F-4", label: "F-4" },
      { id: "F-5", label: "F-5" },
      { id: "F-6", label: "F-6" },
      { id: "H-1", label: "H-1 워킹홀리데이" },
      { id: "other", label: "기타" },
      { id: "unsure", label: "잘 모름" },
    ],
    category: "클래스 분야",
    categoryOpts: [
      { id: "food", label: "요리" },
      { id: "culture", label: "문화·공예" },
      { id: "language", label: "언어" },
      { id: "other", label: "기타" },
    ],
    langWarn: "언어 클래스는 F 비자가 필요해요. 요리나 문화 클래스로는 지원할 수 있어요.",
    idea: "열고 싶은 클래스 (한 줄)",
    ideaHint: "예: 집에서 만드는 멕시코 타코",
    classLang: "진행 언어",
    classLangHint: "예: 영어, 한국어 조금",
    days: "가능한 요일 (여러 개 가능)",
    dayOpts: [
      { id: "weekday", label: "평일 저녁" },
      { id: "sat", label: "토요일" },
      { id: "sun", label: "일요일" },
    ],
    heard: "어떻게 알고 오셨어요? (선택)",
    heardHint: "예: 친구 소개",
    privacy: "적어 주신 정보는 지원 회신에만 쓰고, 호스트로 이어지지 않으면 시범 기간이 끝난 뒤 3개월 안에 지워요.",
    privacyLink: "개인정보처리방침",
    submit: "지원서 보내기",
    sending: "보내는 중",
    doneTitle: "받았어요",
    doneLine: "질문 리스트와 함께 이메일로 연락드릴게요. 카카오톡이나 인스타그램 아이디를 적어 주셨다면 거기로 연락드릴 수도 있어요.",
    errName: "이름을 적어 주세요.",
    errEmail: "이메일 주소를 확인해 주세요.",
    errCountry: "출신 국가를 적어 주세요.",
    errVisa: "체류자격을 골라 주세요. 모르면 「잘 모름」을 고르면 돼요.",
    errCategory: "클래스 분야를 골라 주세요.",
    errIdea: "열고 싶은 클래스를 한 줄로 적어 주세요.",
    errSave: "저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.",
    errRate: "지금은 저장이 안 돼요. 1분 뒤 다시 눌러 주세요.",
    footer: "주식회사 두레서울",
  },
} as const;

export default function HostClient({ lang }: { lang: Lang }) {
  const t = copy[lang];
  return (
    <main className={`${fontVars} min-h-screen bg-[#F1ECE2] text-[#0A0B0E] [font-family:var(--f-kr),system-ui,sans-serif]`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 pb-16">
        <header className="flex items-center justify-between py-5">
          <Link href="/" className={`${lang === "ko" ? "font-bold" : "[font-family:var(--f-disp)]"} text-[18px] tracking-tight`}>
            {t.home}
          </Link>
          <a href={t.switchHref} className="min-h-[44px] inline-flex items-center px-1 text-[14px] text-[#0A0B0E]/70 hover:text-[#0A0B0E] underline underline-offset-4 decoration-[#0A0B0E]/25">
            {t.switchLang}
          </a>
        </header>

        <section className="pt-4 pb-8 sm:pt-10 sm:pb-10 border-t border-[#0A0B0E]/15">
          <h1 className="text-[30px] sm:text-[44px] font-bold leading-[1.15] tracking-[-0.02em] break-keep">{t.title}</h1>
          <p className="mt-4 text-[16px] sm:text-[18px] leading-[1.7] text-[#0A0B0E]/75 break-keep max-w-[34em]">{t.lead}</p>
          <a href="#apply" className="mt-6 inline-flex items-center min-h-[48px] px-6 rounded-[6px] bg-[#E8542E] text-white font-bold text-[15px] hover:bg-[#d84a25]">
            {t.applyNow}
          </a>
        </section>

        <Section title={t.helpTitle}>
          <ol className="divide-y divide-[#0A0B0E]/10 border-y border-[#0A0B0E]/10">
            {t.help.map(([head, body], i) => (
              <li key={head} className="flex gap-4 py-4">
                <span className="w-6 shrink-0 [font-family:var(--f-mono)] text-[13px] leading-[1.9] text-[#E8542E]">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="text-[16px] font-bold break-keep">{head}</p>
                  <p className="mt-1 text-[15px] leading-[1.7] text-[#0A0B0E]/70 break-keep">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Section>

        <Section title={t.moneyTitle}>
          <ul className="space-y-2 text-[15px] leading-[1.7] break-keep">
            {t.money.map((m) => (
              <li key={m} className="flex gap-3">
                <span aria-hidden className="mt-[0.7em] h-[5px] w-[5px] shrink-0 rounded-full bg-[#0A0B0E]/40" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
          <div className="mt-5 rounded-[6px] bg-[#FBF8F2] border border-[#0A0B0E]/12 p-4 sm:p-5 max-w-md">
            <p className="text-[13px] font-medium text-[#0A0B0E]/65">{t.exampleTitle}</p>
            <dl className="mt-2 [font-family:var(--f-mono)] text-[14px]">
              {t.example.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-[#0A0B0E]/70">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-4 pt-2 mt-1 border-t border-[#0A0B0E]/15 font-medium">
                <dt>{t.exampleTotal[0]}</dt>
                <dd className="tabular-nums">{t.exampleTotal[1]}</dd>
              </div>
            </dl>
          </div>
          <p className="mt-3 text-[13px] text-[#0A0B0E]/60 break-keep">{t.tax}</p>
        </Section>

        <Section title={t.whoTitle}>
          <ul className="space-y-2 text-[15px] leading-[1.7] break-keep">
            {t.who.map((m) => (
              <li key={m} className="flex gap-3">
                <span aria-hidden className="mt-[0.7em] h-[5px] w-[5px] shrink-0 rounded-full bg-[#0A0B0E]/40" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title={t.whenTitle}>
          <p className="text-[15px] leading-[1.7] break-keep">{t.when}</p>
        </Section>

        <section id="apply" className="scroll-mt-4 mt-12 pt-6 border-t border-[#0A0B0E]/15">
          <h2 className="text-[22px] sm:text-[26px] font-bold">{t.formTitle}</h2>
          <p className="mt-1 text-[14px] text-[#0A0B0E]/65 break-keep">{t.formLead}</p>
          <ApplyForm lang={lang} />
        </section>

        <footer className="mt-14 pt-6 border-t border-[#0A0B0E]/15 flex flex-wrap gap-x-4 gap-y-1 [font-family:var(--f-mono)] text-[12px] text-[#0A0B0E]/60">
          <span>{t.footer}</span>
          <Link href="/privacy" className="underline underline-offset-2">{t.privacyLink}</Link>
        </footer>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-4 text-[20px] sm:text-[22px] font-bold break-keep">{title}</h2>
      {children}
    </section>
  );
}

function ApplyForm({ lang }: { lang: Lang }) {
  const t = copy[lang];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [messenger, setMessenger] = useState("");
  const [country, setCountry] = useState("");
  const [visa, setVisa] = useState<Visa | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [idea, setIdea] = useState("");
  const [classLang, setClassLang] = useState("");
  const [days, setDays] = useState<Day[]>([]);
  const [heard, setHeard] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const langBlocked = category === "language" && visa !== null && !visa.startsWith("F-");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    if (!name.trim()) return setErr(t.errName);
    if (em.length > 80 || !EMAIL.test(em)) return setErr(t.errEmail);
    if (!country.trim()) return setErr(t.errCountry);
    if (!visa) return setErr(t.errVisa);
    if (!category) return setErr(t.errCategory);
    if (!idea.trim()) return setErr(t.errIdea);
    setErr("");
    setBusy(true);
    const src = getSrc();
    const res = await insertRow("web_host_applications", {
      name: name.trim().slice(0, 40),
      email: em,
      messenger: messenger.trim().slice(0, 60) || null,
      country: country.trim().slice(0, 60),
      visa,
      category,
      idea: idea.trim().slice(0, 200),
      class_lang: classLang.trim().slice(0, 60) || null,
      days: days.length ? days : null,
      heard_from: heard.trim().slice(0, 100) || null,
      page: "host",
      ...(src ? { src } : {}),
      ...(isQa() ? { qa: true } : {}),
      lang,
    });
    setBusy(false);
    if (!res.ok) return setErr(res.rateLimited ? t.errRate : t.errSave);
    track("host_submit", { lang });
    setDone(true);
  }

  if (done) {
    return (
      <div className="mt-6 max-w-md rounded-[6px] bg-[#FBF8F2] border border-[#0A0B0E]/12 p-5" role="status">
        <p className="text-[18px] font-bold">{t.doneTitle}</p>
        <p className="mt-2 text-[15px] leading-[1.7] break-keep">{t.doneLine}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 max-w-md space-y-5" noValidate>
      <Field label={t.name}>
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoComplete="name" />
      </Field>
      <Field label={t.email} hint={t.emailHint}>
        <input className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} maxLength={80} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field label={t.messenger}>
        <input className={inputCls} value={messenger} onChange={(e) => setMessenger(e.target.value)} maxLength={60} autoCapitalize="none" spellCheck={false} />
      </Field>
      <Field label={t.country}>
        <input className={inputCls} value={country} onChange={(e) => setCountry(e.target.value)} maxLength={60} autoComplete="country-name" />
      </Field>
      <Choices legend={t.visa} options={t.visaOpts} value={visa ? [visa] : []} onChange={(v) => setVisa(v as Visa)} />
      <Choices legend={t.category} options={t.categoryOpts} value={category ? [category] : []} onChange={(v) => setCategory(v as Category)} />
      {langBlocked && <p className="text-[13px] leading-[1.6] text-[#B83A1A] break-keep">{t.langWarn}</p>}
      <Field label={t.idea}>
        <input className={inputCls} value={idea} onChange={(e) => setIdea(e.target.value)} maxLength={200} placeholder={t.ideaHint} />
      </Field>
      <Field label={t.classLang}>
        <input className={inputCls} value={classLang} onChange={(e) => setClassLang(e.target.value)} maxLength={60} placeholder={t.classLangHint} />
      </Field>
      <Choices
        legend={t.days}
        options={t.dayOpts}
        value={days}
        cols={3}
        onChange={(d) => setDays((cur) => (cur.includes(d as Day) ? cur.filter((x) => x !== d) : [...cur, d as Day]))}
      />
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
  );
}
