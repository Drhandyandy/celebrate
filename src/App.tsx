import { useEffect, useState } from "react";
import { WORDS } from "./lib/keys";
import { fetchBtcTip, fetchEthSlot } from "./lib/chains";
import {
  Reveal,
  Scramble,
  SectionHead,
  Ticker,
  TopBar,
  usePrefersReducedMotion,
} from "./components/chrome";
import KeyInspector from "./components/KeyInspector";
import RecoveryLab from "./components/RecoveryLab";
import AddressProbe from "./components/AddressProbe";
import MathBench from "./components/MathBench";
import {
  IconBolt,
  IconChevron,
  IconHazard,
  IconLayers,
  IconLink,
  IconShield,
  IconWave,
} from "./components/icons";

/* ------------------------------------------------------------------ */
/* hero terminal (typewriter)                                          */
/* ------------------------------------------------------------------ */
const TERM_LINES = [
  { t: "$ keysweep --inspect --chains eth,btc,sol", c: "text-phos-300" },
  { t: "→ entropy check ............... 256-bit ✓", c: "text-fog-400" },
  { t: "→ m/44'/60'/0'/0/0 ............ 0x7A3b…f91E", c: "text-fog-400" },
  { t: "→ m/84'/0'/0'/0/0 ............. bc1qxy2…v3w8", c: "text-fog-400" },
  { t: "→ balance probe · 3 public RPCs  Ξ 0.4211", c: "text-cyanx-300" },
  { t: "→ key material transmitted .... 0 bytes", c: "text-phos-400" },
];

