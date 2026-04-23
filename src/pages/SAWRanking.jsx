import { useState, useEffect } from "react";
import {
  BarChart2, Users, FileText, Banknote, Calendar, Search,
  LayoutGrid, Table, SlidersHorizontal, FunctionSquare,
  AlertTriangle, Inbox, List, Trophy
} from "lucide-react";
import { getAllData } from "./../api";

// ── CONFIG ───────────────────────────────────────────────────
const DEFAULT_WBP = 0.6;

const MODES = {
  bas: { label: "BAS", nameCol: "BAS Name" },
  lsr: { label: "LSR", nameCol: "LSR Name" },
};

// ── Helpers ──────────────────────────────────────────────────
const fmt = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

const fmtShort = (n) => {
  if (n >= 1e9) return "Rp" + (n / 1e9).toFixed(1) + "M";
  if (n >= 1e6) return "Rp" + (n / 1e6).toFixed(0) + "jt";
  return fmt(n);
};

const medalConfig = (rank) => {
  if (rank === 1) return { card: "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50", badge: "bg-gradient-to-br from-yellow-400 to-amber-500 text-white shadow-amber-200", pill: "bg-amber-100 text-amber-800", label: "🥇" };
  if (rank === 2) return { card: "border-slate-300 bg-gradient-to-br from-slate-50 to-gray-100",  badge: "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-200", pill: "bg-slate-100 text-slate-600", label: "🥈" };
  if (rank === 3) return { card: "border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50", badge: "bg-gradient-to-br from-orange-400 to-orange-700 text-white shadow-orange-200", pill: "bg-orange-100 text-orange-800", label: "🥉" };
  return { card: "border-slate-100 bg-white", badge: "bg-slate-100 text-slate-500", pill: "bg-gray-100 text-gray-500", label: `#${rank}` };
};

// ── SAW Engine ────────────────────────────────────────────────
function computeSAW(data, periodeFilter, wBP, mode) {
  const { nameCol } = MODES[mode];
  const wFee = +(1 - wBP).toFixed(2);

  const filtered = periodeFilter
    ? data.filter((r) => String(r["Periode"] || "").toLowerCase().includes(periodeFilter.toLowerCase()))
    : data;

  const map = {};
  filtered.forEach((row) => {
    const name = String(row[nameCol] || "").trim();
    if (!name) return;
    const bp  = parseFloat(row["Basic Premium Regular"]) || 0;
    const fee = parseFloat(row["Fee Based"]) || 0;
    if (!map[name]) map[name] = { totalBP: 0, totalFee: 0, count: 0 };
    map[name].totalBP  += bp;
    map[name].totalFee += fee;
    map[name].count    += 1;
  });

  const names = Object.keys(map);
  if (!names.length) return [];

  const maxBP  = Math.max(...names.map((n) => map[n].totalBP));
  const maxFee = Math.max(...names.map((n) => map[n].totalFee));

  return names
    .map((name) => {
      const d     = map[name];
      const nBP   = maxBP  > 0 ? d.totalBP  / maxBP  : 0;
      const nFee  = maxFee > 0 ? d.totalFee / maxFee  : 0;
      const score = +(nBP * wBP + nFee * wFee).toFixed(4);
      return { name, totalBP: d.totalBP, totalFee: d.totalFee, count: d.count, normBP: +nBP.toFixed(4), normFee: +nFee.toFixed(4), score };
    })
    .sort((a, b) => b.score - a.score)
    .map((d, i) => ({ rank: i + 1, ...d }));
}

// ── Sub-components ────────────────────────────────────────────
function ScoreBar({ value }) {
  return (
    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2">
      <div
        className="h-1.5 rounded-full transition-all duration-700"
        style={{ width: `${Math.round(value * 100)}%`, background: "linear-gradient(90deg,#003087,#E8601C)" }}
      />
    </div>
  );
}

