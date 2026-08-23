import { PORT_DB, type PortDef } from "../data/ports";

/* ------------------------------------------------------------------ */
/* types                                                               */
/* ------------------------------------------------------------------ */

export type PortStatus = "open" | "closed" | "filtered";
export type ProfileId = "quick" | "standard" | "deep" | "custom";
export type Intensity = "stealth" | "normal" | "aggressive";

export interface PortRecord {
  port: number;
  proto: "tcp" | "udp";
  service: string;
  banner: string;
  status: PortStatus;
  risk: 0 | 1 | 2 | 3;
  note: string;
  rtt: number;
}

export type LogLevel = "sys" | "ok" | "warn" | "err" | "dim" | "info";

export interface LogLine {
  id: number;
  t: string; // HH:MM:SS
  level: LogLevel;
  text: string;
}

export interface ScanConfig {
  target: string;
  profile: ProfileId;
  customFrom: number;
  customTo: number;
  intensity: Intensity;
}

export interface ScanResult {
  target: string;
  resolvedIp: string;
  profile: ProfileId;
  intensity: Intensity;
  startedAt: number;
  durationMs: number;
  portsScanned: number;
  ports: PortRecord[]; // open + filtered, sorted by port
  open: number;
  filtered: number;
  closed: number;
  score: number; // 0..100 exposure
  verdict: string;
  advisories: string[];
  packets: number;
  aborted?: boolean;
}

export type ScanEvent =
  | { type: "log"; level: LogLevel; text: string }
  | { type: "port"; record: PortRecord }
  | { type: "progress"; progress: number; scanned: number; packets: number }
  | { type: "phase"; phase: string }
  | { type: "done"; result: ScanResult };

/* ------------------------------------------------------------------ */
/* deterministic rng seeded by target                                  */
/* ------------------------------------------------------------------ */

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number, w: number) => String(n).padStart(w, "0");

/* ------------------------------------------------------------------ */
/* port-set construction                                               */
/* ------------------------------------------------------------------ */

const COMMON_ORDER = [22, 80, 443, 21, 25, 53, 3389, 445, 3306, 8080, 23, 110, 143, 5432, 6379, 139, 135, 111, 5900, 27017];

function buildPortSet(cfg: ScanConfig, rng: () => number): number[] {
  const tcpPorts = PORT_DB.filter((d) => d.proto === "tcp").map((d) => d.port);
  let set: Set<number>;
  if (cfg.profile === "quick") {
    set = new Set(COMMON_ORDER.slice(0, 20));
  } else if (cfg.profile === "standard") {
    set = new Set([...tcpPorts.slice(0, 42)]);
    while (set.size < 64) set.add(1024 + Math.floor(rng() * 9200));
  } else if (cfg.profile === "deep") {
    set = new Set(tcpPorts);
    while (set.size < 128) set.add(1 + Math.floor(rng() * 65534));
  } else {
    const from = Math.min(cfg.customFrom, cfg.customTo);
    const to = Math.max(cfg.customFrom, cfg.customTo);
    const span = Math.min(to - from + 1, 2000);
    set = new Set();
    for (let i = 0; i < span; i++) set.add(from + i);
  }
  // shuffle (Fisher–Yates) for a realistic sweep order
  const arr = [...set];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const defFor = (port: number): PortDef | undefined =>
  PORT_DB.find((d) => d.port === port);

function fakeIp(target: string, rng: () => number): string {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(target)) return target;
  return `10.${Math.floor(rng() * 240)}.${Math.floor(rng() * 240)}.${1 + Math.floor(rng() * 253)}`;
}

const RISK_WEIGHT: Record<number, number> = { 0: 2, 1: 5, 2: 13, 3: 24 };

