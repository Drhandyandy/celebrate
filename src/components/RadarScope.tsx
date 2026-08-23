import { useMemo } from "react";
import type { PortRecord } from "../lib/engine";
import { usePrefersReducedMotion } from "./chrome";

const RISK_COLOR: Record<number, string> = {
  0: "#4fd8e8",
  1: "#3ee9a6",
  2: "#ffb454",
  3: "#ff6b5e",
};

function blipPos(port: number, proto: string): { x: number; y: number } {
  const angle = ((port * 137.508) % 360) * (Math.PI / 180);
  const rFrac = 0.22 + ((port * 7919) % 100) / 100 * 0.68;
  const r = 92 * rFrac;
  const jitter = proto === "udp" ? 0.94 : 1;
  return {
    x: 100 + Math.cos(angle) * r * jitter,
    y: 100 + Math.sin(angle) * r * jitter,
  };
}

export default function RadarScope({
  ports,
  running,
  phase,
  target,
}: {
  ports: PortRecord[];
  running: boolean;
  phase: string;
  target: string;
}) {
  const reduced = usePrefersReducedMotion();
  const blips = useMemo(
    () =>
      ports
        .filter((p) => p.status === "open")
        .map((p) => ({ ...p, ...blipPos(p.port, p.proto) })),
    [ports]
  );
  const filtered = useMemo(
    () => ports.filter((p) => p.status === "filtered").map((p) => ({ ...p, ...blipPos(p.port, p.proto) })),
    [ports]
  );

  return (
    <div className="panel corner-frame relative flex h-full flex-col overflow-hidden p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-mono text-[11px] tracking-[0.28em] uppercase text-fog-400">
          Radar · live contact map
        </h3>
        <span className={`font-mono text-[11px] tracking-widest uppercase ${running ? "text-amberx-400" : "text-fog-500"}`}>
          {running ? "sweeping" : phase === "standby" ? "idle" : "locked"}
        </span>
      </div>

      <div className="relative mx-auto mt-4 aspect-square w-full max-w-[380px]">
        {/* sweep wedge */}
        <div
          className="anim-radar absolute inset-0"
          style={{
            background:
              "conic-gradient(from 0deg, rgba(62,233,166,0.30) 0deg, rgba(62,233,166,0.09) 48deg, transparent 74deg, transparent 360deg)",
            borderRadius: "9999px",
            maskImage: "radial-gradient(circle, black 66%, transparent 67%)",
            WebkitMaskImage: "radial-gradient(circle, black 66%, transparent 67%)",
          }}
        />
        <svg viewBox="0 0 200 200" className="relative h-full w-full">
          <defs>
            <radialGradient id="scopeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(62,233,166,0.10)" />
              <stop offset="70%" stopColor="rgba(11,26,33,0.05)" />
              <stop offset="100%" stopColor="rgba(5,9,12,0)" />
            </radialGradient>
          </defs>

          <circle cx="100" cy="100" r="96" fill="url(#scopeGlow)" />
          {[92, 69, 46, 23].map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="#1d4150" strokeWidth="0.6" opacity="0.8" />
          ))}
          <line x1="8" y1="100" x2="192" y2="100" stroke="#1d4150" strokeWidth="0.5" opacity="0.7" />
          <line x1="100" y1="8" x2="100" y2="192" stroke="#1d4150" strokeWidth="0.5" opacity="0.7" />

          {/* rotating dashed ring */}
          <g className="anim-ring">
            <circle cx="100" cy="100" r="96" fill="none" stroke="#2c5a6c" strokeWidth="0.8" strokeDasharray="2 10" />
          </g>

          {/* degree labels */}
          {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
            const a = (deg * Math.PI) / 180;
            return (
              <text
                key={deg}
                x={100 + Math.cos(a) * 84}
                y={100 + Math.sin(a) * 84 + 2}
                textAnchor="middle"
                fontSize="5.4"
                fontFamily="IBM Plex Mono, monospace"
                fill="#5e7b80"
              >
                {String(deg).padStart(3, "0")}
              </text>
            );
          })}

          {/* sweep leading edge */}
          {!reduced && (
            <g className="anim-radar">
              <line x1="100" y1="100" x2="192" y2="100" stroke="#3ee9a6" strokeWidth="1" opacity="0.85" />
            </g>
          )}

          {/* filtered contacts — hollow */}
          {filtered.map((b) => (
            <circle key={`f-${b.port}-${b.proto}`} cx={b.x} cy={b.y} r="2.4" fill="none" stroke="#5e7b80" strokeWidth="0.9" strokeDasharray="1.4 1.2" />
          ))}

          {/* open contacts */}
          {blips.map((b) => {
            const c = RISK_COLOR[b.risk];
            return (
              <g key={`${b.port}-${b.proto}`}>
                <circle cx={b.x} cy={b.y} r="5.5" fill={c} opacity="0.16">
                  {!reduced && (
                    <animate attributeName="opacity" values="0.1;0.3;0.1" dur="2.2s" repeatCount="indefinite" />
                  )}
                </circle>
                <circle cx={b.x} cy={b.y} r="2.1" fill={c} />
                <circle className="anim-blip" cx={b.x} cy={b.y} r="3.4" fill="none" stroke={c} strokeWidth="0.8" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
              </g>
            );
          })}

          {/* center */}
          <circle cx="100" cy="100" r="2.4" fill="#3ee9a6" />
          <circle cx="100" cy="100" r="6" fill="none" stroke="#3ee9a6" strokeWidth="0.7" opacity="0.6" />
        </svg>

        {/* readout overlays */}
        <div className="pointer-events-none absolute left-1 top-1 font-mono text-[10px] leading-relaxed text-fog-500">
          <div>TGT <span className="text-fog-200">{target || "—"}</span></div>
          <div>CONTACTS <span className="text-phos-300">{blips.length}</span></div>
        </div>
        <div className="pointer-events-none absolute bottom-1 right-1 text-right font-mono text-[10px] leading-relaxed text-fog-500">
          <div>RNG 92u</div>
          <div>GAIN AUTO</div>
        </div>
      </div>

      {/* legend */}
      <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-1.5 pt-4 font-mono text-[10.5px] tracking-wider text-fog-500">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-alert-400" /> critical</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-amberx-400" /> elevated</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-phos-400" /> routine</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-full border border-dashed border-fog-500" /> filtered</span>
      </div>
    </div>
  );
}
