import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconBolt, IconGlobe, IconHazard, IconRadar, IconShield } from "./icons";

/* ------------------------------------------------------------------ */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <Tag
      ref={ref as never}
      className={`reveal ${inView ? "is-in" : ""} ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/* ------------------------------------------------------------------ */
const GLYPHS = "▓▒░<>/\\{}[]=+*#%@01";

export function Scramble({ text, className = "" }: { text: string; className?: string }) {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const [out, setOut] = useState(reduced ? text : "");
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setOut(text);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting || started.current) return;
        started.current = true;
        io.disconnect();
        const total = Math.max(14, text.length * 2);
        let frame = 0;
        const iv = window.setInterval(() => {
          frame++;
          const locked = Math.floor((frame / total) * text.length);
          let s = text.slice(0, locked);
          for (let i = locked; i < text.length; i++) {
            s += text[i] === " " ? " " : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
          }
          setOut(s);
          if (frame >= total) {
            setOut(text);
            window.clearInterval(iv);
          }
        }, 34);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text, reduced]);

  return (
    <span ref={ref} className={className} aria-label={text}>
      {out || "\u00A0"}
    </span>
  );
}

/* ------------------------------------------------------------------ */
export function SectionHead({
  index,
  title,
  kicker,
  children,
}: {
  index: string;
  title: string;
  kicker: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-10 md:mb-14">
      <Reveal>
        <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] text-phos-400 uppercase">
          <span className="inline-block h-px w-10 bg-phos-400/70" />
          {index} / {kicker}
        </div>
      </Reveal>
      <h2 className="reveal-line mt-4 font-display text-3xl font-bold uppercase tracking-wide text-fog-100 sm:text-4xl lg:text-5xl">
        <Scramble text={title} />
      </h2>
      {children && <Reveal delay={120}>{children}</Reveal>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const iv = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(iv);
  }, []);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="tabular-nums">
      {p(now.getHours())}:{p(now.getMinutes())}:{p(now.getSeconds())}
    </span>
  );
}

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-700/60 bg-ink-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <a href="#console" className="group flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center border border-phos-400/50 bg-ink-800 text-phos-400 transition-colors group-hover:bg-phos-400 group-hover:text-ink-950">
            <IconRadar className="h-4.5 w-4.5" />
          </span>
          <span className="font-display text-lg font-bold tracking-[0.12em] text-fog-100">
            SCNR<span className="text-phos-400">//09</span>
          </span>
          <span className="mt-0.5 hidden font-mono text-[10px] tracking-widest text-fog-500 sm:inline">
            v0.9.3
          </span>
        </a>

        <nav className="hidden items-center gap-7 font-mono text-[11px] tracking-[0.22em] uppercase text-fog-400 md:flex">
          {[
            ["#console", "Console"],
            ["#method", "Method"],
            ["#library", "Port library"],
            ["#history", "History"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="relative py-1 transition-colors hover:text-phos-300 after:absolute after:inset-x-0 after:bottom-0 after:h-px after:origin-left after:scale-x-0 after:bg-phos-400 after:transition-transform after:duration-300 hover:after:scale-x-100">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4 font-mono text-[11px] text-fog-400">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="anim-led inline-block h-1.5 w-1.5 rounded-full bg-phos-400 text-phos-400" />
            <span className="text-phos-300">LINK&nbsp;UP</span>
          </span>
          <span className="hidden text-fog-500 lg:inline">
            <Clock /> UTC<OffsetLabel />
          </span>
        </div>
      </div>
    </header>
  );
}

function OffsetLabel() {
  const off = -new Date().getTimezoneOffset() / 60;
  return <>{off >= 0 ? `+${off}` : off}</>;
}

/* ------------------------------------------------------------------ */
const INTEL = [
  "SHODAN PULSE — 4.2M RDP listeners exposed on 3389",
  "CISA KEV — 12 entries added this week, 3 actively exploited",
  "GREYNOISE — mass-scanning wave targeting Redis 6379 (unauthenticated)",
  "CVE-2018-14847 MikroTik Winbox credential disclosure — still ranking in top-10 exploit traffic",
  "CENSYS — 61% of public HTTPS hosts still negotiate TLS 1.0 somewhere in the chain",
  "HONEYPOT NET — SMB/445 probes up 38% week-over-week",
  "ADVISORY — memcached UDP amplification factor 51,000× — disable listener",
  "LEAK CHECK — 27017 open MongoDB clusters ransomed in the last 30 days",
];

export function Ticker() {
  const items = [...INTEL, ...INTEL];
  return (
    <div className="ticker-mask overflow-hidden border-b border-ink-700/60 bg-ink-900/80">
      <div className="ticker-track flex w-max items-center gap-0 py-2">
        {items.map((line, i) => (
          <span key={i} className="flex items-center gap-3 px-6 font-mono text-[11px] tracking-wider text-fog-400 whitespace-nowrap">
            <IconBolt className="h-3 w-3 shrink-0 text-amberx-400" />
            {line}
            <span className="pl-6 text-ink-600">///</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
export function Footer() {
  return (
    <footer className="relative border-t border-ink-700/60 bg-ink-900/60">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center border border-phos-400/50 text-phos-400">
                <IconRadar className="h-4.5 w-4.5" />
              </span>
              <span className="font-display text-lg font-bold tracking-[0.12em]">
                SCNR<span className="text-phos-400">//09</span>
              </span>
            </div>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-fog-400">
              A reconnaissance console for people who'd rather find the open door
              before someone else does. Every sweep on this page is a deterministic
              simulation — no packets leave your browser.
            </p>
            <div className="mt-6 flex items-center gap-2 font-mono text-[11px] tracking-widest text-fog-500">
              <IconShield className="h-4 w-4 text-phos-400" />
              SCAN RESPONSIBLY · AUTHORIZED NETWORKS ONLY
            </div>
          </div>
          <div>
            <h3 className="font-mono text-[11px] tracking-[0.3em] uppercase text-fog-500">Deck</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-fog-300">
              {[
                ["#console", "Operations console"],
                ["#method", "Scan methodology"],
                ["#library", "Port library"],
                ["#history", "Session history"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="transition-colors hover:text-phos-300">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-[11px] tracking-[0.3em] uppercase text-fog-500">Field rules</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-fog-300">
              <li className="flex gap-2">
                <IconGlobe className="mt-0.5 h-4 w-4 shrink-0 text-cyanx-400" />
                Never scan a network you don't own or have written permission to test.
              </li>
              <li className="flex gap-2">
                <IconHazard className="mt-0.5 h-4 w-4 shrink-0 text-amberx-400" />
                Rate-limit aggressive profiles — sweep noise trips IDS/IPS fast.
              </li>
              <li className="flex gap-2">
                <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-phos-400" />
                Log every scan. Timestamps and scope are your audit trail.
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-ink-700/60 pt-6 font-mono text-[11px] tracking-wider text-fog-600 sm:flex-row sm:items-center">
          <span>SCNR//09 · build 2026.02 · deterministic simulation engine</span>
          <span>
            deck time <Clock /> · session encrypted at rest <span className="text-phos-400">▮</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