function scoreFor(open: PortRecord[]): { score: number; verdict: string } {
  let s = 4 + open.reduce((acc, r) => acc + RISK_WEIGHT[r.risk], 0);
  s = Math.min(97, s);
  if (open.length === 0) s = 2;
  const verdict =
    s < 15 ? "LOW EXPOSURE — tight perimeter" :
    s < 40 ? "GUARDED — minor hardening advised" :
    s < 65 ? "ELEVATED — act on advisories" :
    "CRITICAL — active remediation required";
  return { score: s, verdict };
}

const ADVISORY_MAP: Record<string, string> = {
  telnet: "Disable telnet/23 — rotate any credentials ever typed into it, move to SSH.",
  "microsoft-ds": "Block SMB/445 at the edge. If file sharing is required, tunnel via VPN + SMB signing.",
  rdp: "Pull RDP/3389 behind a VPN or zero-trust gateway; enforce NLA and lockout policies.",
  netbios: "Disable NetBIOS over TCP/IP on all interfaces facing untrusted networks.",
  msrpc: "Restrict msrpc/135 to domain controllers and management VLANs.",
  redis: "Redis/6379 must require AUTH and bind to loopback — unauthenticated Redis is instant RCE.",
  mongodb: "Enable auth on MongoDB, rotate the exposed datasets' credentials and audit access logs.",
  elasticsearch: "Enable X-Pack security on Elasticsearch and remove the public listener.",
  memcached: "Disable the UDP listener on memcached and bind to localhost.",
  mssql: "Disable xp_cmdshell and pin SQL Server/1433 to internal subnets.",
  vnc: "Replace VNC/5900 with SSH-tunneled access or an encrypted remote-desktop gateway.",
  mikrotik: "Patch RouterOS (CVE-2018-14847) and disable Winbox from WAN immediately.",
  "huawei-upnp": "Retire or patch HG532-class devices (CVE-2017-17215) — botnet fuel.",
  snmp: "Migrate SNMP to v3 with auth+privacy; retire community string 'public'.",
  nfs: "Add root_squash to NFS exports and restrict to the storage VLAN.",
  "ssh-alt": "Moving SSH to a high port hides nothing — add key-only auth and fail2ban.",
  notebook: "Token-protect or firewall Jupyter/8888; a notebook is a shell.",
  "dev-http": "Remove dev servers/3000 from public interfaces; they assume a trusted LAN.",
  tftp: "TFTP has no auth — restrict to a provisioning VLAN ACL.",
  "http-mgmt2": "Change default credentials on alternate management ports/81 or retire the panel.",
  ssdp: "Filter SSDP/1900 at the perimeter — your boxes are amplification reflectors.",
  sip: "Rate-limit SIP/5060 and rotate extension secrets; toll fraud is automated.",
  mysql: "Bind MySQL to private subnets and audit remote grants for '%'.",
  postgresql: "Review pg_hba.conf — reject 'trust' and '0.0.0.0/0' entries on 5432.",
  "oracle-tns": "Enable listener ACLs on 1521 and rotate the SID list.",
  db2: "Restrict DB2/50000 DRDA to the DBA jump host.",
  ftp: "Retire FTP/21 — SFTP or object-storage pre-signed URLs instead.",
  "upnp-http": "Kill Flask/Werkzeug debug mode in production on 5000.",
};

function advisoriesFor(open: PortRecord[]): string[] {
  return open
    .filter((r) => r.risk >= 2)
    .sort((a, b) => b.risk - a.risk || a.port - b.port)
    .slice(0, 5)
    .map((r) => ADVISORY_MAP[r.service] ?? `Restrict ${r.service}/${r.port} to trusted networks and enable authentication.`);
}

/* ------------------------------------------------------------------ */
/* the engine                                                          */
/* ------------------------------------------------------------------ */

const TICK_MS: Record<Intensity, number> = { stealth: 230, normal: 105, aggressive: 42 };
const BATCH: Record<Intensity, number> = { stealth: 1, normal: 3, aggressive: 7 };
const PPS: Record<Intensity, number> = { stealth: 5, normal: 29, aggressive: 167 };

