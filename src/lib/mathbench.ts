/* ------------------------------------------------------------------ */
/* secp256k1 folklore audit — every claim computed live with BigInt EC */
/* ------------------------------------------------------------------ */

export const P: bigint = 0xfffffffffffffffffffffffffffffffffffffffffffffffffffffffefffffc2fn;
export const N: bigint = 0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cd0364141n;
export const GX: bigint = 0x79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798n;
export const GY: bigint = 0x483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8n;
export const BETA: bigint = 0x7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501een;
export const LAMBDA: bigint = 0x5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72n;
export const C_GAP: bigint = (1n << 32n) + 977n; // 2^32 + 977

export type Point = [bigint, bigint] | null;
export const G: Point = [GX, GY];

function modinv(a: bigint, m: bigint): bigint {
  let [oldR, r] = [((a % m) + m) % m, m];
  let [oldS, s] = [1n, 0n];
  while (r !== 0n) {
    const q = oldR / r;
    [oldR, r] = [r, oldR - q * r];
    [oldS, s] = [s, oldS - q * s];
  }
  return ((oldS % m) + m) % m;
}

export function modPow(base: bigint, e: bigint, m: bigint): bigint {
  let b = ((base % m) + m) % m;
  let res = 1n;
  while (e > 0n) {
    if (e & 1n) res = (res * b) % m;
    b = (b * b) % m;
    e >>= 1n;
  }
  return res;
}

export function pointAdd(p1: Point, p2: Point): Point {
  if (!p1) return p2;
  if (!p2) return p1;
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  if (x1 === x2 && y1 !== y2) return null;
  let m: bigint;
  if (x1 === x2) {
    m = (3n * x1 * x1) * modinv(2n * y1, P) % P;
  } else {
    m = (y2 - y1) * modinv(x2 - x1, P) % P;
  }
  m = ((m % P) + P) % P;
  const x3 = ((m * m - x1 - x2) % P + P) % P;
  const y3 = ((m * (x1 - x3) - y1) % P + P) % P;
  return [x3, y3];
}

export function pointMul(k: bigint, pt: Point, raw = false): Point {
  let res: Point = null;
  let cur: Point = pt;
  // raw = true skips the mod-n reduction so checks like n·G = ∞
  // actually perform the multiplication instead of short-circuiting
  let e = raw ? k : ((k % N) + N) % N;
  while (e > 0n) {
    if (e & 1n) res = pointAdd(res, cur);
    cur = pointAdd(cur, cur);
    e >>= 1n;
  }
  return res;
}

export function bitLen(x: bigint): number {
  let bits = 0;
  let t = x;
  while (t > 0n) {
    t >>= 1n;
    bits++;
  }
  return bits;
}

/* ------------------------------------------------------------------ */
/* claim ledger                                                        */
/* ------------------------------------------------------------------ */
export type Verdict = "verified" | "trivial" | "tautology" | "numerology" | "misleading";

export interface ClaimResult {
  id: string;
  group: string;
  title: string;
  formula: string;
  computed: string;
  ok: boolean;
  verdict: Verdict;
  note: string;
}

const ZERO_POSITIONS = [4, 6, 7, 8, 9, 32];

