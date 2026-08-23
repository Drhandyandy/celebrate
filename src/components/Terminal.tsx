import { useEffect, useRef } from "react";
import type { LogLine, LogLevel } from "../lib/engine";
import { IconTerminal } from "./icons";

const LEVEL_CLASS: Record<LogLevel, string> = {
  sys: "text-fog-500",
  info: "text-cyanx-300",
  ok: "text-phos-400",
  warn: "text-amberx-400",
  err: "text-alert-400",
  dim: "text-fog-600",
};

export default function Terminal({
  logs,
  running,
  onClear,
}: {
  logs: LogLine[];
  running: boolean;
  onClear: () => void;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs, running]);

  return (
    <div className="panel corner-frame scanlines flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <IconTerminal className="h-4 w-4 text-phos-400" />
          <span className="font-mono text-[11px] tracking-[0.24em] uppercase text-fog-300">
            tty1 · scan log
          </span>
          <span className="font-mono text-[10px] text-fog-600">{logs.length} lines</span>
        </div>
        <button
          onClick={onClear}
          className="border border-ink-600 px-2 py-0.5 font-mono text-[10px] tracking-widest uppercase text-fog-500 transition-colors hover:border-fog-500 hover:text-fog-200"
        >
          clear
        </button>
      </div>

      <div
        ref={bodyRef}
        className="term-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.65]"
        aria-live="polite"
      >
        {logs.length === 0 && (
          <div className="text-fog-600">
            <p><span className="text-phos-400">scnr@deck:~$</span> awaiting target …</p>
            <p className="mt-1">configure a sweep on the left and hit <span className="text-phos-300">INITIATE</span>.</p>
          </div>
        )}
        {logs.map((l) => (
          <div key={l.id} className="whitespace-pre-wrap break-words">
            <span className="mr-2 text-fog-600/80">[{l.t}]</span>
            <span className={LEVEL_CLASS[l.level]}>{l.text}</span>
          </div>
        ))}
        {running && (
          <div className="mt-1">
            <span className="text-phos-400">scnr@deck:~$</span>
            <span className="anim-cursor ml-2 inline-block h-3.5 w-2 translate-y-0.5 bg-phos-400" />
          </div>
        )}
      </div>
    </div>
  );
}