function WeightSlider({ wBP, setWBP }) {
  const pct = Math.round(wBP * 100);
  return (
    <div className="flex items-center gap-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
      <SlidersHorizontal size={14} className="text-slate-400 shrink-0" />
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">Bobot</span>
      <div className="flex flex-1 items-center gap-3">
        <span className="text-xs font-bold text-[#003087] w-16 shrink-0">BP {pct}%</span>
        <input
          type="range" min={0} max={100} step={5} value={pct}
          onChange={(e) => setWBP(+e.target.value / 100)}
          className="flex-1 h-1.5 accent-[#E8601C] cursor-pointer rounded-full"
        />
        <span className="text-xs font-bold text-[#E8601C] w-16 shrink-0 text-right">Fee {100 - pct}%</span>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, accent, iconBg, iconColor }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 relative overflow-hidden shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: accent }} />
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: iconBg }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-extrabold text-[#001F5B]">{value}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-[72px] bg-slate-100 rounded-2xl" />
      ))}
    </div>
  );
}

function CardView({ data }) {
  return (
    <div className="space-y-2.5">
      {data.map((d) => {
        const m = medalConfig(d.rank);
        return (
          <div
            key={d.name}
            className={`border ${m.card} rounded-2xl px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-150`}
          >
            <div className={`${m.badge} w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black shrink-0 shadow-md`}>
              {m.label}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[#001F5B] text-sm truncate">{d.name}</p>
              <div className="flex gap-4 mt-1 text-xs text-slate-400 flex-wrap">
                <span>Polis: <strong className="text-slate-600">{d.count}</strong></span>
                <span>BP: <strong className="text-slate-600">{fmtShort(d.totalBP)}</strong></span>
                <span>Fee: <strong className="text-slate-600">{fmtShort(d.totalFee)}</strong></span>
              </div>
              <ScoreBar value={d.score} />
            </div>
            <div className="flex gap-5 shrink-0 text-right">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Norm BP</p>
                <p className="text-sm font-bold font-mono text-[#003087] mt-0.5">{d.normBP.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Norm Fee</p>
                <p className="text-sm font-bold font-mono text-[#E8601C] mt-0.5">{d.normFee.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Skor SAW</p>
                <p className="text-lg font-black font-mono text-[#001F5B] mt-0.5">{d.score.toFixed(4)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TableView({ data, ranking }) {
  return (
    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b-2 border-slate-100">
              {["Rank", "Nama", "Polis", "Total BP", "Total Fee", "Norm BP", "Norm Fee", "Skor SAW"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((d) => {
              const m = medalConfig(d.rank);
              return (
                <tr key={d.name} className="border-b border-slate-50 hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className={`${m.pill} rounded-lg px-2 py-0.5 text-xs font-bold`}>{m.label}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-[#001F5B] whitespace-nowrap">{d.name}</td>
                  <td className="px-4 py-3 text-slate-500">{d.count}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{fmtShort(d.totalBP)}</td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap font-mono text-xs">{fmtShort(d.totalFee)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#003087]">{d.normBP.toFixed(4)}</td>
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-[#E8601C]">{d.normFee.toFixed(4)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#001F5B] font-mono text-sm">{d.score.toFixed(4)}</span>
                      <div className="w-14 bg-slate-100 rounded-full h-1.5">
                        <div
                          className="h-1.5 rounded-full"
                          style={{ width: `${Math.round(d.score * 100)}%`, background: "linear-gradient(90deg,#003087,#E8601C)" }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 text-xs text-slate-400 font-medium flex items-center gap-2">
        <List size={13} />
        Menampilkan {data.length} dari {ranking.length} entri
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function SAWRanking() {
  const [allData,  setAllData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [mode,     setMode]     = useState("bas");
  const [periode,  setPeriode]  = useState("");
  const [wBP,      setWBP]      = useState(DEFAULT_WBP);
  const [ranking,  setRanking]  = useState([]);
  const [search,   setSearch]   = useState("");
  const [view,     setView]     = useState("card");

  useEffect(() => {
    setLoading(true);
    getAllData()
      .then((res) => { setAllData(Array.isArray(res) ? res : []); setLoading(false); })
      .catch((e)  => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!allData.length) return;
    setRanking(computeSAW(allData, periode, wBP, mode));
    setSearch("");
  }, [allData, periode, wBP, mode]);

  const periodeList = [...new Set(allData.map((r) => r["Periode"]).filter(Boolean))].sort();
  const displayed   = ranking.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));
  const topEntry    = ranking[0];
  const modeLabel   = MODES[mode].label;

  return (
    <div className="min-h-screen bg-[#F2F4F8] p-6 font-sans">

      {/* Header */}
      <div
        className="rounded-2xl p-6 mb-5 flex items-center justify-between relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#001F5B 0%,#003087 100%)" }}
      >
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.04]" />
        <div className="absolute right-16 -bottom-14 w-36 h-36 rounded-full bg-white/[0.03]" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center">
            <BarChart2 size={22} color="white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-tight">Ranking SAW — {modeLabel}</p>
            <p className="text-white/50 text-xs mt-0.5 font-normal">Simple Additive Weighting · BNI Life Insurance</p>
          </div>
        </div>
        {topEntry && !loading && (
          <div className="text-right relative z-10 hidden sm:block">
            <p className="text-white/45 text-[10px] uppercase tracking-widest font-bold flex items-center justify-end gap-1">
              <Trophy size={11} /> {modeLabel} Terbaik
            </p>
            <p className="text-white font-bold text-sm mt-1 truncate max-w-[200px]">{topEntry.name}</p>
            <p className="text-amber-300 font-black text-xl font-mono">{topEntry.score.toFixed(4)}</p>
          </div>
        )}
      </div>

      {/* Tab BAS / LSR */}
      <div className="flex gap-2 mb-5">
        {Object.entries(MODES).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setMode(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-150 border ${
              mode === key
                ? "bg-[#003087] text-white border-[#003087] shadow-md shadow-blue-200"
                : "bg-white text-slate-500 border-slate-200 hover:border-[#003087]/40 hover:text-[#003087]"
            }`}
          >
            <Users size={15} />
            Ranking {cfg.label}
          </button>
        ))}
      </div>

      {/* KPI */}
      {!loading && ranking.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-5">
          <KPICard icon={Users}    label={`Total ${modeLabel}`} value={ranking.length} accent="#003087" iconBg="#EEF4FF" iconColor="#003087" />
          <KPICard icon={FileText} label="Total Polis"  value={ranking.reduce((s, r) => s + r.count, 0).toLocaleString("id-ID")} accent="#E8601C" iconBg="#FFF4EE" iconColor="#E8601C" />
          <KPICard icon={Banknote} label="Total Premium" value={fmtShort(ranking.reduce((s, r) => s + r.totalBP, 0))} accent="#00857C" iconBg="#E8F8F7" iconColor="#00857C" />
        </div>
      )}

      {/* Controls */}
      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              <Calendar size={11} /> Periode
            </label>
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10 appearance-none cursor-pointer"
            >
              <option value="">Semua Periode</option>
              {periodeList.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              <Search size={11} /> Cari {modeLabel}
            </label>
            <input
              type="text"
              placeholder={`Ketik nama ${modeLabel}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-[#003087] focus:ring-2 focus:ring-[#003087]/10"
            />
          </div>
          <div className="shrink-0 self-end">
            <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">
              <LayoutGrid size={11} /> Tampilan
            </label>
            <div className="flex border border-slate-200 rounded-xl overflow-hidden">
              {[{ id: "card", label: "Card", Icon: LayoutGrid }, { id: "table", label: "Tabel", Icon: Table }].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold transition-all ${
                    view === id ? "bg-[#003087] text-white" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <WeightSlider wBP={wBP} setWBP={setWBP} />

        <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-[#003087]/70 font-medium">
          <FunctionSquare size={14} className="text-[#003087] shrink-0" />
          <span>
            <strong className="text-[#003087]">Rumus SAW:</strong>{" "}
            Skor = (norm_BP × <strong>{Math.round(wBP * 100)}%</strong>) + (norm_Fee × <strong>{Math.round((1 - wBP) * 100)}%</strong>)
            {" · "}Normalisasi benefit: nilai ÷ nilai_maks
          </span>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 mb-4 text-sm font-medium">
          <AlertTriangle size={16} className="shrink-0" />
          Gagal mengambil data: {error}
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm"><Skeleton /></div>
      ) : displayed.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl p-14 text-center shadow-sm">
          <Inbox size={36} className="mx-auto mb-3 text-slate-300" />
          <p className="text-slate-400 text-sm font-medium">Tidak ada data yang cocok.</p>
        </div>
      ) : view === "card" ? (
        <CardView data={displayed} />
      ) : (
        <TableView data={displayed} ranking={ranking} />
      )}

      <p className="text-center text-xs text-slate-400 mt-6 pb-2">
        © 2025 BNI Life Insurance — SAW Ranking Internal
      </p>
    </div>
  );
}