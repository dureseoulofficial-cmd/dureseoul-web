"use client";

import { motion, useReducedMotion, useInView, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Link from "next/link";

function NoiseOverlay() {
  return (
    <div 
      className="pointer-events-none fixed inset-0 z-50 h-full w-full opacity-[0.05] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
      }}
    />
  );
}

function Magnetic({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const shouldReduceMotion = useReducedMotion();

  const handleMouse = (e: React.MouseEvent) => {
    if (shouldReduceMotion || !ref.current) return;
    const { clientX, clientY } = e;
    const { height, width, left, top } = ref.current.getBoundingClientRect();
    const middleX = clientX - (left + width / 2);
    const middleY = clientY - (top + height / 2);
    setPosition({ x: middleX * 0.3, y: middleY * 0.3 });
  };

  const reset = () => {
    setPosition({ x: 0, y: 0 });
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouse}
      onMouseLeave={reset}
      animate={{ x: position.x, y: position.y }}
      transition={{ type: "spring", stiffness: 150, damping: 15, mass: 0.1 }}
      className="inline-block"
    >
      {children}
    </motion.div>
  );
}

function AnimatedText({ text, className, delayOffset = 0 }: { text: string, className?: string, delayOffset?: number }) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  
  if (shouldReduceMotion) return <p className={className}>{text}</p>;

  const words = text.split(" ");
  return (
    <p ref={ref} className={`${className} flex flex-wrap gap-x-[0.25em] gap-y-[0.1em]`}>
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-block">
          <motion.span
            initial={{ y: "110%", opacity: 0 }}
            animate={isInView ? { y: "0%", opacity: 1 } : { y: "110%", opacity: 0 }}
            transition={{ duration: 0.7, delay: delayOffset + i * 0.015, ease: [0.16, 1, 0.3, 1] }}
            className="inline-block"
          >
            {word}
          </motion.span>
        </span>
      ))}
    </p>
  );
}

function AnimatedSection({ children, className, border = false }: { children: React.ReactNode, className?: string, border?: boolean }) {
  const shouldReduceMotion = useReducedMotion();
  return (
    <motion.section
      initial={shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`${className} ${border ? 'border-t border-border' : ''}`}
    >
      {children}
    </motion.section>
  );
}

function HeroHeadline({ text }: { text: string }) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } }
  };

  const item = {
    hidden: { opacity: 0, y: 30, rotateZ: 3 },
    show: { opacity: 1, y: 0, rotateZ: 0, transition: { type: "spring" as const, stiffness: 100, damping: 15 } }
  };

  if (shouldReduceMotion) {
    return <h1 className="text-[76px] md:text-[103px] leading-[0.8] tracking-tighter uppercase font-bold text-fg">{text}</h1>;
  }

  return (
    <motion.h1 
      variants={container}
      initial="hidden"
      animate="show"
      className="text-[70px] md:text-[103px] leading-[0.8] tracking-tighter uppercase font-bold text-fg flex flex-wrap gap-x-[15px] md:gap-x-[20px]"
    >
      {words.map((word, i) => (
        <span key={i} className="overflow-hidden inline-block pb-4">
          <motion.span variants={item} className="inline-block origin-bottom-left">
            {word}
          </motion.span>
        </span>
      ))}
    </motion.h1>
  );
}

function Counter() {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (isInView) {
      if (shouldReduceMotion) {
        requestAnimationFrame(() => setCount(940));
        return;
      }
      
      const end = 940;
      const duration = 2500;
      const startTime = performance.now();
      
      const animate = (time: number) => {
        const progress = Math.min((time - startTime) / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        setCount(Math.floor(easeOutQuart * end));
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }
  }, [isInView, shouldReduceMotion]);

  return <span ref={ref}>{count}</span>;
}

