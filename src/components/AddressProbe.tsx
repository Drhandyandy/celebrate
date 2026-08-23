import { useEffect, useState } from "react";
import {
  CHAIN_META,
  detectChain,
  probeAddress,
  type ChainId,
  type ProbeResult,
} from "../lib/chains";
import { IconClock, IconSearch } from "./icons";

interface Recent {
  address: string;
  chain: ChainId;
  balanceDisplay: string;
  ts: number;
}

const LS_KEY = "keysweep.probes.v1";

export default function AddressProbe() {
  const [input, setInput] = useState("");
  const [state, setState] = useState<
    { st: "idle" } | { st: "busy" } | { st: "done"; res: ProbeResult } | { st: "err"; msg: string }
  >({ st: "idle" });
  const [recent, setRecent] = useState<Recent[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]") as Recent[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(recent.slice(0, 8)));
    } catch {
      /* private mode */
    }
  }, [recent]);

  const detected = detectChain(input);

  const run = async (address: string) => {
    const a = address.trim();
    if (!a) return;
    setState({ st: "busy" });
    try {
      const res = await probeAddress(a);
      setState({ st: "done", res });
      setRecent((r) =>
        [
          { address: a, chain: res.chain, balanceDisplay: res.balanceDisplay, ts: Date.now() },
          ...r.filter((x) => x.address.toLowerCase() !== a.toLowerCase()),
        ].slice(0, 8)
      );
    } catch (e) {
      setState({ st: "err", msg: e instanceof Error ? e.message : "probe failed" });
    }
  };

  return (
    <div className="panel corner-frame p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] tracking-[0.3em] uppercase text-cyanx-300">
          03 / Address probe
        </h3>
        <span className="font-mono text-[10.5px] tracking-wider text-fog-500">
          ETH · BTC · SOL mainnets
        </span>
      </div>

      <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-fog-400">
        Balances are public by design. Paste any address — the console detects the chain,
        queries public nodes and returns the live balance straight from the ledger.
      </p>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fog-600" />
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run(input)}
            spellCheck={false}
            autoComplete="off"
            placeholder="0x… / bc1… / base58 solana address"
            className="w-full border border-ink-600 bg-ink-950/90 py-3.5 pl-10 pr-32 font-mono text-[13px] text-fog-100 outline-none transition-colors placeholder:text-fog-600/70 focus:border-cyanx-400/70"
          />
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 border px-2 py-0.5 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
            style={
              detected
                ? { color: CHAIN_META[detected].color, borderColor: CHAIN_META[detected].color + "88" }
                : { color: "#5e7b80", borderColor: "#1d4150" }
            }
          >
            {detected ? CHAIN_META[detected].label : "auto-detect"}
          </span>
        </div>
        <button
          onClick={() => run(input)}
          disabled={!detected || state.st === "busy"}
          className="bg-cyanx-400 px-6 py-3.5 font-display text-[13px] font-bold uppercase tracking-[0.14em] text-ink-950 transition-all hover:bg-cyanx-300 hover:shadow-[0_0_24px_rgba(79,216,232,0.35)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink-700 disabled:text-fog-500"
        >
          {state.st === "busy" ? "querying…" : "probe ledger"}
        </button>
      </div>

      {state.st === "err" && (
        <div className="mt-4 border border-alert-500/50 bg-alert-500/[0.06] p-3.5 font-mono text-[12px] text-alert-300">
          probe failed — {state.msg}. public RPCs may be unreachable from this network; retry shortly.
        </div>
      )}

      {state.st === "done" && (
        <div className="anim-rise mt-5 border border-ink-700 bg-ink-950/70 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center border font-display text-lg font-bold"
                style={{
                  color: CHAIN_META[state.res.chain].color,
                  borderColor: CHAIN_META[state.res.chain].color + "77",
                  background: CHAIN_META[state.res.chain].color + "14",
                }}
              >
                {CHAIN_META[state.res.chain].symbol[0]}
              </span>
              <div>
                <div className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
                  {CHAIN_META[state.res.chain].label} mainnet
                </div>
                <code className="mt-0.5 block max-w-[52vw] truncate font-mono text-[12px] text-fog-400 sm:max-w-md">
                  {state.res.address}
                </code>
              </div>
            </div>
            <div className="text-right">
              <div className="font-display text-3xl font-bold tracking-wide sm:text-4xl" style={{ color: CHAIN_META[state.res.chain].color }}>
                {state.res.balanceDisplay}
              </div>
              {state.res.txCount !== null && (
                <div className="font-mono text-[11px] text-fog-500">
                  {state.res.txCount} transactions on record
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-ink-700 pt-3 font-mono text-[11px] text-fog-500">
            <span className="flex items-center gap-1.5">
              <IconClock className="h-3.5 w-3.5" />
              fetched {new Date(state.res.fetchedAt).toLocaleTimeString()}
            </span>
            <a
              href={state.res.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="text-cyanx-300 underline-offset-4 transition-colors hover:text-cyanx-400 hover:underline"
            >
              open in block explorer ↗
            </a>
          </div>
        </div>
      )}

      {/* recent probes */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
            recent probes · stored locally
          </span>
          {recent.length > 0 && (
            <button
              onClick={() => setRecent([])}
              className="font-mono text-[10px] tracking-[0.18em] uppercase text-fog-600 transition-colors hover:text-alert-300"
            >
              clear
            </button>
          )}
        </div>
        {recent.length === 0 ? (
          <p className="mt-2 font-mono text-[11.5px] text-fog-600">
            nothing probed yet this session.
          </p>
        ) : (
          <div className="mt-2 border border-ink-700">
            {recent.map((r) => (
              <button
                key={r.address + r.ts}
                onClick={() => {
                  setInput(r.address);
                  run(r.address);
                }}
                className="group flex w-full flex-wrap items-center gap-x-4 gap-y-1 border-b border-ink-800 px-3.5 py-2.5 text-left transition-colors last:border-b-0 hover:bg-ink-800/50"
              >
                <span
                  className="w-10 shrink-0 font-mono text-[10px] tracking-[0.18em] uppercase"
                  style={{ color: CHAIN_META[r.chain].color }}
                >
                  {r.chain}
                </span>
                <code className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-fog-400 group-hover:text-fog-200">
                  {r.address}
                </code>
                <span className="font-mono text-[11px] text-fog-300">{r.balanceDisplay}</span>
                <span className="font-mono text-[10px] text-fog-600">
                  {new Date(r.ts).toLocaleTimeString()}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