export const PROFILE_LABEL: Record<ProfileId, string> = {
  quick: "Quick sweep",
  standard: "Standard sweep",
  deep: "Deep sweep",
  custom: "Custom range",
};

export const INTENSITY_META: Record<Intensity, { label: string; pps: string }> = {
  stealth: { label: "Stealth", pps: "~5 p/s" },
  normal: { label: "Normal", pps: "~30 p/s" },
  aggressive: { label: "Aggressive", pps: "~170 p/s" },
};

const timeStr = () => {
  const d = new Date();
  return `${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`;
};

export function createScan(
  cfg: ScanConfig,
  emit: (e: ScanEvent) => void
): { stop: () => void; expected: number } {
  const seedStr = `${cfg.target.trim().toLowerCase()}::${cfg.profile}::${cfg.intensity}`;
  const rng = mulberry32(hashStr(seedStr));
  const ip = fakeIp(cfg.target, rng);
  const portList = buildPortSet(cfg, rng);
  const total = portList.length;

  let i = 0;
  let packets = 0;
  let stopped = false;
  let mode: "intro" | "sweep" | "fp" | "score" = "intro";
  let introStep = 0;
  let fpStep = 0;
  let scoreStep = 0;
  const startedAt = Date.now();
  const found: PortRecord[] = [];
  let fpPorts: PortRecord[] = [];

  const log = (level: LogLevel, text: string) => emit({ type: "log", level, text });

  const processPort = (port: number) => {
    const def = defFor(port);
    const roll = rng();
    const openP = def ? def.commonality * 0.75 : 0.1;
    const filteredP = def ? 0.1 : 0.14;
    let status: PortStatus = "closed";
    if (roll < openP) status = "open";
    else if (roll < openP + filteredP) status = "filtered";
    const rtt = Math.round((1.2 + rng() * 68) * 10) / 10;
    if (status === "closed") {
      // log a sparse sample of closed ports for texture
      if (rng() < 0.055) log("dim", `PORT ${port}/tcp  closed   (${rtt}ms reset)`);
      return;
    }
    const record: PortRecord = def
      ? {
          port,
          proto: def.proto,
          service: def.service,
          banner: def.banners[Math.floor(rng() * def.banners.length)],
          status,
          risk: def.risk,
          note: def.desc,
          rtt,
        }
      : {
          port,
          proto: "tcp",
          service: "unidentified",
          banner: status === "open" ? `${(2 + rng() * 4).toFixed(1)}KB response, no signature` : "—",
          status,
          risk: 1,
          note: "No signature match in the local database; treat as untrusted.",
          rtt,
        };
    found.push(record);
    if (status === "open") {
      const tag = record.risk >= 3 ? "⚠" : "·";
      log("ok", `PORT ${port}/${record.proto}  OPEN     ${record.service.padEnd(14, " ")} ${rtt}ms ${tag}`);
    } else {
      log("warn", `PORT ${port}/${record.proto}  FILTERED ${record.service.padEnd(14, " ")} no-response`);
    }
    emit({ type: "port", record });
  };

  const step = () => {
    if (mode === "intro") {
      if (introStep === 0) {
        emit({ type: "phase", phase: "host discovery" });
        log("sys", `scnr v0.9.3 — session armed @ ${timeStr()} [${cfg.intensity} profile]`);
        log("info", `target  ${cfg.target}  →  resolving …`);
      } else if (introStep === 1) {
        log("info", `DNS/PTR ${cfg.target}  →  ${ip}`);
        log("ok", `host is up — icmp echo rtt ${(0.4 + rng() * 11).toFixed(1)}ms, ttl ${48 + Math.floor(rng() * 16)}`);
      } else if (introStep === 2) {
        emit({ type: "phase", phase: "syn sweep" });
        log("sys", `initiating SYN sweep — ${total} ports @ ${INTENSITY_META[cfg.intensity].pps}`);
        mode = "sweep";
      }
      introStep++;
      return;
    }

    if (mode === "sweep") {
      const batch = BATCH[cfg.intensity];
      for (let k = 0; k < batch && i < total; k++, i++) processPort(portList[i]);
      packets += batch + Math.floor(rng() * 4);
      emit({ type: "progress", progress: i / total, scanned: i, packets });
      if (i >= total) {
        const o = found.filter((f) => f.status === "open").length;
        const f = found.length - o;
        emit({ type: "phase", phase: "fingerprinting" });
        log("info", `sweep complete — ${total} ports in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
        log("sys", `raw tally: ${o} open / ${f} filtered / ${total - o - f} closed`);
        fpPorts = found.filter((x) => x.status === "open" && x.banner !== "—");
        if (fpPorts.length === 0) mode = "score";
        else log("info", `fingerprinting ${fpPorts.length} service banner(s) …`);
        mode = fpPorts.length === 0 ? "score" : "fp";
      }
      return;
    }

    if (mode === "fp") {
      const r = fpPorts[fpStep++];
      if (r) log("info", `  ↳ ${r.port}/${r.proto}  ${r.banner}`);
      if (fpStep >= fpPorts.length) {
        emit({ type: "phase", phase: "risk scoring" });
        log("sys", "correlating exposure against policy baseline …");
        mode = "score";
        scoreStep = 0;
      }
      return;
    }

    // scoring
    scoreStep++;
    if (scoreStep === 1) {
      const open = found.filter((f) => f.status === "open");
      const { score, verdict } = scoreFor(open);
      const filtered = found.filter((f) => f.status === "filtered");
      const sorted = [...found].sort((a, b) => a.port - b.port);
      const result: ScanResult = {
        target: cfg.target,
        resolvedIp: ip,
        profile: cfg.profile,
        intensity: cfg.intensity,
        startedAt,
        durationMs: Date.now() - startedAt,
        portsScanned: total,
        ports: sorted,
        open: open.length,
        filtered: filtered.length,
        closed: total - open.length - filtered.length,
        score,
        verdict,
        advisories: advisoriesFor(open),
        packets,
      };
      log(score >= 65 ? "err" : score >= 40 ? "warn" : "ok", `EXPOSURE SCORE ${score}/100 — ${verdict}`);
      log("sys", `done. ${packets} packets, ${((Date.now() - startedAt) / 1000).toFixed(2)}s elapsed`);
      emit({ type: "done", result });
      clearInterval(iv);
    }
  };

  const iv = setInterval(() => {
    if (!stopped) step();
  }, TICK_MS[cfg.intensity]);

  return {
    expected: total,
    stop: () => {
      stopped = true;
      clearInterval(iv);
      emit({ type: "phase", phase: "aborted" });
      log("err", "SIGINT received — scan aborted by operator");
      const open = found.filter((f) => f.status === "open");
      const filtered = found.filter((f) => f.status === "filtered");
      const { score, verdict } = scoreFor(open);
      emit({
        type: "done",
        result: {
          target: cfg.target,
          resolvedIp: ip,
          profile: cfg.profile,
          intensity: cfg.intensity,
          startedAt,
          durationMs: Date.now() - startedAt,
          portsScanned: i,
          ports: [...found].sort((a, b) => a.port - b.port),
          open: open.length,
          filtered: filtered.length,
          closed: Math.max(0, i - found.length),
          score,
          verdict: `ABORTED — partial · ${verdict}`,
          advisories: advisoriesFor(open),
          packets,
          aborted: true,
        },
      });
    },
  };
}

/* ------------------------------------------------------------------ */
/* validation                                                          */
/* ------------------------------------------------------------------ */

export function validateTarget(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "Enter a target — IPv4 address or hostname.";
  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = t.match(ipv4);
  if (m) {
    for (let k = 1; k <= 4; k++) if (Number(m[k]) > 255) return "Invalid IPv4 — octets must be 0–255.";
    return null;
  }
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/.test(t)) return null;
  return "Target must be an IPv4 address or a valid hostname.";
}

export function download(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}
