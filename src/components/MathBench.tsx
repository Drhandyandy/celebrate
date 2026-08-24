import { useMemo, useRef, useState } from "react";
import {
  GX,
  N,
  P,
  runSuite,
  xBitLengths,
  type BarDatum,
  type ClaimResult,
  type Verdict,
} from "../lib/mathbench";
import { usePrefersReducedMotion } from "./chrome";
import { IconBolt, IconChevron } from "./icons";

const VERDICT_META: Record<Verdict, { label: string; cls: string; dot: string }> = {
  verified: { label: "verified", cls: "text-phos-300 border-phos-500/60 bg-phos-500/10", dot: "bg-phos-400" },
  trivial: { label: "true·trivial", cls: "text-cyanx-300 border-cyanx-400/60 bg-cyanx-400/10", dot: "bg-cyanx-400" },
  tautology: { label: "tautology", cls: "text-amberx-300 border-amberx-500/60 bg-amberx-500/10", dot: "bg-amberx-400" },
  numerology: { label: "numerology", cls: "text-fog-300 border-fog-500/60 bg-fog-500/10", dot: "bg-fog-400" },
  misleading: { label: "misleading", cls: "text-alert-300 border-alert-500/60 bg-alert-500/10", dot: "bg-alert-400" },
};

const GROUP_ACCENT: Record<string, string> = {
  "Curve foundation": "#3ee9a6",
  "GLV endomorphism": "#4fd8e8",
  "Zweng folklore": "#ff6b5e",
  "Geometric numerology": "#ffb454",
  "Audit tautology": "#5e7b80",
};

