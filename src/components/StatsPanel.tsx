import { useEffect, useRef, useState } from "react";
import type { ScanResult } from "../lib/engine";
import type { ScanState } from "../hooks/useScan";
import { usePrefersReducedMotion } from "./chrome";

const fmtMs = (ms: number) => `${(ms / 1000).toFixed(1)}s`;

function useCountUp(value: number, dur = 600): number {
  const reduced = usePrefersReducedMotion();
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  useEffect(() => {
    if (reduced) {
      setDisplay(value);
      prev.current = value;
      return;
    }
    const from = prev.current;
    prev.current = value;
    if (from === value) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, dur, reduced]);
  return display;
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="group relative border border-ink-700/70 bg-ink-900/60 px-3.5 py-3 transition-colors duration-300 hover:border-ink-500">
      <span className="absolute left-0 top-0 h-full w-0.5 origin-top scale-y-0 bg-phos-400 transition-transform duration-300 group-hover:scale-y-100" />
      <div className="font-mono text-[9.5px] tracking-[0.22em] uppercase text-fog-600">{label}</div>
      <div className={`mt-1 font-display text-xl font-bold tabular-nums tracking-wide sm:text-2xl ${accent ?? "text-fog-100"}`}>
        {value}
      </div>
    </div>
  );
}

export function StatsStrip({
  state,
  elapsed,
  scanned,
  expected,
  packets,
  progress,
  open,
  filtered,
}: {
  state: ScanState;
  elapsed: number;
  scanned: number;
  expected: number;
  packets: number;
  progress: number;
  open: number;
  filtered: number;
}) {
  const rate = elapsed > 400 ? Math.round(packets / (elapsed / 1000)) : 0;
  const pct = Math.round(progress * 100);
  const running = state === "running";

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="elapsed" value={fmtMs(elapsed)} />
        <Stat label="ports swept" value={`${scanned}${expected ? `/${expected}` : ""}`} />
        <Stat label="packets" value={packets.toLocaleString()} />
        <Stat label="rate" value={`${rate} p/s`} />
        <Stat label="open" value={String(open)} accent={open > 0 ? "text-phos-400" : undefined} />
        <Stat label="filtered" value={String(filtered)} accent={filtered > 0 ? "text-amberx-400" : undefined} />
      </div>
      <div className="mt-2 border border-ink-700/70 bg-ink-900/60">
        <div className="flex items-center justify-between px-3.5 py-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-fog-500">
          <span>sweep progress</span>
          <span className={running ? "text-amberx-400" : "text-fog-400"}>
            {running ? `active · ${pct}%` : pct === 100 ? "complete" : "standby"}
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden bg-ink-950">
          <div
            className="relative h-full bg-gradient-to-r from-phos-500 to-phos-400 transition-[width] duration-300 ease-out"
            style={{ width: `${pct}%` }}
          >
            {running && pct > 0 && pct < 100 && (
              <span className="absolute inset-y-0 right-0 w-6 bg-gradient-to-r from-transparent to-phos-300/70" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const BAND_COLOR = (s: number) => (s < 15 ? "#4fd8e8" : s < 40 ? "#3ee9a6" : s < 65 ? "#ffb454" : "#ff6b5e");

export function ExposureGauge({ result, state }: { result: ScanResult | null; state: ScanState }) {
  const score = result ? result.score : 0;
  const animated = useCountUp(score, 900);
  const color = BAND_COLOR(score);
  const R = 78;
  const C = Math.PI * R; // semicircle length
  const reduced = usePrefersReducedMotion();
  const offset = C * (1 - (reduced ? score : animated) / 100);

  return (
    <div className="panel corner-frame flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] tracking-[0.28em] uppercase text-fog-400">
          Exposure index
        </h3>
        <span
          className={`font-mono text-[10px] tracking-widest uppercase ${
            state === "running" ? "text-amberx-400" : result ? "text-fog-400" : "text-fog-600"
          }`}
        >
          {state === "running" ? "computing…" : result ? (result.aborted ? "partial" : "final") : "no data"}
        </span>
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[250px]">
        <svg viewBox="0 0 200 118" className="w-full">
          {[...Array(11)].map((_, i) => {
            const a = Math.PI - (i / 10) * Math.PI;
            const x1 = 100 + Math.cos(a) * 92;
            const y1 = 104 - Math.sin(a) * 92;
            const x2 = 100 + Math.cos(a) * (i % 5 === 0 ? 84 : 88);
            const y2 = 104 - Math.sin(a) * (i % 5 === 0 ? 84 : 88);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#1d4150" strokeWidth="1.4" />;
          })}
          <path d={`M ${100 - R} 104 A ${R} ${R} 0 0 1 ${100 + R} 104`} fill="none" stroke="#14303a" strokeWidth="10" />
          <path
            d={`M ${100 - R} 104 A ${R} ${R} 0 0 1 ${100 + R} 104`}
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeDasharray={C}
            strokeDashoffset={offset}
            style={{ transition: reduced ? "none" : "stroke-dashoffset 0.25s linear, stroke 0.5s" }}
          />
          <text x="100" y="86" textAnchor="middle" fontSize="34" fontWeight="700" fontFamily="Chakra Petch, sans-serif" fill={color}>
            {score === 0 && !result ? "—" : animated}
          </text>
          <text x="100" y="102" textAnchor="middle" fontSize="8.5" fontFamily="IBM Plex Mono, monospace" letterSpacing="2" fill="#5e7b80">
            / 100 EXPOSURE
          </text>
        </svg>
      </div>

      <div className="mt-1 text-center font-display text-[13px] font-semibold tracking-[0.14em]" style={{ color }}>
        {result ? result.verdict : "AWAITING SWEEP DATA"}
      </div>

      <div className="mt-4 min-h-[110px] flex-1 border-t border-ink-700/60 pt-3.5">
        <div className="font-mono text-[9.5px] tracking-[0.24em] uppercase text-fog-600">advisories</div>
        {result && result.advisories.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {result.advisories.map((a, i) => (
              <li key={i} className="flex gap-2 text-[12px] leading-snug text-fog-300">
                <span className="mt-0.5 font-mono text-[10px] text-amberx-400">{String(i + 1).padStart(2, "0")}</span>
                {a}
              </li>
            ))}
          </ul>
        ) : result ? (
          <p className="mt-2 text-[12px] leading-relaxed text-fog-500">
            No critical advisories — keep the perimeter tidy and re-scan after any infra change.
          </p>
        ) : (
          <p className="mt-2 text-[12px] leading-relaxed text-fog-600">
            Run a sweep to generate prioritized hardening steps, ranked by blast radius.
          </p>
        )}
      </div>
    </div>
  );
}
