import { useState } from "react";
import type { PortRecord, ScanResult } from "../lib/engine";
import type { ScanState } from "../hooks/useScan";
import { download } from "../lib/engine";
import { IconChevron, IconDownload } from "./icons";
import { Reveal } from "./chrome";

const RISK_META: Record<number, { label: string; cls: string; dot: string }> = {
  0: { label: "INFO", cls: "text-cyanx-300 border-cyanx-400/40 bg-cyanx-400/10", dot: "bg-cyanx-400" },
  1: { label: "LOW", cls: "text-phos-300 border-phos-400/40 bg-phos-400/10", dot: "bg-phos-400" },
  2: { label: "HIGH", cls: "text-amberx-300 border-amberx-400/40 bg-amberx-400/10", dot: "bg-amberx-400" },
  3: { label: "CRIT", cls: "text-alert-300 border-alert-400/40 bg-alert-400/10", dot: "bg-alert-400" },
};

function EmptyState({ running }: { running: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <svg viewBox="0 0 120 80" className="h-20 w-32 text-ink-600">
        <rect x="8" y="10" width="104" height="60" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" />
        <path d="M20 40h18l6-12 8 24 6-12h42" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle cx="100" cy="22" r="3" fill="currentColor" />
      </svg>
      <div>
        <p className="font-display text-lg font-semibold tracking-wide text-fog-300">
          {running ? "Contacts incoming…" : "No contacts on scope"}
        </p>
        <p className="mt-1.5 max-w-sm font-mono text-[11.5px] leading-relaxed text-fog-600">
          {running
            ? "Open and filtered services will materialize here as the sweep progresses."
            : "Initiate a sweep and every open or filtered service will be logged here with banner, latency and risk grade."}
        </p>
      </div>
    </div>
  );
}

export default function ResultsTable({
  ports,
  result,
  state,
}: {
  ports: PortRecord[];
  result: ScanResult | null;
  state: ScanState;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const rows = ports.filter((p) => p.status !== "closed");
  const running = state === "running";

  const exportJson = () => {
    if (!result) return;
    download(
      `scnr_${result.target.replace(/[^a-z0-9.-]/gi, "_")}.json`,
      "application/json",
      JSON.stringify(result, null, 2)
    );
  };
  const exportCsv = () => {
    if (!result) return;
    const head = "port,proto,service,status,rtt_ms,risk,banner";
    const body = result.ports
      .map((p) => [p.port, p.proto, p.service, p.status, p.rtt, p.risk, `"${p.banner.replace(/"/g, '""')}"`].join(","))
      .join("\n");
    download(`scnr_${result.target.replace(/[^a-z0-9.-]/gi, "_")}.csv`, "text/csv", `${head}\n${body}`);
  };

  return (
    <Reveal className="panel corner-frame overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-700/70 px-5 py-3.5">
        <div className="flex items-baseline gap-3">
          <h3 className="font-mono text-[11px] tracking-[0.28em] uppercase text-fog-400">
            Contact report
          </h3>
          <span className="font-mono text-[11px] text-phos-400">
            {rows.length} open/filtered
            {result && <span className="text-fog-600"> · {result.closed} closed</span>}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportJson}
            disabled={!result}
            className="flex items-center gap-1.5 border border-ink-600 px-2.5 py-1.5 font-mono text-[10.5px] tracking-widest uppercase text-fog-400 transition-colors hover:border-phos-400/60 hover:text-phos-300 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <IconDownload className="h-3.5 w-3.5" /> json
          </button>
          <button
            onClick={exportCsv}
            disabled={!result}
            className="flex items-center gap-1.5 border border-ink-600 px-2.5 py-1.5 font-mono text-[10.5px] tracking-widest uppercase text-fog-400 transition-colors hover:border-phos-400/60 hover:text-phos-300 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <IconDownload className="h-3.5 w-3.5" /> csv
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState running={running} />
      ) : (
        <div className="term-scroll overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-ink-700/70 font-mono text-[9.5px] tracking-[0.24em] uppercase text-fog-600">
                <th className="px-5 py-2.5 font-medium">port</th>
                <th className="px-3 py-2.5 font-medium">proto</th>
                <th className="px-3 py-2.5 font-medium">service</th>
                <th className="px-3 py-2.5 font-medium">banner / version</th>
                <th className="px-3 py-2.5 text-right font-medium">rtt</th>
                <th className="px-3 py-2.5 font-medium">risk</th>
                <th className="w-8 px-2 py-2.5" />
              </tr>
            </thead>
            <tbody className="font-mono">
              {rows.map((p) => {
                const key = `${p.port}-${p.proto}`;
                const meta = RISK_META[p.risk];
                const isOpen = expanded === key;
                return (
                  <FragmentRow
                    key={key}
                    p={p}
                    meta={meta}
                    isOpen={isOpen}
                    onToggle={() => setExpanded(isOpen ? null : key)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Reveal>
  );
}

function FragmentRow({
  p,
  meta,
  isOpen,
  onToggle,
}: {
  p: PortRecord;
  meta: { label: string; cls: string; dot: string };
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className={`cursor-pointer border-b border-ink-800/80 transition-colors duration-200 ${
          isOpen ? "bg-ink-800/60" : "hover:bg-ink-800/40"
        }`}
      >
        <td className="px-5 py-3 text-fog-100">
          <span className={p.status === "open" ? "text-phos-400" : "text-amberx-400"}>{p.port}</span>
          <span className="text-fog-600">/{p.proto}</span>
        </td>
        <td className="px-3 py-3 uppercase text-fog-500">{p.proto}</td>
        <td className="px-3 py-3 text-fog-200">{p.service}</td>
        <td className="max-w-[260px] truncate px-3 py-3 text-fog-500">{p.banner}</td>
        <td className="px-3 py-3 text-right tabular-nums text-fog-500">{p.status === "open" ? `${p.rtt}ms` : "—"}</td>
        <td className="px-3 py-3">
          <span className={`inline-flex items-center gap-1.5 border px-2 py-0.5 text-[10px] tracking-widest ${meta.cls}`}>
            <i className={`h-1.5 w-1.5 ${meta.dot}`} />
            {meta.label}
          </span>
        </td>
        <td className="px-2 py-3 text-fog-600">
          <IconChevron className={`h-3.5 w-3.5 transition-transform duration-300 ${isOpen ? "rotate-90 text-phos-400" : ""}`} />
        </td>
      </tr>
      {isOpen && (
        <tr className="border-b border-ink-800/80 bg-ink-900/70">
          <td colSpan={7} className="px-5 py-3.5">
            <div className="max-w-2xl font-mono text-[12px] leading-relaxed">
              <span className="text-fog-600">status&nbsp;</span>
              <span className={p.status === "open" ? "text-phos-400" : "text-amberx-400"}>{p.status.toUpperCase()}</span>
              <span className="text-fog-600">&nbsp;·&nbsp;</span>
              <span className="text-fog-300">{p.note}</span>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
