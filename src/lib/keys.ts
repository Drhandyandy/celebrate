import { HDKey } from "@scure/bip32";
import {
  mnemonicToSeedSync,
  validateMnemonic,
  generateMnemonic,
} from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english";
import { base58check, bech32 } from "@scure/base";
import { sha256 } from "@noble/hashes/sha256";
import { ripemd160 } from "@noble/hashes/ripemd160";
import { keccak_256 } from "@noble/hashes/sha3";
import { bytesToHex, hexToBytes, concatBytes } from "@noble/hashes/utils";
import { secp256k1 } from "@noble/curves/secp256k1";

/* ------------------------------------------------------------------ */
/* wordlist (defensive across @scure/bip39 export shapes)              */
/* ------------------------------------------------------------------ */
const wl = wordlist as unknown as { words?: string[] } | string[];
export const WORDS: string[] = Array.isArray(wl) ? wl : (wl.words as string[]);
const WORD_SET = new Set(WORDS);

export const isWord = (w: string) => WORD_SET.has(w.toLowerCase());

/* ------------------------------------------------------------------ */
/* address primitives                                                  */
/* ------------------------------------------------------------------ */
const utf8 = (s: string) => new TextEncoder().encode(s);
const b58c = base58check(sha256);

export function checksumAddress(raw20: Uint8Array): string {
  const lower = bytesToHex(raw20);
  const h = keccak_256(utf8(lower));
  let out = "0x";
  for (let i = 0; i < 20; i++) {
    const nibble = i % 2 === 0 ? (h[i >> 1] >> 4) & 0xf : h[i >> 1] & 0xf;
    out += nibble >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return out;
}

export function ethAddressFromPrivateKey(priv: Uint8Array): string {
  const pub = secp256k1.getPublicKey(priv, false); // uncompressed, 65B
  return checksumAddress(keccak_256(pub.subarray(1)).subarray(12));
}

export function btcAddressesFromPublicKey(pub: Uint8Array): {
  bech32: string;
  legacy: string;
} {
  const h160 = ripemd160(sha256(pub));
  const legacy = b58c.encode(concatBytes(new Uint8Array([0x00]), h160));
  const segwit = bech32.encode("bc", [0, ...bech32.toWords(h160)]);
  return { bech32: segwit, legacy };
}

/* ------------------------------------------------------------------ */
/* key material decoding                                               */
/* ------------------------------------------------------------------ */
export type KeyInputKind = "mnemonic" | "hex" | "wif" | "unknown";

export function decodeWif(
  wif: string
): { priv: Uint8Array; compressed: boolean } | null {
  try {
    const data = b58c.decode(wif.trim());
    if (data[0] !== 0x80) return null;
    if (data.length === 33) return { priv: data.slice(1), compressed: false };
    if (data.length === 34 && data[33] === 0x01)
      return { priv: data.slice(1, 33), compressed: true };
    return null;
  } catch {
    return null;
  }
}

export interface Detection {
  kind: KeyInputKind;
  note: string;
  checksumOk?: boolean;
  wordCount?: number;
}

export function detectKeyInput(raw: string): Detection {
  const s = raw.trim();
  if (!s) return { kind: "unknown", note: "awaiting key material…" };

  const words = s.split(/\s+/);
  if ([12, 15, 18, 21, 24].includes(words.length)) {
    const bad = words.filter((w) => !isWord(w));
    if (bad.length > 0)
      return {
        kind: "unknown",
        note: `mnemonic-shaped · ${bad.length} word(s) outside the BIP39 list: ${bad
          .slice(0, 3)
          .join(", ")}`,
        wordCount: words.length,
      };
    const ok = validateMnemonic(words.join(" "), wordlist);
    return {
      kind: "mnemonic",
      note: ok
        ? `BIP39 mnemonic · ${words.length} words · checksum valid`
        : `BIP39 mnemonic · ${words.length} words · CHECKSUM INVALID`,
      checksumOk: ok,
      wordCount: words.length,
    };
  }

  const hex = s.startsWith("0x") ? s.slice(2) : s;
  if (/^[0-9a-fA-F]{64}$/.test(hex))
    return {
      kind: "hex",
      note: "raw secp256k1 private key · 256-bit · assume live funds",
    };

  if (/^[5KL9][1-9A-HJ-NP-Za-km-z]{50,51}$/.test(s)) {
    const d = decodeWif(s);
    return d
      ? {
          kind: "wif",
          note: `WIF private key · ${d.compressed ? "compressed" : "uncompressed"} · checksum valid`,
        }
      : { kind: "unknown", note: "WIF-shaped · base58 checksum failed" };
  }

  return { kind: "unknown", note: "unrecognized format" };
}

/* ------------------------------------------------------------------ */
/* identity derivation                                                 */
/* ------------------------------------------------------------------ */
export interface DerivedIdentity {
  kind: Exclude<KeyInputKind, "unknown">;
  ethAddress: string;
  btcBech32: string;
  btcLegacy: string;
  pubCompressed: string;
  paths: { eth: string; btcSegwit: string; btcLegacy: string };
}

export function deriveIdentity(
  raw: string,
  passphrase = ""
): DerivedIdentity | null {
  const det = detectKeyInput(raw);

  if (det.kind === "mnemonic" && det.checksumOk) {
    const seed = mnemonicToSeedSync(raw.trim().split(/\s+/).join(" "), passphrase);
    const root = HDKey.fromMasterSeed(seed);
    const eth = root.derive("m/44'/60'/0'/0/0");
    const seg = root.derive("m/84'/0'/0'/0/0");
    const leg = root.derive("m/44'/0'/0'/0/0");
    const btc = btcAddressesFromPublicKey(seg.publicKey!);
    const btcLegacy = btcAddressesFromPublicKey(leg.publicKey!).legacy;
    return {
      kind: "mnemonic",
      ethAddress: ethAddressFromPrivateKey(eth.privateKey!),
      btcBech32: btc.bech32,
      btcLegacy,
      pubCompressed: bytesToHex(eth.publicKey!),
      paths: { eth: "m/44'/60'/0'/0/0", btcSegwit: "m/84'/0'/0'/0/0", btcLegacy: "m/44'/0'/0'/0/0" },
    };
  }

  let priv: Uint8Array | null = null;
  let compressed = true;
  if (det.kind === "hex") {
    const hex = raw.trim().startsWith("0x") ? raw.trim().slice(2) : raw.trim();
    try {
      priv = hexToBytes(hex);
    } catch {
      priv = null;
    }
  } else if (det.kind === "wif") {
    const d = decodeWif(raw.trim());
    if (d) {
      priv = d.priv;
      compressed = d.compressed;
    }
  }
  if (!priv) return null;

  const pubC = secp256k1.getPublicKey(priv, true);
  const pubU = secp256k1.getPublicKey(priv, false);
  const btc = btcAddressesFromPublicKey(compressed ? pubC : pubU);
  return {
    kind: det.kind as "hex" | "wif",
    ethAddress: ethAddressFromPrivateKey(priv),
    btcBech32: btc.bech32,
    btcLegacy: btc.legacy,
    pubCompressed: bytesToHex(pubC),
    paths: {
      eth: "direct key (non-HD)",
      btcSegwit: compressed ? "direct key · compressed pubkey" : "direct key · uncompressed pubkey",
      btcLegacy: compressed ? "direct key · compressed pubkey" : "direct key · uncompressed pubkey",
    },
  };
}

/* ------------------------------------------------------------------ */
/* demo material (generated locally, holds nothing)                    */
/* ------------------------------------------------------------------ */
export function generateDemoMnemonic(): string {
  return generateMnemonic(wordlist, 128);
}

export function generateDemoHex(): string {
  const b = new Uint8Array(32);
  crypto.getRandomValues(b);
  return "0x" + bytesToHex(b);
}

/* ------------------------------------------------------------------ */
/* recovery sweep engine                                               */
/* ------------------------------------------------------------------ */
export interface RecoveryCandidate {
  idx: number;
  words: string[];
  address: string;
}

export interface RecoveryOutcome {
  tested: number;
  total: number;
  found: RecoveryCandidate[];
  completed: boolean;
}

const ETH_FIRST = "m/44'/60'/0'/0/0";

export async function runRecovery(opts: {
  slots: string[];
  unknowns: number[];
  onBatch: (tested: number, total: number, found: RecoveryCandidate[]) => void;
  cancelled: () => boolean;
  cap?: number;
}): Promise<RecoveryOutcome> {
  const { slots, unknowns, onBatch, cancelled } = opts;
  const cap = opts.cap ?? 400;
  const total = Math.pow(WORDS.length, unknowns.length);
  const found: RecoveryCandidate[] = [];
  const base = slots.map((w) => w.toLowerCase());
  let tested = 0;
  let last = performance.now();

  for (let n = 0; n < total; n++) {
    if (cancelled()) break;
    let x = n;
    for (let k = unknowns.length - 1; k >= 0; k--) {
      base[unknowns[k]] = WORDS[x % WORDS.length];
      x = Math.floor(x / WORDS.length);
    }
    const mn = base.join(" ");
    if (validateMnemonic(mn, wordlist)) {
      const seed = mnemonicToSeedSync(mn, "");
      const node = HDKey.fromMasterSeed(seed).derive(ETH_FIRST);
      found.push({
        idx: n,
        words: base.slice(),
        address: ethAddressFromPrivateKey(node.privateKey!),
      });
      if (found.length >= cap) {
        tested = n + 1;
        break;
      }
    }
    tested = n + 1;
    if (performance.now() - last > 48) {
      onBatch(tested, total, found.slice());
      await new Promise((r) => setTimeout(r, 0));
      last = performance.now();
    }
  }

  onBatch(tested, total, found.slice());
  return { tested, total, found, completed: tested >= total || found.length >= cap };
}
