import { IconGlobe, IconHazard, IconLayers, IconPulse, IconShield, IconWave } from "./icons";
import { Reveal } from "./chrome";

const PHASES = [
  {
    n: "01",
    title: "Host discovery",
    icon: IconGlobe,
    color: "text-cyanx-400",
    border: "border-cyanx-400/35",
    body: "Before a single port is touched, the console resolves the target, fires an ICMP echo and reads the TTL. A live host answers in milliseconds; a dead one buys you nothing but silence. TTL also hints at the OS family — 64 for Linux, 128 for Windows.",
    meta: ["DNS + PTR resolution", "ICMP echo & TTL fingerprint", "gateway hop estimation"],
  },
  {
    n: "02",
    title: "SYN sweep",
    icon: IconWave,
    color: "text-phos-400",
    border: "border-phos-400/35",
    body: "Half-open probes go out across the port set in shuffled order so rate-limiters can't pattern-match the sweep. A SYN-ACK means open, an RST means closed, and no answer at all means something in between is quietly dropping packets.",
    meta: ["half-open (no handshake)", "shuffled probe order", "stealth → aggressive pacing"],
  },
  {
    n: "03",
    title: "Service fingerprinting",
    icon: IconLayers,
    color: "text-amberx-400",
    border: "border-amberx-400/35",
    body: "Every open port gets a banner grab: the version string a service volunteers on connect. “SSH-2.0-OpenSSH_9.6p1” tells you the exact build — and therefore exactly which CVEs to check before anything else.",
    meta: ["banner grabs over TCP", "TLS certificate inspection", "signature database matching"],
  },
  {
    n: "04",
    title: "Risk scoring",
    icon: IconShield,
    color: "text-alert-400",
    border: "border-alert-400/35",
    body: "Findings are weighted by blast radius — an exposed telnet shell outranks a well-kept HTTPS endpoint by an order of magnitude. The exposure index compresses everything into one number plus a ranked advisory list you can act on today.",
    meta: ["weighted exposure index", "ranked advisories", "exportable JSON / CSV"],
  },
];

export default function HowItWorks() {
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
      {/* sticky rail */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <Reveal>
          <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-phos-400">
            <span className="inline-block h-px w-10 bg-phos-400/70" />
            02 / Method
          </div>
        </Reveal>
        <h2 className="reveal-line mt-4 font-display text-3xl font-bold uppercase tracking-wide text-fog-100 sm:text-4xl">
          Four phases.<br />One number.
        </h2>
        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-fog-400">
          A scan is only as good as its method. SCNR//09 walks every target through the same
          four-stage pipeline — the one professional pentesters run when the clock is on —
          and distills the result into an exposure index.
        </p>
        <Reveal delay={140}>
          <div className="mt-8 border border-ink-700 bg-ink-900/70 p-5">
            <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.24em] uppercase text-amberx-400">
              <IconHazard className="h-4 w-4" /> Rules of engagement
            </div>
            <ul className="mt-3.5 space-y-2.5 text-[13px] leading-snug text-fog-400">
              <li className="flex gap-2.5">
                <IconPulse className="mt-0.5 h-4 w-4 shrink-0 text-phos-400" />
                Written authorization before any sweep touches a live network.
              </li>
              <li className="flex gap-2.5">
                <IconPulse className="mt-0.5 h-4 w-4 shrink-0 text-phos-400" />
                Define scope in writing: which ranges, which hours, which profiles.
              </li>
              <li className="flex gap-2.5">
                <IconPulse className="mt-0.5 h-4 w-4 shrink-0 text-phos-400" />
                Stop immediately on unexpected behavior — a scan should never be the incident.
              </li>
            </ul>
          </div>
        </Reveal>
      </div>

      {/* phase cards */}
      <div className="relative">
        <div className="absolute bottom-6 left-[27px] top-6 hidden w-px bg-gradient-to-b from-cyanx-400/50 via-phos-400/40 to-alert-400/50 sm:block" />
        <div className="space-y-6">
          {PHASES.map((p, i) => (
            <Reveal key={p.n} delay={i * 90}>
              <article
                className={`group relative border ${p.border} bg-ink-900/70 p-6 transition-all duration-300 hover:-translate-y-1 hover:bg-ink-850 sm:ml-16`}
              >
                <span
                  className={`absolute -left-[61px] top-7 hidden h-[22px] w-[22px] items-center justify-center border bg-ink-950 sm:flex ${p.border} ${p.color}`}
                >
                  <p.icon className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-xl font-bold tracking-wide text-fog-100 sm:text-2xl">
                    {p.title}
                  </h3>
                  <span className={`font-mono text-2xl font-semibold ${p.color} opacity-50 transition-opacity group-hover:opacity-100`}>
                    {p.n}
                  </span>
                </div>
                <p className="mt-3 text-[14px] leading-relaxed text-fog-400">{p.body}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {p.meta.map((m) => (
                    <span key={m} className="border border-ink-600 px-2 py-1 font-mono text-[10px] tracking-wider text-fog-500 transition-colors group-hover:border-fog-600 group-hover:text-fog-300">
                      {m}
                    </span>
                  ))}
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