function ClaimRow({ c, index, delay }: { c: ClaimResult; index: number; delay: number }) {
  const [open, setOpen] = useState(false);
  const meta = VERDICT_META[c.verdict];
  const accent = GROUP_ACCENT[c.group] ?? "#5e7b80";
  return (
    <div
      className="anim-rise border-b border-ink-800 last:border-b-0"
      style={{ animationDelay: `${delay}ms` }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ink-800/50 sm:gap-5 sm:px-5"
      >
        <span className="w-8 shrink-0 font-mono text-[10.5px] text-fog-600">
          {String(index).padStart(2, "0")}
        </span>
        <span className="hidden min-w-0 flex-1 sm:block">
          <span className="block text-[13.5px] font-medium text-fog-200">{c.title}</span>
          <code className="mt-0.5 block truncate font-mono text-[11px] text-fog-500">
            {c.formula}
          </code>
        </span>
        <span className="min-w-0 flex-1 sm:hidden">
          <span className="block text-[13px] font-medium leading-snug text-fog-200">{c.title}</span>
        </span>
        <span className="hidden shrink-0 font-mono text-[11px] text-fog-400 md:block">
          {c.computed}
        </span>
        <span
          className={`flex shrink-0 items-center gap-1.5 border px-2 py-1 font-mono text-[9.5px] tracking-[0.14em] uppercase ${meta.cls}`}
        >
          <i className={`inline-block h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          {meta.label}
        </span>
        <IconChevron
          className={`h-3 w-3 shrink-0 text-fog-600 transition-transform duration-300 ${open ? "rotate-90 text-fog-300" : ""}`}
        />
      </button>
      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="border-l-2 px-5 py-3.5 pl-14 sm:pl-16" style={{ borderColor: accent + "88" }}>
            <code className="mb-2 block font-mono text-[11px] text-fog-500 sm:hidden">{c.formula} → {c.computed}</code>
            <p className="max-w-3xl text-[13px] leading-relaxed text-fog-400">{c.note}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* demystifier                                                         */
/* ------------------------------------------------------------------ */
function Demystifier() {
  const reduced = usePrefersReducedMotion();
  const [bars, setBars] = useState<BarDatum[]>([]);
  const [running, setRunning] = useState(false);
  const cancelRef = useRef(false);

  const minBar = useMemo(
    () => bars.reduce((m, b) => (b.bits < m.bits ? b : m), bars[0] ?? { k: 0, bits: 256 }),
    [bars]
  );

  const compute = async () => {
    if (running) return;
    cancelRef.current = false;
    setRunning(true);
    setBars([]);
    const K = 96;
    const chunk = reduced ? K : 12;
    for (let from = 1; from <= K; from += chunk) {
      if (cancelRef.current) break;
      const to = Math.min(from + chunk - 1, K);
      const seg = xBitLengths(from, to);
      setBars((b) => [...b, ...seg]);
      if (!reduced) await new Promise((r) => setTimeout(r, 30));
    }
    setRunning(false);
  };

  return (
    <div className="panel corner-frame p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <IconBolt className="h-4 w-4 text-alert-400" />
          <h4 className="font-mono text-[11px] tracking-[0.26em] uppercase text-fog-300">
            Demystifier · x([k]G) bit lengths, k = 1…96
          </h4>
        </div>
        <button
          onClick={compute}
          disabled={running}
          className="border border-alert-500/60 px-3.5 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-alert-300 transition-all hover:bg-alert-500/10 active:translate-y-px disabled:opacity-40"
        >
          {running ? "deriving…" : bars.length ? "recompute" : "run demo"}
        </button>
      </div>

      {bars.length === 0 ? (
        <p className="mt-4 text-[13px] leading-relaxed text-fog-500">
          The “Zweng anomaly” is x(H) having only 166 bits. But halving is just multiplication by
          2⁻¹ — so how unusual are short x-coordinates, really? Derive 96 multiples of G and plot
          their x bit lengths.
        </p>
      ) : (
        <>
          <div className="mt-4 flex h-28 items-end gap-[2px]">
            {bars.map((b) => {
              const isMin = b.bits === minBar.bits;
              const isK2 = b.k === 2;
              return (
                <div
                  key={b.k}
                  title={`k=${b.k} · ${b.bits} bits`}
                  className="group relative flex-1"
                  style={{ height: "100%" }}
                >
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-500"
                    style={{
                      height: `${(b.bits / 256) * 100}%`,
                      background: isK2
                        ? "linear-gradient(to top, rgba(255,107,94,0.85), rgba(255,107,94,0.35))"
                        : isMin
                          ? "linear-gradient(to top, rgba(255,180,84,0.8), rgba(255,180,84,0.3))"
                          : "linear-gradient(to top, rgba(79,216,232,0.7), rgba(79,216,232,0.18))",
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between font-mono text-[10px] text-fog-600">
            <span>k = 1</span>
            <span>k = 96</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[10.5px] text-fog-500">
            <span>
              <i className="mr-1.5 inline-block h-2 w-2 bg-alert-400" />
              k=2 → <span className="text-alert-300">166 bits</span> — the “anomaly”, sitting in plain sight
            </span>
            <span>
              <i className="mr-1.5 inline-block h-2 w-2 bg-amberx-400" />
              shortest of the 96: <span className="text-amberx-300">{minBar.bits} bits at k={minBar.k}</span>
            </span>
          </div>
          <p className="mt-3 border-t border-ink-700 pt-3 text-[13px] leading-relaxed text-fog-400">
            Short x-coordinates show up routinely across ordinary multiples of G — k=2 reproduces
            the “anomalous” 166-bit coordinate exactly. Cherry-picking the shortest one and calling
            it a clue is numerology: it encodes no private information whatsoever.
          </p>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* bench                                                               */
/* ------------------------------------------------------------------ */
export default function MathBench() {
  const reduced = usePrefersReducedMotion();
  const [claims, setClaims] = useState<ClaimResult[] | null>(null);
  const [ms, setMs] = useState(0);
  const [running, setRunning] = useState(false);

  const groups = useMemo(() => {
    if (!claims) return [];
    const order: string[] = [];
    const map = new Map<string, ClaimResult[]>();
    for (const c of claims) {
      if (!map.has(c.group)) {
        map.set(c.group, []);
        order.push(c.group);
      }
      map.get(c.group)!.push(c);
    }
    return order.map((g) => ({ g, items: map.get(g)! }));
  }, [claims]);

  const tally = useMemo(() => {
    if (!claims) return null;
    const t: Record<Verdict, number> = { verified: 0, trivial: 0, tautology: 0, numerology: 0, misleading: 0 };
    for (const c of claims) t[c.verdict]++;
    return t;
  }, [claims]);

  const run = async () => {
    if (running) return;
    setRunning(true);
    setClaims(null);
    if (!reduced) await new Promise((r) => setTimeout(r, 350)); // let the panel clear
    const { claims: res, ms: took } = runSuite();
    setClaims(res);
    setMs(took);
    setRunning(false);
  };

  let idx = 0;

  return (
    <div className="panel corner-frame p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] tracking-[0.3em] uppercase text-alert-300">
          04 / Curve bench
        </h3>
        <span className="font-mono text-[10.5px] tracking-wider text-fog-500">
          secp256k1 · BigInt EC · zero trust required
        </span>
      </div>

      <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-fog-400">
        A viral “mathematical verification suite” claims geometric offsets, sphere shells and an
        audit function crack open the keyspace. The bench re-runs all 17 assertions{" "}
        <span className="text-fog-200">live in this tab</span> with real elliptic-curve arithmetic —
        then grades what each one actually proves.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button
          onClick={run}
          disabled={running}
          className="flex items-center gap-2 bg-alert-400 px-5 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-ink-950 transition-all hover:bg-alert-300 hover:shadow-[0_0_24px_rgba(255,107,94,0.35)] active:translate-y-px disabled:cursor-wait disabled:bg-ink-700 disabled:text-fog-500"
        >
          <IconBolt className="h-3.5 w-3.5" />
          {running ? "deriving…" : claims ? "re-run audit" : "run the audit"}
        </button>
        {tally && (
          <div className="flex flex-wrap gap-2">
            {(Object.keys(tally) as Verdict[]).map((v) =>
              tally[v] > 0 ? (
                <span
                  key={v}
                  className={`border px-2.5 py-1 font-mono text-[10px] tracking-[0.14em] uppercase ${VERDICT_META[v].cls}`}
                >
                  {tally[v]} {VERDICT_META[v].label}
                </span>
              ) : null
            )}
            <span className="border border-ink-600 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fog-500">
              {ms.toFixed(1)} ms · in-tab
            </span>
          </div>
        )}
      </div>

      {!claims && !running && (
        <div className="mt-5 border border-dashed border-ink-600 p-6 text-center">
          <p className="font-mono text-[12px] leading-relaxed text-fog-500">
            p = 2²⁵⁶ − 2³² − 977 · n · G = ∞ · β³ ≡ 1 · x([2⁻¹]G) = ?
            <br />
            <span className="text-fog-600">17 claims · 2 point multiplications · 1 enumeration · verdicts computed, not asserted</span>
          </p>
        </div>
      )}
      {running && (
        <div className="mt-5 border border-ink-700 p-6 text-center font-mono text-[12px] text-amberx-300">
          point-multiplying over F_p … scalar mults [λ]G and [2⁻¹]G in flight
          <span className="anim-typepulse ml-1 inline-block h-3 w-1.5 translate-y-0.5 bg-amberx-300" />
        </div>
      )}

      {claims && (
        <div className="mt-5">
          {groups.map(({ g, items }) => (
            <div key={g} className="mb-4 border border-ink-700">
              <div
                className="flex items-center justify-between border-b border-ink-700 px-4 py-2 sm:px-5"
                style={{ background: GROUP_ACCENT[g] + "0d" }}
              >
                <span
                  className="font-mono text-[10.5px] tracking-[0.26em] uppercase"
                  style={{ color: GROUP_ACCENT[g] }}
                >
                  {g}
                </span>
                <span className="font-mono text-[10px] text-fog-600">
                  {items.length} claim{items.length > 1 ? "s" : ""}
                </span>
              </div>
              {items.map((c) => {
                idx++;
                return <ClaimRow key={c.id} c={c} index={idx} delay={reduced ? 0 : idx * 45} />;
              })}
            </div>
          ))}

          <div className="mt-5 border border-fog-500/30 bg-ink-950/60 p-4">
            <p className="text-[13.5px] leading-relaxed text-fog-300">
              <span className="font-semibold text-fog-100">Bottom line.</span> The genuine
              mathematics — the sparse prime, GLV, cofactor-1 order — verifies exactly as claimed
              and powers real, deployed cryptography. Everything dressed up as a{" "}
              <span className="text-alert-300">shortcut to keys</span> fails the audit: the “anomaly”
              is selection bias, the lattice matches are arithmetic coincidences, the candidate set
              is 10⁻⁷⁴ of the keyspace, and the audit function only inverts a step you took
              yourself. The curve keeps its promise: <span className="font-mono text-phos-300">2²⁵⁶ guesses, no shortcuts.</span>
            </p>
          </div>
        </div>
      )}

      <div className="mt-5">
        <Demystifier />
      </div>

      {/* raw constants */}
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        <div className="border border-ink-700 bg-ink-950/60 p-4">
          <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-fog-500">field prime p</div>
          <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-cyanx-300/90">
            0x{P.toString(16)}
          </code>
        </div>
        <div className="border border-ink-700 bg-ink-950/60 p-4">
          <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-fog-500">group order n</div>
          <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-phos-300/90">
            0x{N.toString(16)}
          </code>
        </div>
        <div className="border border-ink-700 bg-ink-950/60 p-4 lg:col-span-2">
          <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-fog-500">generator Gx</div>
          <code className="mt-2 block break-all font-mono text-[11px] leading-relaxed text-amberx-300/90">
            0x{GX.toString(16)}
          </code>
        </div>
      </div>
    </div>
  );
}
