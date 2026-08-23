import { useMemo, useRef, useState } from "react";
import {
  WORDS,
  isWord,
  generateDemoMnemonic,
  runRecovery,
  type RecoveryCandidate,
} from "../lib/keys";
import { probeAddress, type ProbeResult } from "../lib/chains";
import { useCopy } from "./chrome";
import { IconHazard, IconPlay, IconStop } from "./icons";

type Phase = "idle" | "sweeping" | "probing" | "done";

const EMPTY_SLOTS = (): string[] => Array(12).fill("");

export default function RecoveryLab() {
  const [slots, setSlots] = useState<string[]>(EMPTY_SLOTS());
  const [unknown, setUnknown] = useState<boolean[]>(Array(12).fill(false));
  const [phase, setPhase] = useState<Phase>("idle");
  const [tested, setTested] = useState(0);
  const [total, setTotal] = useState(0);
  const [found, setFound] = useState<RecoveryCandidate[]>([]);
  const [probeMode, setProbeMode] = useState(false);
  const [balances, setBalances] = useState<Record<number, ProbeResult>>({});
  const [funded, setFunded] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const cancelRef = useRef(false);
  const { copied, copy } = useCopy();

  const unknownIdx = useMemo(
    () => unknown.map((u, i) => (u ? i : -1)).filter((i) => i >= 0),
    [unknown]
  );
  const invalidWords = useMemo(
    () =>
      slots
        .map((w, i) => ({ w, i }))
        .filter(({ w, i }) => !unknown[i] && w.trim() !== "" && !isWord(w.trim()))
        .map(({ i }) => i),
    [slots, unknown]
  );
  const missingKnown = slots.some(
    (w, i) => !unknown[i] && w.trim() === ""
  );
  const candidates = Math.pow(WORDS.length, unknownIdx.length);
  const running = phase === "sweeping" || phase === "probing";
  const canStart =
    !running &&
    unknownIdx.length >= 1 &&
    unknownIdx.length <= 2 &&
    invalidWords.length === 0 &&
    !missingKnown;

  const toggleUnknown = (i: number) => {
    if (running) return;
    setUnknown((u) => {
      const next = u.slice();
      if (!next[i] && unknownIdx.length >= 2) return u; // cap at 2
      next[i] = !next[i];
      return next;
    });
    if (!unknown[i]) setSlots((s) => s.map((w, j) => (j === i ? "" : w)));
    setFound([]);
    setBalances({});
    setFunded(null);
    setPhase("idle");
  };

  const demo = () => {
    if (running) return;
    const words = generateDemoMnemonic().split(" ");
    setSlots(words.map((w, i) => (i === 11 ? "" : w)));
    setUnknown(words.map((_, i) => i === 11));
    setFound([]);
    setBalances({});
    setFunded(null);
    setPhase("idle");
    setTested(0);
    setTotal(WORDS.length);
  };

  const abort = () => {
    cancelRef.current = true;
  };

  const start = async () => {
    cancelRef.current = false;
    setPhase("sweeping");
    setFound([]);
    setBalances({});
    setFunded(null);
    setTested(0);
    setTotal(candidates);
    const t0 = performance.now();
    const tick = window.setInterval(
      () => setElapsed((performance.now() - t0) / 1000),
      200
    );

    const outcome = await runRecovery({
      slots,
      unknowns: unknownIdx,
      cancelled: () => cancelRef.current,
      onBatch: (te, _to, fd) => {
        setTested(te);
        setFound(fd);
      },
    });
    setTested(outcome.tested);
    setFound(outcome.found);
    window.clearInterval(tick);
    setElapsed((performance.now() - t0) / 1000);

    if (probeMode && outcome.found.length > 0 && !cancelRef.current) {
      setPhase("probing");
      const batch = outcome.found.slice(0, 64);
      for (const c of batch) {
        if (cancelRef.current) break;
        try {
          const res = await probeAddress(c.address);
          setBalances((b) => ({ ...b, [c.idx]: res }));
          if (res.balanceNum > 0 && funded === null) setFunded(c.idx);
        } catch {
          /* offline — keep listing candidates */
        }
        await new Promise((r) => setTimeout(r, 140));
      }
    }
    setPhase("done");
  };

  const pct = total > 0 ? Math.min(100, (tested / total) * 100) : 0;
  const rate = elapsed > 0.2 ? Math.round(tested / elapsed) : 0;

  return (
    <div className="panel corner-frame p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] tracking-[0.3em] uppercase text-amberx-400">
          02 / Recovery lab
        </h3>
        <span
          className={`flex items-center gap-2 font-mono text-[10.5px] tracking-[0.2em] uppercase ${
            phase === "sweeping" || phase === "probing"
              ? "text-amberx-300"
              : phase === "done"
                ? "text-phos-300"
                : "text-fog-500"
          }`}
        >
          <i
            className={`anim-led inline-block h-1.5 w-1.5 rounded-full ${
              phase === "sweeping" || phase === "probing"
                ? "bg-amberx-400 text-amberx-400"
                : phase === "done"
                  ? "bg-phos-400 text-phos-400"
                  : "bg-fog-600 text-fog-600"
            }`}
          />
          {phase === "idle" ? "armed" : phase === "sweeping" ? "deriving candidates" : phase === "probing" ? "probing chain" : "sweep complete"}
        </span>
      </div>

      <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-fog-400">
        Remember most of a seed but not all of it? Mark up to <span className="text-amberx-300">two words</span> as
        unknown — the lab derives every checksum-valid combination locally and lists the resulting
        ETH addresses. Rebuild <span className="text-fog-200">your own</span> wallet, nothing else.
      </p>

      {/* word grid */}
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {slots.map((w, i) => {
          const isU = unknown[i];
          const bad = invalidWords.includes(i);
          return (
            <div
              key={i}
              className={`relative border transition-colors ${
                isU
                  ? "border-amberx-500/60 bg-amberx-500/[0.07]"
                  : bad
                    ? "border-alert-500/70 bg-alert-500/[0.05]"
                    : "border-ink-600 bg-ink-950/70 focus-within:border-phos-500/60"
              }`}
            >
              <span className="pointer-events-none absolute left-1.5 top-1 font-mono text-[8.5px] text-fog-600">
                {String(i + 1).padStart(2, "0")}
              </span>
              <input
                value={isU ? "?" : w}
                onChange={(e) =>
                  setSlots((s) => s.map((x, j) => (j === i ? e.target.value.toLowerCase().trim() : x)))
                }
                disabled={isU || running}
                spellCheck={false}
                autoComplete="off"
                className="w-full bg-transparent px-2 pb-1.5 pt-4 font-mono text-[12px] text-fog-100 outline-none disabled:cursor-not-allowed disabled:text-amberx-300"
                placeholder="word"
              />
              <button
                onClick={() => toggleUnknown(i)}
                disabled={running}
                title={isU ? "lock this word back" : "mark as unknown"}
                className={`absolute right-1 top-1 h-5 w-5 border font-mono text-[10px] leading-none transition-all disabled:opacity-40 ${
                  isU
                    ? "border-amberx-400 bg-amberx-400/20 text-amberx-300"
                    : "border-ink-600 text-fog-600 hover:border-amberx-400 hover:text-amberx-300"
                }`}
              >
                ?
              </button>
            </div>
          );
        })}
      </div>

      {invalidWords.length > 0 && (
        <p className="mt-2 font-mono text-[11px] text-alert-300">
          word(s) {invalidWords.map((i) => i + 1).join(", ")} not in the BIP39 list
        </p>
      )}

      {/* controls */}
      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3">
        <button
          onClick={start}
          disabled={!canStart}
          className="flex items-center gap-2 bg-phos-400 px-5 py-2.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-ink-950 transition-all hover:bg-phos-300 hover:shadow-[0_0_24px_rgba(62,233,166,0.35)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-fog-500"
        >
          <IconPlay className="h-3.5 w-3.5" />
          initiate sweep
        </button>
        {running && (
          <button
            onClick={abort}
            className="flex items-center gap-2 border border-alert-500/70 px-4 py-2.5 font-mono text-[11px] tracking-[0.18em] uppercase text-alert-300 transition-all hover:bg-alert-500/10 active:translate-y-px"
          >
            <IconStop className="h-3 w-3" /> abort
          </button>
        )}
        <button
          onClick={demo}
          disabled={running}
          className="border border-ink-600 px-3.5 py-2.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-fog-400 transition-all hover:border-amberx-400/60 hover:text-amberx-300 active:translate-y-px disabled:opacity-40"
        >
          load demo seed
        </button>
        <button
          onClick={() => setProbeMode((p) => !p)}
          disabled={running}
          className={`border px-3.5 py-2.5 font-mono text-[10.5px] tracking-[0.18em] uppercase transition-all active:translate-y-px disabled:opacity-40 ${
            probeMode
              ? "border-cyanx-400/70 bg-cyanx-400/10 text-cyanx-300"
              : "border-ink-600 text-fog-500 hover:border-cyanx-400/50 hover:text-cyanx-300"
          }`}
        >
          probe balances on-chain · {probeMode ? "on" : "off"}
        </button>
        <span className="ml-auto font-mono text-[11px] text-fog-500">
          search space <span className="text-fog-200">{candidates.toLocaleString()}</span> combos
        </span>
      </div>

      {/* progress */}
      {(running || phase === "done") && (
        <div className="mt-5 border border-ink-700 bg-ink-950/60 p-4">
          <div className="h-2 w-full overflow-hidden bg-ink-700">
            <div
              className={`h-full transition-[width] duration-150 ${
                phase === "probing" ? "bg-cyanx-400" : "bg-phos-400"
              }`}
              style={{ width: `${phase === "probing" ? 100 : pct}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] text-fog-500">
            <span>
              tested <span className="text-fog-100">{tested.toLocaleString()}</span> / {total.toLocaleString()}
            </span>
            <span>
              checksum-valid <span className="text-phos-300">{found.length}</span>
            </span>
            <span>
              rate <span className="text-fog-100">{rate.toLocaleString()}</span>/s
            </span>
            <span>
              elapsed <span className="text-fog-100">{elapsed.toFixed(1)}s</span>
            </span>
          </div>
        </div>
      )}

      {funded !== null && balances[funded] && (
        <div className="mt-4 flex items-center gap-3 border border-phos-500/60 bg-phos-500/[0.08] p-4">
          <IconHazard className="h-5 w-5 shrink-0 text-phos-400" />
          <p className="font-mono text-[12.5px] text-phos-300">
            on-chain match — candidate #{funded} holds {balances[funded].balanceDisplay} ·{" "}
            <a
              href={balances[funded].explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-4 hover:text-phos-400"
            >
              view in explorer ↗
            </a>
          </p>
        </div>
      )}

      {/* candidate table */}
      {found.length > 0 && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
              valid candidates · first {Math.min(found.length, 300)} shown
            </span>
            <span className="font-mono text-[10.5px] text-fog-600">path m/44'/60'/0'/0/0</span>
          </div>
          <div className="term-scroll mt-2 max-h-80 overflow-y-auto border border-ink-700">
            {found.slice(0, 300).map((c) => {
              const bal = balances[c.idx];
              const isFunded = funded === c.idx;
              return (
                <div
                  key={c.idx}
                  className={`group flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink-800 px-3.5 py-2.5 transition-colors last:border-b-0 ${
                    isFunded ? "bg-phos-500/[0.07]" : "hover:bg-ink-800/50"
                  }`}
                >
                  <span className="w-14 shrink-0 font-mono text-[10px] text-fog-600">
                    #{String(c.idx).padStart(4, "0")}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-fog-400">
                    {c.words.map((w, i) =>
                      unknownIdx.includes(i) ? (
                        <em key={i} className="not-italic text-amberx-300">
                          {w}{" "}
                        </em>
                      ) : (
                        <span key={i}>{w} </span>
                      )
                    )}
                  </span>
                  <code className="hidden font-mono text-[11px] text-fog-300 md:inline">
                    {c.address.slice(0, 10)}…{c.address.slice(-8)}
                  </code>
                  {bal && (
                    <span className={`font-mono text-[10.5px] ${bal.balanceNum > 0 ? "text-phos-300" : "text-fog-600"}`}>
                      {bal.balanceDisplay}
                    </span>
                  )}
                  <button
                    onClick={() => copy(String(c.idx), c.words.join(" "))}
                    className="border border-ink-600 px-2 py-0.5 font-mono text-[9px] tracking-[0.16em] uppercase text-fog-600 opacity-0 transition-all hover:border-fog-500 hover:text-fog-200 group-hover:opacity-100"
                  >
                    {copied === String(c.idx) ? "copied ✓" : "copy seed"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
