import { base58check } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";

/* ------------------------------------------------------------------ */
/* chain detection                                                     */
/* ------------------------------------------------------------------ */
export type ChainId = "eth" | "btc" | "sol";

export const CHAIN_META: Record<
  ChainId,
  { label: string; symbol: string; color: string; explorer: (addr: string) => string }
> = {
  eth: {
    label: "Ethereum",
    symbol: "ETH",
    color: "#4fd8e8",
    explorer: (a) => `https://etherscan.io/address/${a}`,
  },
  btc: {
    label: "Bitcoin",
    symbol: "BTC",
    color: "#ffb454",
    explorer: (a) => `https://blockstream.info/address/${a}`,
  },
  sol: {
    label: "Solana",
    symbol: "SOL",
    color: "#7cf5c3",
    explorer: (a) => `https://solscan.io/account/${a}`,
  },
};

const b58c = base58check(sha256);

export function detectChain(addr: string): ChainId | null {
  const a = addr.trim();
  if (/^0x[a-fA-F0-9]{40}$/.test(a)) return "eth";
  if (/^bc1[qp][a-z0-9]{10,80}$/i.test(a)) return "btc";
  if (/^[13][a-km-zA-HJ-NP-Z1-9]{25,39}$/.test(a)) {
    try {
      b58c.decode(a);
      return "btc";
    } catch {
      /* fall through */
    }
  }
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return "sol";
  return null;
}

/* ------------------------------------------------------------------ */
/* RPC helpers                                                         */
/* ------------------------------------------------------------------ */
async function rpc(url: string, body: unknown, ms = 9000): Promise<any> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctl.signal,
    });
    if (!res.ok) throw new Error(`http ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const ETH_RPCS = [
  "https://cloudflare-eth.com",
  "https://eth.llamarpc.com",
  "https://rpc.ankr.com/eth",
];

async function ethCall(method: string, params: unknown[]): Promise<any> {
  let lastErr: unknown = new Error("no endpoints");
  for (const url of ETH_RPCS) {
    try {
      const j = await rpc(url, { jsonrpc: "2.0", id: 1, method, params });
      if (j.error) throw new Error(j.error.message ?? "rpc error");
      return j.result;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

/* ------------------------------------------------------------------ */
/* formatting                                                          */
/* ------------------------------------------------------------------ */
export function formatWei(wei: bigint): string {
  const unit = 10n ** 18n;
  const whole = wei / unit;
  const frac = (wei % unit).toString().padStart(18, "0").slice(0, 6).replace(/0+$/, "");
  return `${whole.toString()}${frac ? "." + frac : ""}`;
}

export function formatSats(sats: number): string {
  const v = sats / 1e8;
  return v.toFixed(8).replace(/\.?0+$/, "") || "0";
}

export function formatLamports(l: number): string {
  const v = l / 1e9;
  return v.toFixed(6).replace(/\.?0+$/, "") || "0";
}

/* ------------------------------------------------------------------ */
/* probes                                                              */
/* ------------------------------------------------------------------ */
export interface ProbeResult {
  chain: ChainId;
  address: string;
  balanceDisplay: string;
  balanceNum: number;
  txCount: number | null;
  explorerUrl: string;
  fetchedAt: number;
}

export async function probeAddress(address: string): Promise<ProbeResult> {
  const chain = detectChain(address);
  if (!chain) throw new Error("unrecognized address format");
  const meta = CHAIN_META[chain];

  if (chain === "eth") {
    const hex = await ethCall("eth_getBalance", [address, "latest"]);
    const wei = BigInt(hex);
    return {
      chain,
      address,
      balanceDisplay: `${formatWei(wei)} ETH`,
      balanceNum: Number(wei / 10n ** 12n) / 1e6,
      txCount: null,
      explorerUrl: meta.explorer(address),
      fetchedAt: Date.now(),
    };
  }

  if (chain === "btc") {
    const res = await fetch(`https://blockstream.info/api/address/${address}`);
    if (!res.ok) throw new Error(`blockstream http ${res.status}`);
    const j = await res.json();
    const sats =
      j.chain_stats.funded_txo_sum -
      j.chain_stats.spent_txo_sum +
      j.mempool_stats.funded_txo_sum -
      j.mempool_stats.spent_txo_sum;
    return {
      chain,
      address,
      balanceDisplay: `${formatSats(sats)} BTC`,
      balanceNum: sats / 1e8,
      txCount: j.chain_stats.tx_count + j.mempool_stats.tx_count,
      explorerUrl: meta.explorer(address),
      fetchedAt: Date.now(),
    };
  }

  // sol
  const j = await rpc("https://api.mainnet-beta.solana.com", {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address],
  });
  if (j.error) throw new Error(j.error.message ?? "solana rpc error");
  const lamports: number = j.result.value;
  return {
    chain,
    address,
    balanceDisplay: `${formatLamports(lamports)} SOL`,
    balanceNum: lamports / 1e9,
    txCount: null,
    explorerUrl: meta.explorer(address),
    fetchedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ */
/* live chain tips (for the ticker / hero readouts)                    */
/* ------------------------------------------------------------------ */
export async function fetchBtcTip(): Promise<number | null> {
  try {
    const res = await fetch("https://blockstream.info/api/blocks/tip/height");
    if (!res.ok) return null;
    return Number(await res.text());
  } catch {
    return null;
  }
}

export async function fetchEthSlot(): Promise<number | null> {
  try {
    const hex = await ethCall("eth_blockNumber", []);
    return Number(BigInt(hex));
  } catch {
    return null;
  }
}