function NetworkGraphic() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let animationFrameId: number;
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    
    const scale = window.devicePixelRatio || 1;
    canvas.width = width * scale;
    canvas.height = height * scale;
    ctx.scale(scale, scale);

    const nodes = Array.from({ length: 50 }).map((_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      baseRadius: i % 7 === 0 ? 4 : 1.5,
      radius: i % 7 === 0 ? 4 : 1.5,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      if (!shouldReduceMotion) {
        nodes.forEach(node => {
          node.x += node.vx;
          node.y += node.vy;
          if (node.x < 0 || node.x > width) node.vx *= -1;
          if (node.y < 0 || node.y > height) node.vy *= -1;

          // Mouse interaction
          const dx = mouseRef.current.x - node.x;
          const dy = mouseRef.current.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            // Attract slightly
            node.x += dx * 0.01;
            node.y += dy * 0.01;
            node.radius = node.baseRadius + (1 - dist/150) * 2;
          } else {
            node.radius = node.baseRadius;
          }
        });
      }

      ctx.lineWidth = 0.5;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 120) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(244, 244, 245, ${(1 - dist / 120) * 0.3})`;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      nodes.forEach(node => {
        ctx.beginPath();
        ctx.fillStyle = '#f4f4f5';
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      if (!shouldReduceMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    const handleResize = () => {
      width = canvas.offsetWidth;
      height = canvas.offsetHeight;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);
      if (shouldReduceMotion) render();
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('resize', handleResize);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [shouldReduceMotion]);

  return <canvas ref={canvasRef} className="w-full h-[300px] md:h-[400px] mt-12 opacity-80 cursor-crosshair" />;
}

function GhostLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <a href={href} className="text-[15px] font-bold tracking-tight inline-block relative group pb-1 text-fg">
      {children}
      <span className="absolute left-0 bottom-0 w-full h-[1px] bg-border group-hover:bg-fg transition-colors duration-300"></span>
      <motion.span 
        className="absolute left-0 bottom-0 w-0 h-[1px] bg-fg"
        whileHover={{ width: "100%" }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      ></motion.span>
    </a>
  );
}

function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      if (res.ok) {
        setStatus("success");
        setMessage("환영합니다. 가장 먼저 소식을 전해드리겠습니다.");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "오류가 발생했습니다.");
      }
    } catch {
      setStatus("error");
      setMessage("네트워크 오류가 발생했습니다.");
    }
  };

  return (
    <div className="mt-12 w-full max-w-md">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input 
          type="email" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="당신의 이메일을 남겨주세요." 
          className="flex-1 bg-surface border border-border px-6 py-4 outline-none focus:border-fg transition-colors text-fg placeholder:text-muted rounded-none"
          disabled={status === "loading" || status === "success"}
        />
        <button 
          type="submit" 
          disabled={status === "loading" || status === "success"}
          className="bg-fg text-bg px-8 py-4 font-bold hover:bg-muted transition-colors disabled:opacity-50"
        >
          {status === "loading" ? "..." : status === "success" ? "완료됨" : "합류하기"}
        </button>
      </form>
      {message && (
        <p className={`mt-4 text-sm font-mono ${status === "success" ? "text-fg" : "text-red-400"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  const { scrollYProgress } = useScroll();
  const y1 = useTransform(scrollYProgress, [0, 1], [0, 500]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, -300]);
  const x1 = useTransform(scrollYProgress, [0, 1], [0, 300]);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      touchMultiplier: 2,
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  return (
    <main className="min-h-screen relative overflow-hidden flex flex-col selection:bg-fg selection:text-bg">
      <NoiseOverlay />

      {/* Deep Dark Aurora Mesh Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none opacity-40 mix-blend-screen">
        <motion.div 
          style={{ y: y1 }}
          className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full blur-[120px] bg-[#4f46e5] opacity-30" 
        />
        <motion.div 
          style={{ y: y2 }}
          className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full blur-[140px] bg-[#ec4899] opacity-20" 
        />
        <motion.div 
          style={{ x: x1 }}
          className="absolute top-[30%] left-[20%] w-[40vw] h-[40vw] rounded-full blur-[100px] bg-[#06b6d4] opacity-20" 
        />
      </div>

      <div className="relative z-10 max-w-[1440px] w-full mx-auto px-6 md:px-12 lg:px-24">
        {/* Navigation */}
        <nav className="flex justify-between items-center py-8">
          <span className="text-[18px] font-bold tracking-tight text-fg">두레서울</span>
          <Magnetic>
            <GhostLink href="mailto:dureseoulofficial@gmail.com">CONTACT</GhostLink>
          </Magnetic>
        </nav>

        {/* Hero */}
        <section className="pt-[60px] pb-[76px] md:pt-[100px] md:pb-[120px]">
          <span className="text-[11px] font-mono tracking-widest uppercase mb-12 block text-muted">Seoul — Software Studio</span>
          <h2 className="text-[46px] md:text-[76px] font-bold mb-6 tracking-tight text-fg">두레</h2>
          <p className="text-[15px] md:text-[18px] font-mono text-muted mb-16 max-w-xl">
            DURE (두레) — Redefining the ancient infrastructure of collective intelligence for the AI era.
          </p>
          
          <div className="mb-12">
            <HeroHeadline text="WE ENGINEER SERENDIPITY." />
          </div>

          <AnimatedText 
            text="기술은 인프라이며, 서사는 사람에게 있습니다. 두레서울은 거대한 알고리즘 아래 숨겨진 당신의 고유한 가치를 발굴하고 연결하는 차세대 소프트웨어 스튜디오입니다."
            className="text-[18px] md:text-[34px] font-bold leading-tight max-w-4xl tracking-tight text-fg"
            delayOffset={0.5}
          />
        </section>

        {/* Section 01 */}
        <AnimatedSection border className="py-[76px] md:py-[120px] grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <span className="text-[11px] font-mono tracking-widest uppercase block mb-4 text-muted">01 / REDEFINING CONNECTION</span>
            <h3 className="text-[34px] md:text-[46px] font-bold leading-[0.9] tracking-tight uppercase text-fg">A new infrastructure for human singularity.</h3>
          </div>
          <div className="md:col-span-8 md:col-start-6 text-[18px] md:text-[34px] font-medium leading-[1.3] tracking-tight space-y-8 md:space-y-12 max-w-3xl text-fg">
            <AnimatedText text="과거의 두레가 물리적 노동의 교환이었다면, 우리가 짓는 두레는 '경험과 특이성'의 교환망입니다." />
            <AnimatedText text="기록되지 않아도 작동하던 고도의 신뢰망을, 이제 현대적인 소프트웨어의 정교함으로 다시 설계합니다. 이는 단순한 자선이 아니라, 가장 진보된 형태의 탈중앙화 인프라입니다." />
          </div>
        </AnimatedSection>

        {/* Section 02 */}
        <AnimatedSection border className="py-[76px] md:py-[120px] grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-4">
            <span className="text-[11px] font-mono tracking-widest uppercase block mb-4 text-muted">02 / BEYOND AUTOMATION</span>
            <h3 className="text-[34px] md:text-[46px] font-bold leading-[0.9] tracking-tight uppercase text-fg">Intelligence amplifies the specific.</h3>
          </div>
          <div className="md:col-span-8 md:col-start-6 text-[18px] md:text-[34px] font-medium leading-[1.3] tracking-tight space-y-8 md:space-y-12 max-w-3xl text-fg">
            <AnimatedText text="우리는 AI가 인간을 대체할 것이라는 서사에 동의하지 않습니다. 범용적인 작업이 자동화될수록, 오직 당신만이 가진 구체적인 경험과 비정형적인 지혜의 가치는 폭발적으로 상승합니다." />
            <AnimatedText text="두레서울은 이 대체 불가능한 특이성(Singularity)을 가장 필요로 하는 곳으로 흘려보내는 소프트웨어 엔진을 구축합니다." />
          </div>
        </AnimatedSection>

        {/* Section 03 */}
        <AnimatedSection border className="py-[76px] md:py-[120px]">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
            <div className="md:col-span-4">
              <span className="text-[11px] font-mono tracking-widest uppercase block mb-4 text-muted">03 / CRITICAL MASS</span>
              <h3 className="text-[34px] md:text-[46px] font-bold leading-[0.9] tracking-tight uppercase text-fg">Density engineered for serendipity.</h3>
            </div>
            <div className="md:col-span-8 md:col-start-6">
              <AnimatedText 
                text="단순히 사람이 많은 것이 아닙니다. 940만 명이라는 서울의 인구를 데이터로 해체하고, 서로가 서로의 결핍을 정확히 채워줄 수 있는 수학적 임계점(Critical Mass)을 찾아냅니다. 우연을 가장한 필연적인 만남이 이곳에서 발생합니다."
                className="text-[18px] md:text-[34px] font-medium leading-[1.3] tracking-tight max-w-3xl text-fg"
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center pt-12 md:pt-24 pb-8 border-t border-border">
            <div className="flex items-baseline gap-2">
              <span className="text-[76px] md:text-[103px] font-bold leading-[0.8] tracking-tighter text-fg">
                <Counter />
              </span>
              <span className="text-[34px] md:text-[46px] font-bold tracking-tight text-fg">만 명</span>
            </div>
            <p className="text-[15px] font-mono text-muted mt-6 max-w-md text-center">
              데이터가 엮어내는 연결의 노드. 이 압도적인 스케일이 완벽한 매칭의 기반입니다.
            </p>
          </div>
          
          <NetworkGraphic />
        </AnimatedSection>

        {/* Section 04 */}
        <AnimatedSection border className="py-[76px] md:py-[120px]">
          <div className="mb-16">
            <span className="text-[11px] font-mono tracking-widest uppercase block mb-4 text-muted">04 / OUR PROTOCOLS</span>
            <h3 className="text-[34px] md:text-[46px] font-bold leading-[0.9] tracking-tight uppercase max-w-md text-fg">Software as a catalyst.</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-grid bg-surface p-8 md:p-12 border border-border h-full flex flex-col justify-between min-h-[360px] group transition-colors hover:bg-border/30 duration-500 backdrop-blur-sm">
              <span className="text-[11px] font-mono tracking-widest uppercase block text-muted">Human-to-Human Matching</span>
              <div>
                <h4 className="text-[18px] md:text-[34px] font-bold leading-tight tracking-tight mb-6 text-fg">인지적 잉여를 가치로 환산하는 매칭 엔진.</h4>
                <p className="text-[15px] md:text-[18px] font-medium leading-snug text-muted group-hover:text-fg transition-colors">자격증이나 이력서가 증명하지 못하는 당신의 미세한 재능을, 정확히 그것을 갈망하는 단 한 사람의 수요와 실시간으로 동기화합니다.</p>
              </div>
            </div>
            
            <div className="bg-grid bg-surface p-8 md:p-12 border border-border h-full flex flex-col justify-between min-h-[360px] group transition-colors hover:bg-border/30 duration-500 backdrop-blur-sm">
              <span className="text-[11px] font-mono tracking-widest uppercase block text-muted">Immersive Interactive Fiction</span>
              <div>
                <h4 className="text-[18px] md:text-[34px] font-bold leading-tight tracking-tight mb-6 text-fg">선택이 세계관을 구축하는 인터랙티브 엔진.</h4>
                <p className="text-[15px] md:text-[18px] font-medium leading-snug text-muted group-hover:text-fg transition-colors">정해진 결말을 소비하는 것을 넘어, 당신의 직관적인 선택 하나하나가 고유한 서사로 렌더링되는 완전히 새로운 층위의 몰입형 콘텐츠를 설계합니다.</p>
              </div>
            </div>
          </div>
        </AnimatedSection>

        {/* Footer / Outro */}
        <AnimatedSection border className="pt-[76px] md:pt-[120px] pb-12">
          <div className="mb-16">
            <AnimatedText 
              text="우리는 소프트웨어가 사람을 대체하는 대신, 사람과 사람 사이의 해상도를 높이는 세계를 짓습니다. 새로운 밀도를 만드는 여정에 합류하세요."
              className="text-[18px] md:text-[34px] font-bold leading-tight tracking-tight max-w-4xl text-fg"
            />
            <WaitlistForm />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 pt-8 border-t border-border">
            <h2 className="text-[46px] md:text-[76px] font-bold leading-[0.8] tracking-tighter text-fg">두레</h2>
            
            <div className="flex flex-col md:flex-row gap-8 text-[11px] md:text-[13px] font-mono text-muted">
              <div className="flex flex-col gap-2">
                <Link href="/privacy" className="hover:text-fg transition-colors underline underline-offset-2">Privacy Policy</Link>
                <Link href="/terms" className="hover:text-fg transition-colors underline underline-offset-2">Terms of Service</Link>
                <Link href="/support" className="hover:text-fg transition-colors underline underline-offset-2">Support & Data Deletion</Link>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 hover:text-fg transition-colors">
                <span>주식회사 두레서울 · Dureseoul Inc., Seoul</span>
                <span>dureseoulofficial@gmail.com</span>
                <span>© 2026</span>
              </div>
            </div>
          </div>
        </AnimatedSection>
      </div>
    </main>
  );
}
