import { useScan } from "./hooks/useScan";
import { Footer, Reveal, SectionHead, Ticker, TopBar } from "./components/chrome";
import ControlPanel from "./components/ControlPanel";
import Terminal from "./components/Terminal";
import RadarScope from "./components/RadarScope";
import { ExposureGauge, StatsStrip } from "./components/StatsPanel";
import ResultsTable from "./components/ResultsTable";
import PortLibrary from "./components/PortLibrary";
import HowItWorks from "./components/HowItWorks";
import HistoryPanel from "./components/HistoryPanel";
import { IconChevron } from "./components/icons";

export default function App() {
  const scan = useScan();
  const running = scan.state === "running";
  const openCount = scan.ports.filter((p) => p.status === "open").length;
  const filteredCount = scan.ports.filter((p) => p.status === "filtered").length;

  return (
    <div className="relative min-h-screen">
      {/* ambient layered background */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_18%_-5%,rgba(62,233,166,0.09),transparent_60%),radial-gradient(ellipse_55%_45%_at_85%_12%,rgba(79,216,232,0.08),transparent_60%),radial-gradient(ellipse_60%_40%_at_55%_105%,rgba(255,180,84,0.05),transparent_65%)]" />
        <div className="scene-grid absolute inset-0" />
        <div className="scene-noise absolute inset-0" />
      </div>

      <div className="relative z-10">
        <TopBar />
        <Ticker />

        {/* ================= OPERATIONS CONSOLE ================= */}
        <section id="console" className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 sm:pt-14">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-phos-400">
                <span className="inline-block h-px w-10 bg-phos-400/70" />
                01 / Operations console
              </div>
              <h1 className="mt-3 font-display text-4xl font-bold uppercase leading-[0.95] tracking-wide text-fog-100 sm:text-6xl">
                Sweep first.
                <br />
                <span className="text-phos-400">Trust later.</span>
              </h1>
            </div>
            <div className="max-w-sm text-[13.5px] leading-relaxed text-fog-400">
              Point the console at a host, choose a sweep profile, and watch every open door
              light up on the scope — banners, latencies and a scored exposure report included.
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
            {/* left rail: params + log */}
            <div className="flex min-h-0 flex-col gap-4">
              <Reveal>
                <ControlPanel
                  config={scan.config}
                  setConfig={scan.setConfig}
                  state={scan.state}
                  error={scan.error}
                  onStart={scan.start}
                  onAbort={scan.abort}
                />
              </Reveal>
              <Reveal delay={110} className="flex min-h-0 flex-1 flex-col">
                <div className="flex min-h-[340px] flex-1 flex-col">
                  <Terminal logs={scan.logs} running={running} onClear={scan.clearLogs} />
                </div>
              </Reveal>
            </div>

            {/* right deck: stats, radar, gauge */}
            <div className="flex min-h-0 flex-col gap-4">
              <Reveal delay={60}>
                <StatsStrip
                  state={scan.state}
                  elapsed={scan.elapsed}
                  scanned={scan.scanned}
                  expected={scan.expected}
                  packets={scan.packets}
                  progress={scan.progress}
                  open={openCount}
                  filtered={filteredCount}
                />
              </Reveal>
              <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
                <Reveal delay={140} className="flex min-h-0 flex-col">
                  <RadarScope
                    ports={scan.ports}
                    running={running}
                    phase={scan.phase}
                    target={scan.config.target}
                  />
                </Reveal>
                <Reveal delay={200} className="flex min-h-0 flex-col">
                  <ExposureGauge result={scan.result} state={scan.state} />
                </Reveal>
              </div>
            </div>
          </div>

          {/* contact report */}
          <div className="mt-4">
            <ResultsTable ports={scan.ports} result={scan.result} state={scan.state} />
          </div>

          {!running && scan.state === "idle" && (
            <Reveal delay={100} className="mt-6 flex justify-center">
              <a
                href="#method"
                className="group flex items-center gap-2 font-mono text-[11px] tracking-[0.26em] uppercase text-fog-500 transition-colors hover:text-phos-300"
              >
                how the pipeline works
                <IconChevron className="h-3.5 w-3.5 rotate-90 transition-transform group-hover:translate-y-0.5" />
              </a>
            </Reveal>
          )}
        </section>

        {/* ================= METHOD ================= */}
        <section id="method" className="border-t border-ink-800/80 bg-ink-900/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
            <HowItWorks />
          </div>
        </section>

        {/* ================= PORT LIBRARY ================= */}
        <section id="library" className="border-t border-ink-800/80">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHead index="03" kicker="Reference" title="Port library">
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-400">
                The signature database behind the fingerprinter — every service the console knows
                by heart, graded by what an open instance usually means at 3 a.m.
              </p>
            </SectionHead>
            <PortLibrary />
          </div>
        </section>

        {/* ================= HISTORY ================= */}
        <section id="history" className="border-t border-ink-800/80 bg-ink-900/40">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-24">
            <SectionHead index="04" kicker="Archive" title="Session history">
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-400">
                Sweeps persist locally between visits. Replay any archived result straight back
                onto the scope — no re-scan, no extra noise on the wire.
              </p>
            </SectionHead>
            <HistoryPanel history={scan.history} onLoad={scan.loadFromHistory} onClear={scan.clearHistory} />
          </div>
        </section>

        <Footer />
      </div>
    </div>
  );
}
