import type { ScanState } from "../hooks/useScan";
import { INTENSITY_META, PROFILE_LABEL, type Intensity, type ProfileId, type ScanConfig } from "../lib/engine";
import { QUICK_TARGETS } from "../data/ports";
import { IconCrosshair, IconPlay, IconStop } from "./icons";

const PROFILE_DESC: Record<ProfileId, string> = {
  quick: "top-20 hot ports · ~3s",
  standard: "64-port service mix · ~6s",
  deep: "128 ports incl. high-range · ~10s",
  custom: "operator-defined range · capped 2000",
};

export default function ControlPanel({
  config,
  setConfig,
  state,
  error,
  onStart,
  onAbort,
}: {
  config: ScanConfig;
  setConfig: (c: ScanConfig) => void;
  state: ScanState;
  error: string | null;
  onStart: () => void;
  onAbort: () => void;
}) {
  const running = state === "running";
  const set = (patch: Partial<ScanConfig>) => setConfig({ ...config, ...patch });

  return (
    <div className="panel corner-frame relative overflow-hidden p-5">
      {/* scan sheen while running */}
      {running && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden opacity-60">
          <div className="anim-sheen h-10 w-full bg-gradient-to-b from-transparent via-phos-400/15 to-transparent" />
        </div>
      )}

      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] tracking-[0.28em] uppercase text-fog-400">
          Sweep parameters
        </h3>
        <IconCrosshair className="h-4 w-4 text-phos-400" />
      </div>

      {/* target */}
      <label className="mt-5 block">
        <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
          target host
        </span>
        <div className={`mt-1.5 flex items-center border bg-ink-950/70 transition-colors focus-within:border-phos-400 ${error ? "border-alert-500/70" : "border-ink-600"}`}>
          <span className="select-none border-r border-ink-600 px-3 py-2.5 font-mono text-xs text-phos-400">
            ▸
          </span>
          <input
            value={config.target}
            disabled={running}
            onChange={(e) => set({ target: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !running) onStart();
            }}
            placeholder="192.168.1.1 or edge.dc7.internal"
            spellCheck={false}
            className="w-full bg-transparent px-3 py-2.5 font-mono text-sm text-fog-100 placeholder-fog-600 outline-none disabled:opacity-50"
          />
        </div>
        {error && <span className="mt-1.5 block font-mono text-[11px] text-alert-400">✗ {error}</span>}
      </label>

      {/* quick targets */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK_TARGETS.map((t) => (
          <button
            key={t}
            disabled={running}
            onClick={() => set({ target: t })}
            className={`border px-2 py-1 font-mono text-[10.5px] transition-all duration-200 disabled:opacity-40 ${
              config.target === t
                ? "border-phos-400/70 bg-phos-400/10 text-phos-300"
                : "border-ink-600 text-fog-500 hover:border-fog-500 hover:text-fog-200"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* profile */}
      <div className="mt-6">
        <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
          sweep profile
        </span>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          {(Object.keys(PROFILE_LABEL) as ProfileId[]).map((p) => {
            const active = config.profile === p;
            return (
              <button
                key={p}
                disabled={running}
                onClick={() => set({ profile: p })}
                className={`group border px-3 py-2.5 text-left transition-all duration-200 disabled:opacity-40 ${
                  active
                    ? "border-phos-400/70 bg-phos-400/10"
                    : "border-ink-600 hover:border-fog-500"
                }`}
              >
                <span className={`block font-display text-[13px] font-semibold tracking-wide ${active ? "text-phos-300" : "text-fog-300"}`}>
                  {PROFILE_LABEL[p]}
                </span>
                <span className="mt-0.5 block font-mono text-[9.5px] leading-snug text-fog-600">
                  {PROFILE_DESC[p]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* custom range */}
      {config.profile === "custom" && (
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          <label className="border border-ink-600 px-3 py-2">
            <span className="font-mono text-[9.5px] tracking-widest uppercase text-fog-600">from</span>
            <input
              type="number"
              min={1}
              max={65535}
              disabled={running}
              value={config.customFrom}
              onChange={(e) => set({ customFrom: Math.max(1, Math.min(65535, Number(e.target.value) || 1)) })}
              className="w-full bg-transparent font-mono text-sm text-fog-100 outline-none disabled:opacity-50"
            />
          </label>
          <label className="border border-ink-600 px-3 py-2">
            <span className="font-mono text-[9.5px] tracking-widest uppercase text-fog-600">to</span>
            <input
              type="number"
              min={1}
              max={65535}
              disabled={running}
              value={config.customTo}
              onChange={(e) => set({ customTo: Math.max(1, Math.min(65535, Number(e.target.value) || 1)) })}
              className="w-full bg-transparent font-mono text-sm text-fog-100 outline-none disabled:opacity-50"
            />
          </label>
        </div>
      )}

      {/* intensity */}
      <div className="mt-6">
        <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
          intensity
        </span>
        <div className="mt-2 grid grid-cols-3 border border-ink-600">
          {(Object.keys(INTENSITY_META) as Intensity[]).map((k, idx) => {
            const active = config.intensity === k;
            return (
              <button
                key={k}
                disabled={running}
                onClick={() => set({ intensity: k })}
                className={`px-2 py-2.5 transition-colors duration-200 disabled:opacity-40 ${idx > 0 ? "border-l border-ink-600" : ""} ${
                  active ? "bg-amberx-400/15 text-amberx-300" : "text-fog-500 hover:text-fog-200"
                }`}
              >
                <span className="block font-display text-[12.5px] font-semibold tracking-wide">
                  {INTENSITY_META[k].label}
                </span>
                <span className="mt-0.5 block font-mono text-[9.5px] text-fog-600">{INTENSITY_META[k].pps}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* action */}
      <div className="mt-7 flex gap-2">
        {!running ? (
          <button
            onClick={onStart}
            className="group flex flex-1 items-center justify-center gap-2.5 bg-phos-400 px-4 py-3.5 font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-950 transition-all duration-200 hover:bg-phos-300 hover:shadow-[0_0_28px_-4px_rgba(62,233,166,0.55)] active:translate-y-px"
          >
            <IconPlay className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            Initiate sweep
          </button>
        ) : (
          <button
            onClick={onAbort}
            className="group flex flex-1 items-center justify-center gap-2.5 bg-alert-500 px-4 py-3.5 font-display text-sm font-bold uppercase tracking-[0.18em] text-ink-950 transition-all duration-200 hover:bg-alert-400 hover:shadow-[0_0_28px_-4px_rgba(255,107,94,0.55)] active:translate-y-px"
          >
            <IconStop className="h-4 w-4" />
            Abort — SIGINT
          </button>
        )}
      </div>
      <p className="mt-3 font-mono text-[10px] leading-relaxed text-fog-600">
        simulation engine · deterministic per target · no packets transmitted
      </p>
    </div>
  );
}
