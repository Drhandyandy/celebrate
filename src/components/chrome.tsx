import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type SVGProps,
} from "react";

/* ------------------------------------------------------------------ */
/* motion helpers                                                      */
/* ------------------------------------------------------------------ */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const fn = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return reduced;
}

function useInView<T extends HTMLElement>(threshold = 0.15) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((en) => {
          if (en.isIntersecting) {
            el.classList.add("is-in");
            io.unobserve(el);
          }
        }),
      { threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);
  return ref;
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useInView<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* scramble-decode text                                                */
/* ------------------------------------------------------------------ */
const GLYPHS = "ABCDEF0123456789#Ξ฿◎+*/§";

export function Scramble({
  text,
  className = "",
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const reduced = usePrefersReducedMotion();
  const [out, setOut] = useState("");
  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }
    let frame = 0;
    let raf = 0;
    const tick = () => {
      frame++;
      const settled = Math.floor(frame / 2.4);
      let s = "";
      for (let i = 0; i < text.length; i++) {
        if (text[i] === " ") {
          s += " ";
          continue;
        }
        s += i < settled ? text[i] : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      setOut(s);
      if (settled < text.length) raf = requestAnimationFrame(tick);
      else setOut(text);
    };
    const t = window.setTimeout(() => {
      raf = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [text, reduced, delay]);
  return <span className={className}>{out || "\u00A0"}</span>;
}

/* ------------------------------------------------------------------ */
/* copy helper                                                         */
/* ------------------------------------------------------------------ */
export function useCopy(): { copied: string | null; copy: (id: string, text: string) => void } {
  const [copied, setCopied] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const copy = useCallback((id: string, text: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
    } catch {
      /* clipboard unavailable */
    }
    setCopied(id);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(null), 1400);
  }, []);
  return { copied, copy };
}

/* ------------------------------------------------------------------ */
/* clock                                                               */
/* ------------------------------------------------------------------ */
export function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return <span className="tabular-nums">{now.toUTCString().slice(17, 25)} UTC</span>;
}

/* ------------------------------------------------------------------ */
/* brand glyph                                                         */
/* ------------------------------------------------------------------ */
function KeyGlyph(p: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="square"
      width="1em"
      height="1em"
      {...p}
    >
      <circle cx="8" cy="12" r="4.4" />
      <path d="M12.4 12H21M18.2 12v3.2M15.2 12v2.3" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* top bar                                                             */
/* ------------------------------------------------------------------ */
const NAV = [
  { href: "#console", label: "console" },
  { href: "#tools", label: "instruments" },
  { href: "#method", label: "derivation" },
  { href: "#safety", label: "safety" },
];

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/80 bg-ink-950/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <a href="#console" className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center border border-phos-500/60 bg-phos-500/[0.08] text-phos-400 transition-shadow duration-300 group-hover:shadow-[0_0_18px_rgba(62,233,166,0.35)]">
            <KeyGlyph className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-display text-[15px] font-bold tracking-[0.18em] text-fog-100">
              KEYSWEEP<span className="text-phos-400">//256</span>
            </span>
            <span className="block font-mono text-[8.5px] tracking-[0.32em] uppercase text-fog-500">
              blockchain key console
            </span>
          </span>
        </a>
        <nav className="hidden items-center gap-7 font-mono text-[10.5px] tracking-[0.22em] uppercase md:flex">
          {NAV.map((n) => (
            <a
              key={n.href}
              href={n.href}
              className="text-fog-500 transition-colors duration-200 hover:text-phos-300"
            >
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-4 font-mono text-[11px] text-fog-400">
          <span className="hidden items-center gap-2 sm:flex">
            <i className="anim-led inline-block h-1.5 w-1.5 rounded-full bg-phos-400 text-phos-400" />
            local-only
          </span>
          <Clock />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* ticker                                                              */
/* ------------------------------------------------------------------ */
export function Ticker({ items }: { items: string[] }) {
  const track = [...items, ...items];
  return (
    <div className="ticker-mask overflow-hidden border-b border-ink-700/80 bg-ink-900/70">
      <div className="ticker-track flex w-max items-center whitespace-nowrap px-4 py-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-fog-500">
        {track.map((it, i) => (
          <span key={i} className="flex items-center">
            <span className="px-5">{it}</span>
            <span className="text-phos-500/60">▰</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* section head                                                        */
/* ------------------------------------------------------------------ */
export function SectionHead({
  index,
  kicker,
  title,
  children,
}: {
  index: string;
  kicker: string;
  title: ReactNode;
  children?: ReactNode;
}) {
  const hRef = useInView<HTMLHeadingElement>(0.3);
  return (
    <div className="mb-10">
      <Reveal>
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-phos-400">
          <span className="inline-block h-px w-10 bg-phos-400/70" />
          {index} / {kicker}
        </div>
      </Reveal>
      <h2
        ref={hRef}
        className="reveal-line mt-4 font-display text-3xl font-bold uppercase tracking-wide text-fog-100 sm:text-5xl"
      >
        {title}
      </h2>
      {children}
    </div>
  );
}