function HeroTerminal() {
  const reduced = usePrefersReducedMotion();
  const [pos, setPos] = useState({ li: 0, ch: 0 });
  useEffect(() => {
    if (reduced) {
      setPos({ li: TERM_LINES.length, ch: 0 });
      return;
    }
    const iv = window.setInterval(() => {
      setPos((p) => {
        if (p.li >= TERM_LINES.length) return p;
        const line = TERM_LINES[p.li].t;
        if (p.ch < line.length) return { li: p.li, ch: p.ch + 1 };
        return { li: p.li + 1, ch: 0 };
      });
    }, 26);
    return () => window.clearInterval(iv);
  }, [reduced]);

  return (
    <div className="panel corner-frame scanlines flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-2.5">
        <span className="font-mono text-[10.5px] tracking-[0.26em] uppercase text-fog-400">
          deck · session 0x2f
        </span>
        <span className="flex items-center gap-2 font-mono text-[10px] text-phos-400">
          <i className="anim-led inline-block h-1.5 w-1.5 rounded-full bg-phos-400 text-phos-400" />
          sealed
        </span>
      </div>
      <div className="flex-1 px-4 py-4 font-mono text-[12px] leading-[1.9] sm:text-[12.5px]">
        {TERM_LINES.slice(0, pos.li).map((l, i) => (
          <div key={i} className={l.c}>
            {l.t}
          </div>
        ))}
        {pos.li < TERM_LINES.length && (
          <div className={TERM_LINES[pos.li].c}>
            {TERM_LINES[pos.li].t.slice(0, pos.ch)}
            <span className="anim-cursor ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-phos-400" />
          </div>
        )}
        {pos.li >= TERM_LINES.length && (
          <div className="text-fog-400">
            $ <span className="anim-cursor ml-0.5 inline-block h-3.5 w-2 translate-y-0.5 bg-phos-400" />
          </div>
        )}
      </div>
      <div className="border-t border-ink-700/70 px-4 py-2 font-mono text-[9.5px] tracking-[0.2em] uppercase text-fog-600">
        all derivation in-tab · addresses are public data
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* entropy visual                                                      */
/* ------------------------------------------------------------------ */
function rand32() {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return b;
}

function EntropyCard() {
  const [bytes, setBytes] = useState(rand32);
  const hex = Array.from(bytes.slice(0, 16))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return (
    <div className="panel corner-frame p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 font-mono text-[10.5px] tracking-[0.26em] uppercase text-fog-400">
          <IconBolt className="h-4 w-4 text-phos-400" />
          raw entropy · 256 bits · one private key
        </div>
        <button
          onClick={() => setBytes(rand32())}
          className="border border-ink-600 px-3 py-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-fog-400 transition-all hover:border-phos-500/60 hover:text-phos-300 active:translate-y-px"
        >
          re-roll dice
        </button>
      </div>
      <div
        className="mt-4 grid gap-[3px]"
        style={{ gridTemplateColumns: "repeat(32, minmax(0, 1fr))" }}
        aria-hidden
      >
        {Array.from(bytes).flatMap((byte, bi) =>
          Array.from({ length: 8 }, (_, i) => {
            const on = (byte >> (7 - i)) & 1;
            return (
              <span
                key={`${bi}-${i}`}
                className={`aspect-square transition-colors duration-300 ${
                  on ? "bg-phos-400/85" : "bg-ink-700"
                }`}
              />
            );
          })
        )}
      </div>
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px] text-fog-600">
        <code className="text-fog-400">0x{hex}…</code>
        <span>
          1 in 2<sup>256</sup> — warmer than the dice suggest
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* derivation pipeline                                                 */
/* ------------------------------------------------------------------ */
const STAGES = [
  {
    n: "α",
    title: "Entropy",
    color: "#4fd8e8",
    span: "lg:col-span-4",
    snippet: "0x3f8a … c21d",
    body: "128–256 random bits from a CSPRNG. This number is the only real secret — everything downstream is deterministic math.",
  },
  {
    n: "β",
    title: "BIP39 seed",
    color: "#3ee9a6",
    span: "lg:col-span-3",
    snippet: "PBKDF2-SHA512 · 2048",
    body: "Bits plus a checksum become mnemonic words, then stretch into a 512-bit seed. A checksum failure kills 15 of every 16 guesses.",
  },
  {
    n: "γ",
    title: "BIP32 tree",
    color: "#ffb454",
    span: "lg:col-span-3",
    snippet: "m / 44' / 60' / 0' / 0 / 0",
    body: "HMAC-SHA512 turns the seed into a master key and an infinite hardened tree of child keys — one path per chain, per account.",
  },
  {
    n: "δ",
    title: "Addresses",
    color: "#ff6b5e",
    span: "lg:col-span-2",
    snippet: "keccak · hash160 · bech32",
    body: "Public keys get hashed and encoded per chain. Safe to publish, practically impossible to reverse into the key.",
  },
];

const SAFETY_DO = [
  "Run recovery only on wallets you own or are contractually hired to restore.",
  "Prefer offline / air-gapped machines for any seed that still controls funds.",
  "Verify checksums — a single wrong word invalidates the whole phrase.",
  "Treat the last word as the cheapest to recover: it carries the checksum.",
  "Write seeds on steel or paper. Screenshots and cloud notes leak.",
];

const SAFETY_DONT = [
  "Paste funded keys into websites you do not run yourself — including this one.",
  "Type seed words into anything connected to a clipboard manager.",
  "Trust “balance checker” apps that ask for the full phrase up front.",
  "Touch coins in an address you derived but do not own. Anywhere, that is theft.",
];

/* ------------------------------------------------------------------ */
/* app                                                                 */
/* ------------------------------------------------------------------ */
type TabId = "inspector" | "recovery" | "probe" | "bench";

const TABS: { id: TabId; label: string; accent: string }[] = [
  { id: "inspector", label: "01 · key inspector", accent: "#3ee9a6" },
  { id: "recovery", label: "02 · recovery lab", accent: "#ffb454" },
  { id: "probe", label: "03 · address probe", accent: "#4fd8e8" },
  { id: "bench", label: "04 · curve bench", accent: "#ff6b5e" },
];

const DRIFT = [23, 341, 662, 977, 1204, 1518, 1801, 115, 733, 1999, 512, 1450];

export default function App() {
  const [tab, setTab] = useState<TabId>("inspector");
  const [btcTip, setBtcTip] = useState<number | null>(null);
  const [ethSlot, setEthSlot] = useState<number | null>(null);

  useEffect(() => {
    fetchBtcTip().then(setBtcTip);
    fetchEthSlot().then(setEthSlot);
  }, []);

  const tickerItems = [
    `BIP39 wordlist · ${WORDS.length} entries`,
    "keyspace · 2^256 private keys",
    btcTip !== null ? `btc tip #${btcTip.toLocaleString()}` : "btc tip · syncing…",
    ethSlot !== null ? `eth slot #${ethSlot.toLocaleString()}` : "eth slot · syncing…",
    "derivation · 100% in-browser",
    "default eth path · m/44'/60'/0'/0/0",
    "12-word seed · only 16 final words pass checksum",
    "curve bench · 17 claims graded live with BigInt EC",
    "x([2⁻¹]G) = 166 bits — real measurement, zero information",
    "audit ρ(d) = o is a tautology · you must already hold d",
    "8,243 sphere candidates / 2^256 ≈ 7.1×10⁻⁷⁴ · not an attack",
    "never type a live seed into any website",
  ];

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
        <Ticker items={tickerItems} />

        {/* ================= HERO / CONSOLE ================= */}
        <section id="console" className="relative mx-auto max-w-7xl overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pt-16">
          {/* drifting wordlist fragments */}
          <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden>
            {DRIFT.map((seedIdx, i) => (
              <span
                key={i}
                className="anim-drift absolute font-mono uppercase tracking-[0.3em] text-fog-500"
                style={{
                  left: `${(i * 37 + 8) % 92}%`,
                  top: `${(i * 23 + 6) % 88}%`,
                  fontSize: `${10 + (i % 3) * 3}px`,
                  opacity: 0.1 + (i % 4) * 0.02,
                  animationDelay: `${(i % 5) * -1.7}s`,
                  animationDuration: `${8 + (i % 4) * 2}s`,
                }}
              >
                {WORDS[seedIdx % WORDS.length]}
              </span>
            ))}
          </div>

          <div className="relative grid items-stretch gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-phos-400">
                <span className="inline-block h-px w-10 bg-phos-400/70" />
                client-side · BIP39 / BIP32 / BIP44
              </div>
              <h1 className="mt-5 font-display text-[13vw] font-bold uppercase leading-[0.95] tracking-wide text-fog-100 sm:text-6xl lg:text-7xl">
                <Scramble text="LOST THE SEED?" />
                <br />
                <Scramble text="SWEEP THE" className="text-phos-400" delay={420} />{" "}
                <Scramble text="KEYSPACE." className="text-phos-400" delay={700} />
              </h1>
              <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-fog-400">
                KEYSWEEP is a browser console for blockchain key operations: inspect a mnemonic,
                hex key or WIF; recover missing seed words by deriving every checksum-valid
                combination; and probe live balances across Ethereum, Bitcoin and Solana. All
                cryptography runs in this tab — the network only ever sees public addresses.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                {[
                  {
                    label: "btc tip",
                    value: btcTip !== null ? `#${btcTip.toLocaleString()}` : "syncing…",
                    color: "#ffb454",
                  },
                  {
                    label: "eth slot",
                    value: ethSlot !== null ? `#${ethSlot.toLocaleString()}` : "syncing…",
                    color: "#4fd8e8",
                  },
                ].map((chip) => (
                  <div
                    key={chip.label}
                    className="flex items-center gap-2.5 border border-ink-700 bg-ink-900/70 px-3.5 py-2"
                  >
                    <i
                      className="anim-led inline-block h-1.5 w-1.5 rounded-full"
                      style={{ background: chip.color, color: chip.color }}
                    />
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-fog-500">
                      {chip.label}
                    </span>
                    <span className="font-mono text-[12px] text-fog-100">{chip.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#tools"
                  className="group flex items-center gap-2.5 bg-phos-400 px-6 py-3 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-ink-950 transition-all hover:bg-phos-300 hover:shadow-[0_0_28px_rgba(62,233,166,0.4)] active:translate-y-px"
                >
                  open the console
                  <IconChevron className="h-3.5 w-3.5 rotate-90 transition-transform group-hover:translate-y-0.5" />
                </a>
                <a
                  href="#method"
                  className="flex items-center gap-2.5 border border-ink-600 px-6 py-3 font-mono text-[11.5px] tracking-[0.18em] uppercase text-fog-400 transition-all hover:border-fog-500 hover:text-fog-100 active:translate-y-px"
                >
                  <IconLayers className="h-4 w-4" />
                  how derivation works
                </a>
              </div>
            </div>

            <Reveal delay={150} className="min-h-[320px]">
              <HeroTerminal />
            </Reveal>
          </div>

          {/* stats strip */}
          <Reveal delay={120} className="mt-14">
            <div className="panel grid grid-cols-2 divide-x divide-ink-700/80 lg:grid-cols-4">
              {[
                {
                  v: (
                    <>
                      2<sup className="text-[0.55em]">256</sup>
                    </>
                  ),
                  l: "possible private keys",
                  c: "text-phos-400",
                },
                { v: "2,048", l: "BIP39 wordlist entries", c: "text-cyanx-400" },
                { v: "3", l: "chains probed live", c: "text-amberx-400" },
                { v: "0 B", l: "key material transmitted", c: "text-alert-400" },
              ].map((s, i) => (
                <div key={i} className="group px-5 py-5 transition-colors hover:bg-ink-800/40 sm:px-7 sm:py-6">
                  <div className={`font-display text-3xl font-bold tracking-wide sm:text-4xl ${s.c}`}>
                    {s.v}
                  </div>
                  <div className="mt-1.5 font-mono text-[10px] tracking-[0.22em] uppercase text-fog-500">
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </section>

        {/* ================= INSTRUMENTS ================= */}
        <section id="tools" className="border-t border-ink-800/80 bg-ink-900/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
            <SectionHead index="01" kicker="Instruments" title="Four tools, one deck">
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-400">
                Pick an instrument. Everything below is computed locally with audited
                pure-JS cryptography — public nodes are queried only with public addresses,
                and the curve bench verifies folklore claims with math, not faith.
              </p>
            </SectionHead>

            <Reveal>
              <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="console instruments">
                {TABS.map((t) => {
                  const active = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2.5 border px-4 py-2.5 font-mono text-[11px] tracking-[0.18em] uppercase transition-all active:translate-y-px ${
                        active
                          ? "bg-ink-800/80 text-fog-100"
                          : "border-ink-600 text-fog-500 hover:border-fog-600 hover:text-fog-200"
                      }`}
                      style={active ? { borderColor: t.accent + "aa", boxShadow: `0 0 20px ${t.accent}22` } : undefined}
                    >
                      <i
                        className={`inline-block h-1.5 w-1.5 rounded-full ${active ? "anim-led" : ""}`}
                        style={{ background: active ? t.accent : "#2c5a6c", color: t.accent }}
                      />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </Reveal>

            {tab === "inspector" && (
              <div key="inspector" className="anim-rise">
                <KeyInspector />
              </div>
            )}
            {tab === "recovery" && (
              <div key="recovery" className="anim-rise">
                <RecoveryLab />
              </div>
            )}
            {tab === "probe" && (
              <div key="probe" className="anim-rise">
                <AddressProbe />
              </div>
            )}
            {tab === "bench" && (
              <div key="bench" className="anim-rise">
                <MathBench />
              </div>
            )}
          </div>
        </section>

        {/* ================= DERIVATION ================= */}
        <section id="method" className="border-t border-ink-800/80">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHead index="02" kicker="Method" title="Seed → key → address">
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-fog-400">
                Every wallet on every EVM chain and on Bitcoin is just four deterministic steps
                away from 256 random bits. Understanding the pipeline is what makes recovery
                possible — and what makes shortcuts dangerous.
              </p>
            </SectionHead>

            <div className="grid gap-3 lg:grid-cols-12">
              {STAGES.map((s, i) => (
                <Reveal key={s.n} delay={i * 90} className={`min-w-0 ${s.span}`}>
                  <article
                    className="group relative h-full border border-ink-700 bg-ink-900/70 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-ink-850"
                    style={{ borderTopColor: s.color + "99", borderTopWidth: 2 }}
                  >
                    <div className="flex items-baseline justify-between">
                      <h3 className="font-display text-xl font-bold tracking-wide text-fog-100">
                        {s.title}
                      </h3>
                      <span className="font-display text-2xl" style={{ color: s.color }}>
                        {s.n}
                      </span>
                    </div>
                    <div
                      className="mt-3 border border-ink-700 bg-ink-950/80 px-3 py-2 font-mono text-[11px]"
                      style={{ color: s.color }}
                    >
                      {s.snippet}
                    </div>
                    <p className="mt-3 text-[13.5px] leading-relaxed text-fog-400">{s.body}</p>
                  </article>
                </Reveal>
              ))}
            </div>

            <Reveal delay={120} className="mt-4">
              <EntropyCard />
            </Reveal>

            <Reveal delay={80} className="mt-10 grid gap-6 md:grid-cols-[auto_1fr] md:items-center">
              <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.26em] uppercase text-fog-500">
                <IconWave className="h-5 w-5 text-cyanx-400" />
                why recovery works
              </div>
              <p className="max-w-4xl text-[14.5px] leading-relaxed text-fog-400">
                Derivation is a one-way function, but its input space per word is tiny: one
                forgotten word is only 2,048 candidates, and the checksum usually discards 15
                of every 16 — leaving a handful of real phrases to check against the chain.
                That is the entire trick behind professional seed-recovery services, running
                here on your own machine.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ================= SAFETY ================= */}
        <section id="safety" className="border-t border-ink-800/80 bg-ink-900/40">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
            <SectionHead index="03" kicker="Protocol" title="Safety doctrine" />

            <div className="grid gap-4 lg:grid-cols-12">
              <Reveal className="lg:col-span-7">
                <div className="h-full border border-ink-700 bg-ink-900/70 p-6 sm:p-7">
                  <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.26em] uppercase text-phos-400">
                    <IconShield className="h-4 w-4" /> standing orders
                  </div>
                  <ul className="mt-5 space-y-4">
                    {SAFETY_DO.map((r) => (
                      <li key={r} className="flex gap-3.5 text-[14px] leading-relaxed text-fog-300">
                        <IconBolt className="mt-1 h-4 w-4 shrink-0 text-phos-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 flex items-center gap-2.5 font-mono text-[11px] tracking-[0.26em] uppercase text-alert-400">
                    <IconHazard className="h-4 w-4" /> hard limits
                  </div>
                  <ul className="mt-4 space-y-4">
                    {SAFETY_DONT.map((r) => (
                      <li key={r} className="flex gap-3.5 text-[14px] leading-relaxed text-fog-400">
                        <span className="mt-[9px] h-px w-4 shrink-0 bg-alert-400" />
                        {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>

              <Reveal delay={120} className="lg:col-span-5">
                <div className="flex h-full flex-col border border-amberx-500/50 bg-amberx-500/[0.05] p-6 sm:p-7">
                  <div className="flex items-center gap-2.5 font-mono text-[11px] tracking-[0.26em] uppercase text-amberx-400">
                    <IconHazard className="h-4 w-4" /> ownership check
                  </div>
                  <p className="mt-4 text-[14px] leading-relaxed text-fog-300">
                    This console is recovery and inspection tooling for wallets{" "}
                    <span className="text-amberx-300">you own</span> or are authorized to restore.
                    Reading balances is public ledger data. Deriving addresses is local
                    mathematics. Spending from an address you merely derived is a crime in every
                    jurisdiction — no tool changes that.
                  </p>
                  <div className="mt-6 border-t border-amberx-500/30 pt-5">
                    <div className="font-mono text-[10px] tracking-[0.24em] uppercase text-fog-500">
                      what never persists here
                    </div>
                    <ul className="mt-3 space-y-2 font-mono text-[12px] text-fog-400">
                      <li>· seed phrases & private keys — memory only, cleared on reload</li>
                      <li>· nothing is uploaded — no analytics, no telemetry</li>
                      <li>· only address probes are kept, in your localStorage</li>
                    </ul>
                  </div>
                  <a
                    href="#tools"
                    className="mt-auto flex items-center gap-2 pt-6 font-mono text-[11px] tracking-[0.22em] uppercase text-amberx-300 transition-colors hover:text-amberx-400"
                  >
                    <IconLink className="h-3.5 w-3.5" /> back to the instruments
                  </a>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ================= FOOTER ================= */}
        <footer className="border-t border-ink-700/80 bg-ink-950">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
            <div className="flex flex-wrap items-start justify-between gap-8">
              <div>
                <div className="font-display text-lg font-bold tracking-[0.18em] text-fog-100">
                  KEYSWEEP<span className="text-phos-400">//256</span>
                </div>
                <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-fog-500">
                  Educational blockchain key console. Recovery tooling for your own wallets —
                  provided as-is, with no warranty and no custody of anything.
                </p>
              </div>
              <div className="font-mono text-[11px] leading-loose text-fog-500">
                <div className="mb-1.5 tracking-[0.24em] uppercase text-fog-400">spec sheets</div>
                {[
                  { l: "BIP39 · mnemonic seeds", h: "https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki" },
                  { l: "BIP32 · HD wallets", h: "https://github.com/bitcoin/bips/blob/master/bip-0032.mediawiki" },
                  { l: "BIP44 · path structure", h: "https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki" },
                  { l: "Blockstream explorer", h: "https://blockstream.info" },
                ].map((x) => (
                  <a
                    key={x.l}
                    href={x.h}
                    target="_blank"
                    rel="noreferrer"
                    className="block transition-colors hover:text-cyanx-300"
                  >
                    {x.l} ↗
                  </a>
                ))}
              </div>
              <div className="font-mono text-[11px] leading-loose text-fog-500">
                <div className="mb-1.5 tracking-[0.24em] uppercase text-fog-400">runtime</div>
                <div>cryptography · @scure + @noble (audited)</div>
                <div>render · react 18 + vite</div>
                <div>network · public RPCs only</div>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-800 pt-5 font-mono text-[10px] tracking-[0.22em] uppercase text-fog-600">
              <span>sweep responsibly · own your keys</span>
              <span>build 256.0.3 · session sealed</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