export function runSuite(): { claims: ClaimResult[]; ms: number } {
  const t0 = performance.now();
  const claims: ClaimResult[] = [];
  const add = (c: ClaimResult) => claims.push(c);

  /* ---- curve foundation ---- */
  const onCurve = (GY * GY - (GX * GX * GX + 7n)) % P === 0n;
  add({
    id: "c01", group: "Curve foundation", title: "Generator lies on the curve",
    formula: "Gy² ≡ Gx³ + 7 (mod p)",
    computed: onCurve ? "identity holds over F_p" : "FAILED", ok: onCurve, verdict: "verified",
    note: "The defining equation of secp256k1. Everything downstream inherits it — nothing hidden, nothing extra.",
  });

  const sparse = P === (1n << 256n) - C_GAP;
  add({
    id: "c02", group: "Curve foundation", title: "Sparse prime construction",
    formula: "p = 2²⁵⁶ − (2³² + 977)",
    computed: sparse ? "exact match" : "FAILED", ok: sparse, verdict: "verified",
    note: "The sparse form is deliberate engineering: it makes modular reduction fast on commodity CPUs. Real efficiency gain, documented in SEC 2.",
  });

  const zeros: number[] = [];
  for (let i = 0; i < 256; i++) if (!((P >> BigInt(i)) & 1n)) zeros.push(i);
  const onesOk = zeros.length === 6 && zeros.every((z, i) => z === ZERO_POSITIONS[i]);
  add({
    id: "c03", group: "Curve foundation", title: "Zero-bit fingerprint of p",
    formula: "zeros(p) = {4, 6, 7, 8, 9, 32} · 250 ones",
    computed: `zeros at {${zeros.join(", ")}} · ${256 - zeros.length} ones`,
    ok: onesOk, verdict: "verified",
    note: "Six zero bits are forced arithmetic: subtract 2³² + 977 from 2²⁵⁶ and you must get them. A consequence of the construction, not a clue to anything.",
  });

  const nG = pointMul(N, G, true); // genuine 256-bit multiplication, no reduction shortcut
  const cofactor = nG === null;
  add({
    id: "c04", group: "Curve foundation", title: "Generator spans the group",
    formula: "n · G = ∞  (cofactor 1)",
    computed: cofactor ? "point at infinity ✓" : "FAILED", ok: cofactor, verdict: "verified",
    note: "Prime order, cofactor 1: G generates the entire group of n points. Standard, audited for two decades, boring in the best sense.",
  });

  const a = 1n << 16n;
  const diffSq = a * a - (a - 1n) * (a - 1n);
  const mersenne = diffSq === (1n << 17n) - 1n && diffSq === 131071n;
  add({
    id: "c05", group: "Curve foundation", title: "Difference of squares → M₁₇",
    formula: "(2¹⁶)² − (2¹⁶−1)² = 2¹⁷ − 1 = 131,071",
    computed: `= ${diffSq.toLocaleString()}`, ok: mersenne, verdict: "trivial",
    note: "a² − (a−1)² = 2a − 1 holds for every a. Plugging in a = 2¹⁶ lands on the Mersenne prime M₁₇, but the identity is plain arithmetic, not cryptography.",
  });

  /* ---- GLV endomorphism ---- */
  const betaOk = modPow(BETA, 3n, P) === 1n && BETA !== 1n;
  add({
    id: "c06", group: "GLV endomorphism", title: "Cube root of unity in F_p",
    formula: "β³ ≡ 1 (mod p), β ≠ 1",
    computed: betaOk ? "β³ mod p = 1 ✓" : "FAILED", ok: betaOk, verdict: "verified",
    note: "The genuine GLV endomorphism from Gallant–Lambert–Vanstone (2001). libsecp256k1 uses it in production to roughly double scalar-multiplication speed.",
  });

  const lambdaOk = (LAMBDA * LAMBDA + LAMBDA + 1n) % N === 0n;
  add({
    id: "c07", group: "GLV endomorphism", title: "Eigenvalue modulo group order",
    formula: "λ² + λ + 1 ≡ 0 (mod n)",
    computed: lambdaOk ? "(λ²+λ+1) mod n = 0 ✓" : "FAILED", ok: lambdaOk, verdict: "verified",
    note: "λ is β's counterpart mod n. Together they let one 256-bit multiplication be split into two ~128-bit ones. Published, peer-reviewed, deployed.",
  });

  const phi: Point = [(BETA * GX) % P, GY];
  const lamG = pointMul(LAMBDA, G);
  const phiOk = phi !== null && lamG !== null && phi[0] === lamG[0] && phi[1] === lamG[1];
  add({
    id: "c08", group: "GLV endomorphism", title: "Endomorphism acts as scalar-mul",
    formula: "ϕ(G) = (β·Gx, Gy) = [λ]G",
    computed: phiOk ? "coordinates match ✓" : "FAILED", ok: phiOk, verdict: "verified",
    note: "The coordinate map equals scalar multiplication by λ on the generator — that is the whole GLV trick. It speeds up computation; it reveals nothing about other keys.",
  });

  /* ---- Zweng folklore ---- */
  const inv2 = modinv(2n, N);
  const H = pointMul(inv2, G);
  const twoH = pointAdd(H, H);
  const halvOk = H !== null && twoH !== null && twoH[0] === GX && twoH[1] === GY;
  add({
    id: "c09", group: "Zweng folklore", title: "Point halving",
    formula: "H = [2⁻¹ mod n]G,  2·H = G",
    computed: halvOk ? "2·H = G ✓" : "FAILED", ok: halvOk, verdict: "trivial",
    note: "Halving exists on ANY curve of odd order — multiply by the inverse of 2. H is public knowledge anyone can recompute; deriving it is not a discovery.",
  });

  const xH = H ? H[0] : 0n;
  const xBits = bitLen(xH);
  const shortX = xBits === 166;
  add({
    id: "c10", group: "Zweng folklore", title: "“Anomalous” short x-coordinate",
    formula: "bit-length of x(H) = 166  (90 leading zeros)",
    computed: `${xBits} bits · ${256 - xBits} leading zeros`,
    ok: shortX, verdict: "misleading",
    note: "The measurement is real; the “anomaly” is selection bias. Every specific x-coordinate has some bit-length, and short ones occur routinely — the demystifier below shows why. No private key is leaked: H is a public point.",
  });

  const hexH = xH.toString(16);
  const hasBlock = hexH.includes("8ce563");
  add({
    id: "c11", group: "Zweng folklore", title: "Hex block “8ce563” inside x(H)",
    formula: "x(H) ⊇ 0x…8ce563…",
    computed: hasBlock ? `found at index ${hexH.indexOf("8ce563")}` : "not found",
    ok: hasBlock, verdict: "numerology",
    note: "A six-hex block chosen after looking at the value. Given enough computed points, any short block turns up somewhere — patterns are free, information costs entropy.",
  });

  /* ---- geometric numerology ---- */
  const packing = Math.PI / 6;
  add({
    id: "c12", group: "Geometric numerology", title: "Sphere-in-cube packing ratio",
    formula: "V(sphere) / V(cube) = π/6 ≈ 52.36%",
    computed: `π/6 ≈ ${packing.toFixed(6)}`, ok: true, verdict: "trivial",
    note: "Textbook density of the simple cubic lattice. Correct mathematics, completely orthogonal to the curve.",
  });

  const r2 = 2 * 2 + 2 * 2 + 2 * 2;
  const fcc = r2 === 12 && r2 === 10 * 1 * 1 + 2;
  add({
    id: "c13", group: "Geometric numerology", title: "Diagonal triplet ↔ “FCC shell”",
    formula: "(2,2,2): r² = 12 = 10·1² + 2 = “J(1)”",
    computed: `r² = ${r2}`, ok: fcc, verdict: "numerology",
    note: "12 = 10·1² + 2 is a restatement of 12 = 12. The true FCC nearest-neighbor shell sits at r² = 2 in lattice units. The match is cosmetic numerology.",
  });

  const stride = 32 * r2;
  add({
    id: "c14", group: "Geometric numerology", title: "Candidate stride",
    formula: "32 · J(1) = 384 (0x0180)",
    computed: `= ${stride}`, ok: stride === 384, verdict: "trivial",
    note: "Multiplication. 32 · 12 = 384 needs no elliptic curve, no lattice, and grants no advantage.",
  });

  /* ---- bounded candidate set ---- */
  const maxR2 = 65536 / 32; // 2048
  let triplets = 0;
  const lim = Math.floor(Math.sqrt(maxR2));
  for (let x = 1; x <= lim; x++) {
    const mx = Math.floor(Math.sqrt(maxR2 - x * x));
    for (let y = x; y <= mx; y++) {
      const my = Math.floor(Math.sqrt(maxR2 - x * x - y * y));
      for (let z = y; z <= my; z++) triplets++;
    }
  }
  add({
    id: "c15", group: "Geometric numerology", title: "Triplet count under D = 2¹⁶",
    formula: "#{(x≤y≤z) : 32(x²+y²+z²) < 2¹⁶}",
    computed: `${triplets.toLocaleString()} triplets`, ok: triplets === 8243, verdict: "verified",
    note: "Reproducible by plain enumeration in milliseconds. The count is real — the question is what 8,243 candidates buy you against a 2²⁵⁶ keyspace. See c17.",
  });

  const prob = triplets / Number(N >> 128n) / 2 ** 128; // triplets / n
  add({
    id: "c16", group: "Geometric numerology", title: "Collision odds vs. uniform keys",
    formula: "8,243 / n ≈ 7.1 × 10⁻⁷⁴",
    computed: `${prob.toExponential(2)}`, ok: prob < 1e-70, verdict: "verified",
    note: "The number that buries the method: sweeping these candidates is brute force over ~10⁻⁷⁴ of the keyspace. No better than uniform guessing — and uniform guessing is hopeless by design.",
  });

  /* ---- audit function ---- */
  const cInv = modinv(C_GAP, N);
  const bal = (x: bigint) => (x <= N / 2n ? x : x - N);
  const audit = (d: bigint) => bal((d * cInv) % N);
  const off = 384n;
  const dTest = (off * C_GAP) % N;
  const inv = audit(dTest) === off;
  add({
    id: "c17", group: "Audit tautology", title: "Audit inversion identity",
    formula: "ρ(o·C mod n) = bal(d·C⁻¹ mod n) = o",
    computed: inv ? `ρ(384·C mod n) = ${audit(dTest)} ✓` : "FAILED",
    ok: inv, verdict: "tautology",
    note: "ρ undoes a transformation you applied yourself. Evaluating ρ(d) = o requires already holding d — the private key. It “unmasks” nothing you didn't already know, for any key, structured or not.",
  });

  return { claims, ms: performance.now() - t0 };
}

/* ------------------------------------------------------------------ */
/* demystifier: x-coordinate bit lengths across multiples of G         */
/* ------------------------------------------------------------------ */
export interface BarDatum {
  k: number;
  bits: number;
}

export function xBitLengths(fromK: number, toK: number): BarDatum[] {
  const out: BarDatum[] = [];
  for (let k = fromK; k <= toK; k++) {
    const q = pointMul(BigInt(k), G);
    out.push({ k, bits: q ? bitLen(q[0]) : 0 });
  }
  return out;
}
