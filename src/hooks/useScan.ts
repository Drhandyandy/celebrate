import { useCallback, useEffect, useRef, useState } from "react";
import {
  createScan,
  validateTarget,
  type Intensity,
  type LogLine,
  type PortRecord,
  type ProfileId,
  type ScanConfig,
  type ScanResult,
} from "../lib/engine";

export type ScanState = "idle" | "running" | "done" | "aborted";

export interface HistoryEntry {
  id: string;
  target: string;
  profile: ProfileId;
  intensity: Intensity;
  at: number;
  open: number;
  filtered: number;
  scanned: number;
  score: number;
  durationMs: number;
  aborted?: boolean;
  ports: PortRecord[];
  advisories: string[];
}

const HISTORY_KEY = "scnr09.history.v1";
const MAX_HISTORY = 12;
let lineId = 0;

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
};

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryEntry[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY) : [];
  } catch {
    return [];
  }
}

export function useScan() {
  const [state, setState] = useState<ScanState>("idle");
  const [config, setConfig] = useState<ScanConfig>({
    target: "",
    profile: "standard",
    customFrom: 1,
    customTo: 1024,
    intensity: "normal",
  });
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [ports, setPorts] = useState<PortRecord[]>([]);
  const [progress, setProgress] = useState(0);
  const [scanned, setScanned] = useState(0);
  const [packets, setPackets] = useState(0);
  const [expected, setExpected] = useState(0);
  const [phase, setPhase] = useState("standby");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);

  const engineRef = useRef<{ stop: () => void } | null>(null);
  const startedRef = useRef(0);
  const elapsedIv = useRef<number | null>(null);
  const portsRef = useRef<PortRecord[]>([]);

  const pushLog = useCallback((level: LogLine["level"], text: string) => {
    setLogs((prev) => {
      const next = [...prev, { id: ++lineId, t: stamp(), level, text }];
      return next.length > 400 ? next.slice(next.length - 400) : next;
    });
  }, []);

  const stopTiming = useCallback(() => {
    if (elapsedIv.current !== null) {
      window.clearInterval(elapsedIv.current);
      elapsedIv.current = null;
    }
  }, []);

  const startTiming = useCallback(() => {
    stopTiming();
    startedRef.current = Date.now();
    setElapsed(0);
    elapsedIv.current = window.setInterval(() => {
      setElapsed(Date.now() - startedRef.current);
    }, 100);
  }, [stopTiming]);

  const persistHistory = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      } catch {
        /* storage unavailable — ignore */
      }
      return next;
    });
  }, []);

  const start = useCallback(() => {
    const err = validateTarget(config.target);
    setError(err);
    if (err) return;
    if (state === "running") return;

    // reset
    engineRef.current?.stop();
    engineRef.current = null;
    setLogs([]);
    setPorts([]);
    portsRef.current = [];
    setProgress(0);
    setScanned(0);
    setPackets(0);
    setResult(null);
    setState("running");
    startTiming();

    const engine = createScan(config, (e) => {
      switch (e.type) {
        case "log":
          pushLog(e.level, e.text);
          break;
        case "port":
          portsRef.current = [...portsRef.current, e.record];
          setPorts(portsRef.current);
          break;
        case "progress":
          setProgress(e.progress);
          setScanned(e.scanned);
          setPackets(e.packets);
          break;
        case "phase":
          setPhase(e.phase);
          break;
        case "done": {
          stopTiming();
          const finalElapsed = Date.now() - startedRef.current;
          setElapsed(finalElapsed);
          setProgress(1);
          setResult(e.result);
          setState(e.result.aborted ? "aborted" : "done");
          engineRef.current = null;
          persistHistory({
            id: `${e.result.startedAt}-${Math.random().toString(36).slice(2, 7)}`,
            target: e.result.target,
            profile: e.result.profile,
            intensity: e.result.intensity,
            at: e.result.startedAt,
            open: e.result.open,
            filtered: e.result.filtered,
            scanned: e.result.portsScanned,
            score: e.result.score,
            durationMs: e.result.durationMs,
            aborted: e.result.aborted,
            ports: e.result.ports,
            advisories: e.result.advisories,
          });
          break;
        }
      }
    });
    engineRef.current = engine;
    setExpected(engine.expected);
    pushLog("sys", `armed: ${config.target} · ${config.profile} profile · ${config.intensity} intensity`);
  }, [config, state, pushLog, startTiming, stopTiming, persistHistory]);

  const abort = useCallback(() => {
    engineRef.current?.stop();
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const loadFromHistory = useCallback((entry: HistoryEntry) => {
    engineRef.current?.stop();
    engineRef.current = null;
    setState("done");
    setConfig((c) => ({ ...c, target: entry.target, profile: entry.profile, intensity: entry.intensity }));
    setPorts(entry.ports);
    portsRef.current = entry.ports;
    setProgress(1);
    setScanned(entry.scanned);
    setExpected(entry.scanned);
    setElapsed(entry.durationMs);
    setPhase(entry.aborted ? "aborted" : "complete");
    setError(null);
    setPackets(0);
    setResult({
      target: entry.target,
      resolvedIp: "—",
      profile: entry.profile,
      intensity: entry.intensity,
      startedAt: entry.at,
      durationMs: entry.durationMs,
      portsScanned: entry.scanned,
      ports: entry.ports,
      open: entry.open,
      filtered: entry.filtered,
      closed: Math.max(0, entry.scanned - entry.ports.length),
      score: entry.score,
      verdict: entry.aborted ? "FROM HISTORY — partial scan" : "FROM HISTORY — replayed result",
      advisories: entry.advisories,
      packets: 0,
      aborted: entry.aborted,
    });
    setLogs([
      { id: ++lineId, t: stamp(), level: "sys", text: `restored scan of ${entry.target} from session history (${new Date(entry.at).toLocaleString()})` },
      { id: ++lineId, t: stamp(), level: entry.score >= 65 ? "err" : entry.score >= 40 ? "warn" : "ok", text: `EXPOSURE SCORE ${entry.score}/100 — ${entry.open} open / ${entry.filtered} filtered across ${entry.scanned} ports` },
    ]);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => () => stopTiming(), [stopTiming]);
  useEffect(
    () => () => {
      /* nothing to clean synchronously; interval cleared by stopTiming */
    },
    []
  );

  return {
    state,
    config,
    setConfig,
    logs,
    ports,
    progress,
    scanned,
    expected,
    packets,
    phase,
    elapsed,
    result,
    error,
    history,
    start,
    abort,
    clearLogs,
    loadFromHistory,
    clearHistory,
  };
}
