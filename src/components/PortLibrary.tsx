import { useMemo, useState } from "react";
import { CATEGORY_LABEL, PORT_DB, type Category } from "../data/ports";
import { IconSearch } from "./icons";
import { Reveal } from "./chrome";

const RISK_DOTS: Record<number, string> = {
  0: "bg-cyanx-400",
  1: "bg-phos-400",
  2: "bg-amberx-400",
  3: "bg-alert-400",
};

const RISK_NAME: Record<number, string> = { 0: "informational", 1: "low", 2: "high", 3: "critical" };

export default function PortLibrary() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | "all">("all");

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PORT_DB.filter((d) => (cat === "all" ? true : d.category === cat))
      .filter(
        (d) =>
          !q ||
          d.service.toLowerCase().includes(q) ||
          d.desc.toLowerCase().includes(q) ||
          String(d.port).includes(q)
      )
      .sort((a, b) => a.port - b.port || a.proto.localeCompare(b.proto));
  }, [query, cat]);

  const cats: (Category | "all")[] = ["all", "remote", "web", "data", "mail", "infra", "misc"];

  return (
    <Reveal className="panel corner-frame overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-ink-700/70 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`border px-2.5 py-1.5 font-mono text-[10.5px] tracking-widest uppercase transition-all duration-200 ${
                cat === c
                  ? "border-cyanx-400/70 bg-cyanx-400/10 text-cyanx-300"
                  : "border-ink-600 text-fog-500 hover:border-fog-500 hover:text-fog-200"
              }`}
            >
              {c === "all" ? `all · ${PORT_DB.length}` : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
        <label className="flex w-full items-center gap-2.5 border border-ink-600 bg-ink-950/70 px-3 py-2 transition-colors focus-within:border-cyanx-400 lg:w-72">
          <IconSearch className="h-4 w-4 shrink-0 text-fog-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search service, port, keyword…"
            spellCheck={false}
            className="w-full bg-transparent font-mono text-[12.5px] text-fog-100 placeholder-fog-600 outline-none"
          />
        </label>
      </div>

      <div className="term-scroll max-h-[520px] overflow-y-auto">
        <table className="w-full min-w-[760px] text-left text-[13px]">
          <thead className="sticky top-0 z-10 bg-ink-900">
            <tr className="border-b border-ink-700/70 font-mono text-[9.5px] tracking-[0.24em] uppercase text-fog-600">
              <th className="px-5 py-3 font-medium">port</th>
              <th className="px-3 py-3 font-medium">service</th>
              <th className="px-3 py-3 font-medium">category</th>
              <th className="px-3 py-3 font-medium">risk</th>
              <th className="px-3 py-3 font-medium">field notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={`${d.port}-${d.proto}-${d.service}`}
                className="group border-b border-ink-800/70 transition-colors duration-200 hover:bg-ink-800/40"
              >
                <td className="px-5 py-3 font-mono text-fog-100">
                  {d.port}
                  <span className="text-fog-600">/{d.proto}</span>
                </td>
                <td className="px-3 py-3 font-mono text-fog-200">{d.service}</td>
                <td className="px-3 py-3 text-fog-500">{CATEGORY_LABEL[d.category]}</td>
                <td className="px-3 py-3">
                  <span className="flex items-center gap-2 font-mono text-[10.5px] tracking-widest uppercase text-fog-400">
                    <span className={`h-2 w-2 ${RISK_DOTS[d.risk]} transition-transform duration-200 group-hover:scale-125`} />
                    {RISK_NAME[d.risk]}
                  </span>
                </td>
                <td className="max-w-[340px] px-3 py-3 text-[12.5px] leading-snug text-fog-500 transition-colors group-hover:text-fog-300">
                  {d.desc}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-14 text-center font-mono text-[12px] text-fog-600">
                  no entries match “{query}” — try a port number or service name
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 border-t border-ink-700/70 px-5 py-3 font-mono text-[10.5px] tracking-wider text-fog-600">
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 bg-cyanx-400" /> informational</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 bg-phos-400" /> low</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 bg-amberx-400" /> high</span>
        <span className="flex items-center gap-1.5"><i className="h-2 w-2 bg-alert-400" /> critical</span>
        <span className="ml-auto">{rows.length} of {PORT_DB.length} records</span>
      </div>
    </Reveal>
  );
}
