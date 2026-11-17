// /classes · /host 가 같이 쓰는 글꼴과 입력칸
import { Archivo_Black, IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";

const display = Archivo_Black({ subsets: ["latin"], weight: "400", variable: "--f-disp" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--f-mono" });
const kr = Noto_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--f-kr" });

export const fontVars = `${display.variable} ${mono.variable} ${kr.variable}`;

export const EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export const inputCls =
  "w-full min-h-[48px] rounded-[6px] border border-[#0A0B0E]/20 bg-white px-3 text-[16px] outline-none focus:border-[#4C8DFF] focus:ring-2 focus:ring-[#4C8DFF]/25";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium mb-1.5">{label}</span>
      {children}
      {hint && <span className="block mt-1 text-[12px] text-[#0A0B0E]/50">{hint}</span>}
    </label>
  );
}

/** 여러 개 중 하나(또는 여러 개)를 고르는 버튼 묶음 */
export function Choices<T extends string>({
  legend,
  options,
  value,
  onChange,
  cols = 2,
}: {
  legend: string;
  options: readonly { id: T; label: string }[];
  value: T[];
  onChange: (id: T) => void;
  cols?: 2 | 3;
}) {
  return (
    <fieldset>
      <legend className="block text-[13px] font-medium mb-1.5">{legend}</legend>
      <div className={`grid gap-2 ${cols === 3 ? "grid-cols-3" : "grid-cols-2"}`}>
        {options.map((o) => {
          const on = value.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              aria-pressed={on}
              className={`min-h-[44px] px-2 rounded-[6px] border text-[14px] leading-tight break-keep ${on ? "bg-[#0A0B0E] text-[#F1ECE2] border-[#0A0B0E]" : "bg-white border-[#0A0B0E]/20"}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
