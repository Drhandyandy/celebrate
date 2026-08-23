import type { HistoryEntry } from "../hooks/useScan";
import { PROFILE_LABEL } from "../lib/engine";
import { IconHistory } from "./icons";
import { Reveal } from "./chrome";

const scoreCls = (s: number) =>
  s < 15
    ? "border-cyanx-400/50 text-cyanx-300 bg-cyanx-400/10"
    : s < 40
      ? "border-phos-400/50 text-phos-300 bg-phos-400/10"
      : s < 65
        ? "border-amberx-400/50 text-amberx-300 bg-amberx-400/10"
        : "border-alert-400/50 text-alert-300 bg-alert-400/10";

export default function HistoryPanel({
  history,
  onLoad,
  onClear,
}: {
  history: HistoryEntry[];
  onLoad: (e: HistoryEntry) => void;
  onClear: () => void;
}) {
  return (
    <Reveal className="panel corner-frame overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <IconHistory className="h-4 w-4 text-phos-400" />
          <h3 className="font-mono text-[11px] tracking-[0.28em] uppercase text-fog-400">
            Session archive
          </h3>
          <span className="font-mono text-[11px] text-fog-600">{history.length} / 12 slots</span>
        </div>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="border border-ink-600 px-2.5 py-1.5 font-mono text-[10.5px] tracking-widest uppercase text-fog-500 transition-colors hover:border-alert-400/60 hover:text-alert-300"
          >
            purge archive
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <p className="font-display text-lg font-semibold text-fog-300">Archive empty</p>
          <p className="mx-auto mt-2 max-w-sm font-mono text-[11.5px] leading-relaxed text-fog-600">
            Completed and aborted sweeps are archived here (locally, in your browser) so you can
            replay a result without re-scanning.
          </p>
        </div>
      ) : (
        <ul className="term-scroll max-h-[420px] divide-y divide-ink-800/80 overflow-y-auto">
          {history.map((h) => (
            <li
              key={h.id}
              className="group flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3.5 transition-colors duration-200 hover:bg-ink-800/40"
            >
              <span className={`inline-flex w-16 justify-center border px-2 py-1 font-mono text-[11px] tabular-nums ${scoreCls(h.score)}`}>
                {h.score}
              </span>
              <div className="min-w-[150px] flex-1">
                <div className="font-mono text-[13px] text-fog-100">
                  {h.target}
                  {h.aborted && <span className="ml-2 text-[10px] tracking-widest text-amberx-400">ABORTED</span>}
                </div>
                <div className="mt-0.5 font-mono text-[10px] tracking-wider text-fog-600">
                  {new Date(h.at).toLocaleDateString()} {new Date(h.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}{PROFILE_LABEL[h.profile]} · {h.intensity}
                </div>
              </div>
              <div className="hidden font-mono text-[11px] text-fog-500 sm:block">
                <span className="text-phos-400">{h.open}</span> open ·{" "}
                <span className="text-amberx-400">{h.filtered}</span> filtered · {h.scanned} swept
              </div>
              <button
                onClick={() => onLoad(h)}
                className="border border-ink-600 px-3 py-1.5 font-mono text-[10.5px] tracking-widest uppercase text-fog-400 transition-all duration-200 hover:border-phos-400/70 hover:bg-phos-400/10 hover:text-phos-300"
              >
                replay ▸
              </button>
            </li>
          ))}
        </ul>
      )}
    </Reveal>
  );
}
