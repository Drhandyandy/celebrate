import { useMemo, useState } from "react";
import {
  detectKeyInput,
  deriveIdentity,
  generateDemoHex,
  generateDemoMnemonic,
} from "../lib/keys";
import { probeAddress, CHAIN_META, type ProbeResult } from "../lib/chains";
import { useCopy } from "./chrome";
import { IconBolt, IconShield } from "./icons";

type BalState =
  | { st: "idle" }
  | { st: "busy" }
  | { st: "done"; res: ProbeResult }
  | { st: "err"; msg: string };

export default function KeyInspector() {
  const [input, setInput] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [balances, setBalances] = useState<Record<string, BalState>>({});
  const { copied, copy } = useCopy();

  const detection = useMemo(() => detectKeyInput(input), [input]);
  const identity = useMemo(
    () => (input.trim() ? deriveIdentity(input, passphrase) : null),
    [input, passphrase]
  );

  const probe = async (key: string, address: string) => {
    setBalances((b) => ({ ...b, [key]: { st: "busy" } }));
    try {
      const res = await probeAddress(address);
      setBalances((b) => ({ ...b, [key]: { st: "done", res } }));
    } catch (e) {
      setBalances((b) => ({
        ...b,
        [key]: { st: "err", msg: e instanceof Error ? e.message : "probe failed" },
      }));
    }
  };

  const rows = identity
    ? [
        { key: "eth", label: "Ethereum", path: identity.paths.eth, addr: identity.ethAddress, color: CHAIN_META.eth.color },
        { key: "btc-seg", label: "Bitcoin · segwit", path: identity.paths.btcSegwit, addr: identity.btcBech32, color: CHAIN_META.btc.color },
        { key: "btc-leg", label: "Bitcoin · legacy", path: identity.paths.btcLegacy, addr: identity.btcLegacy, color: CHAIN_META.btc.color },
      ]
    : [];

  return (
    <div className="panel corner-frame p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-mono text-[11px] tracking-[0.3em] uppercase text-phos-400">
          01 / Key inspector
        </h3>
        <span
          className={`border px-2.5 py-1 font-mono text-[10.5px] tracking-wider ${
            detection.kind === "unknown"
              ? "border-ink-600 text-fog-500"
              : detection.checksumOk === false
                ? "border-alert-500/60 text-alert-300"
                : "border-phos-500/50 text-phos-300"
          }`}
        >
          {detection.note}
        </span>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* -------- input side -------- */}
        <div>
          <label className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
            key material · mnemonic / hex / WIF
          </label>
          <textarea
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setBalances({});
            }}
            spellCheck={false}
            autoComplete="off"
            placeholder={"e.g.\nwitch collapse practice feed shame open despair creek road again ice least\n— or —\n0x4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318\n— or —\nKwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn"}
            className="term-scroll mt-2 h-40 w-full resize-none border border-ink-600 bg-ink-950/90 p-3.5 font-mono text-[12.5px] leading-relaxed text-fog-100 outline-none transition-colors placeholder:text-fog-600/70 focus:border-phos-500/70"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => {
                setInput(generateDemoMnemonic());
                setPassphrase("");
                setBalances({});
              }}
              className="border border-ink-600 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-fog-400 transition-all hover:border-phos-500/60 hover:text-phos-300 active:translate-y-px"
            >
              demo mnemonic
            </button>
            <button
              onClick={() => {
                setInput(generateDemoHex());
                setBalances({});
              }}
              className="border border-ink-600 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-fog-400 transition-all hover:border-cyanx-400/60 hover:text-cyanx-300 active:translate-y-px"
            >
              demo key
            </button>
            <button
              onClick={() => {
                setInput("");
                setPassphrase("");
                setBalances({});
              }}
              className="border border-ink-600 px-3 py-1.5 font-mono text-[10.5px] tracking-[0.18em] uppercase text-fog-500 transition-all hover:border-alert-500/60 hover:text-alert-300 active:translate-y-px"
            >
              clear
            </button>
          </div>

          {detection.kind === "mnemonic" && (
            <div className="mt-4">
              <label className="font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
                optional BIP39 passphrase
              </label>
              <input
                value={passphrase}
                onChange={(e) => {
                  setPassphrase(e.target.value);
                  setBalances({});
                }}
                placeholder="empty = standard derivation"
                className="mt-1.5 w-full border border-ink-600 bg-ink-950/90 px-3 py-2 font-mono text-[12.5px] text-fog-100 outline-none transition-colors placeholder:text-fog-600/70 focus:border-phos-500/70"
              />
            </div>
          )}

          <div className="mt-5 flex gap-3 border border-amberx-500/40 bg-amberx-500/[0.06] p-3.5">
            <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-amberx-400" />
            <p className="text-[12px] leading-relaxed text-fog-400">
              Derivation runs <span className="text-amberx-300">entirely in this tab</span> — key
              material never leaves the browser and is never stored. Only public addresses touch
              the network during balance probes. Still: never paste a funded key into any web tool.
            </p>
          </div>
        </div>

        {/* -------- identity side -------- */}
        <div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] tracking-[0.24em] uppercase text-fog-500">
            <IconBolt className="h-3.5 w-3.5 text-phos-400" />
            derived identity
          </div>

          {!identity && (
            <div className="mt-4 flex h-[calc(100%-2rem)] min-h-[240px] flex-col items-center justify-center border border-dashed border-ink-600 bg-ink-950/50 p-8 text-center">
              <p className="font-mono text-[13px] text-fog-500">
                {input.trim()
                  ? "cannot derive — fix the key material on the left"
                  : "paste a mnemonic, hex key or WIF to derive its on-chain identity"}
              </p>
              <p className="mt-2 max-w-xs text-[12px] leading-relaxed text-fog-600">
                ETH · BTC-segwit · BTC-legacy addresses are computed locally via BIP32.
              </p>
            </div>
          )}

          {identity && (
            <div className="mt-4 space-y-3">
              {rows.map((r) => {
                const bal = balances[r.key] ?? { st: "idle" as const };
                return (
                  <div
                    key={r.key}
                    className="group border border-ink-700 bg-ink-950/60 p-4 transition-colors hover:border-fog-600/50"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase" style={{ color: r.color }}>
                        {r.label}
                      </span>
                      <span className="font-mono text-[10px] text-fog-600">{r.path}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <code className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-fog-100">
                        {r.addr}
                      </code>
                      <button
                        onClick={() => copy(r.key, r.addr)}
                        className="border border-ink-600 px-2 py-1 font-mono text-[9.5px] tracking-[0.18em] uppercase text-fog-500 transition-all hover:border-fog-500 hover:text-fog-200 active:translate-y-px"
                      >
                        {copied === r.key ? "copied ✓" : "copy"}
                      </button>
                      <button
                        onClick={() => probe(r.key, r.addr)}
                        disabled={bal.st === "busy"}
                        className="border border-phos-500/50 px-2 py-1 font-mono text-[9.5px] tracking-[0.18em] uppercase text-phos-300 transition-all hover:bg-phos-500/10 active:translate-y-px disabled:opacity-40"
                      >
                        {bal.st === "busy" ? "probing…" : "probe"}
                      </button>
                    </div>
                    {bal.st === "done" && (
                      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-ink-700 pt-2.5 font-mono text-[11.5px]">
                        <span className="text-phos-300">◈ {bal.res.balanceDisplay}</span>
                        {bal.res.txCount !== null && (
                          <span className="text-fog-500">{bal.res.txCount} tx on record</span>
                        )}
                        <a
                          href={bal.res.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-cyanx-300 underline-offset-4 transition-colors hover:text-cyanx-400 hover:underline"
                        >
                          explorer ↗
                        </a>
                      </div>
                    )}
                    {bal.st === "err" && (
                      <div className="mt-2.5 border-t border-ink-700 pt-2.5 font-mono text-[11px] text-alert-300">
                        probe failed — {bal.msg}
                      </div>
                    )}
                  </div>
                );
              })}

              <div className="border border-ink-700 bg-ink-950/40 p-3.5">
                <div className="font-mono text-[9.5px] tracking-[0.24em] uppercase text-fog-600">
                  compressed public key
                </div>
                <code className="mt-1 block break-all font-mono text-[11px] leading-relaxed text-fog-500">
                  {identity.pubCompressed}
                </code>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
