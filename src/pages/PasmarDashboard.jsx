import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const BNI_TEAL   = "#00A99D";
const GREEN      = "#16a34a";
const RED        = "#dc2626";
const AMBER      = "#d97706";
const PURPLE     = "#7c3aed";

const PALETTE = [BNI_BLUE2, BNI_ORANGE, BNI_TEAL, GREEN, PURPLE, RED, AMBER];

const PER_PAGE = 20;

// Segmen nominal
const SEGMENTS = [
  { label: "< 1 Juta",      min: 0,        max: 1_000_000,      color: BNI_TEAL   },
  { label: "1–10 Juta",     min: 1_000_000, max: 10_000_000,    color: BNI_BLUE2  },
  { label: "10–50 Juta",    min: 10_000_000, max: 50_000_000,   color: BNI_ORANGE },
  { label: "50–100 Juta",   min: 50_000_000, max: 100_000_000,  color: PURPLE     },
  { label: "> 100 Juta",    min: 100_000_000, max: Infinity,    color: GREEN      },
];

// ── HELPERS ────────────────────────────────────────────────────────────────
function fmtIDR(n) {
  if (n >= 1e9)  return "Rp " + (n / 1e9).toFixed(2)  + "M";
  if (n >= 1e6)  return "Rp " + (n / 1e6).toFixed(1)  + "jt";
  if (n >= 1e3)  return "Rp " + (n / 1e3).toFixed(0)  + "rb";
  return "Rp " + n.toLocaleString("id-ID");
}
function fmtFull(n) {
  return "Rp " + Number(n).toLocaleString("id-ID");
}

/**
 * Sembunyikan nama nasabah — sisakan 3 huruf pertama + bintang
 * Contoh: "Budi Santoso" → "Bud *******"
 */
function maskName(name) {
  if (!name) return "-";
  const str = String(name);
  if (str.length <= 3) return str;
  return str.substring(0, 3) + " " + "*".repeat(Math.min(str.length - 3, 7));
}

function getSegment(nominal) {
  return SEGMENTS.find(s => nominal >= s.min && nominal < s.max) || SEGMENTS[SEGMENTS.length - 1];
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accentColor, iconBg, icon: Icon }) {
  return (
    <div style={{
      background: "white", borderRadius: 16,
      border: "1px solid rgba(0,63,135,0.08)",
      padding: "18px 20px", position: "relative", overflow: "hidden",
      boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
      transition: "transform .15s, box-shadow .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,63,135,0.13)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,63,135,0.07)"; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accentColor, borderRadius: "16px 16px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</p>
          <div style={{ fontSize: 22, fontWeight: 800, color: BNI_BLUE }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
        </div>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={18} color={accentColor} />
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, sub, badge, children }) {
  return (
    <div style={{
      background: "white", borderRadius: 16,
      border: "1px solid rgba(0,63,135,0.07)",
      padding: "18px 20px",
      boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2, whiteSpace: "nowrap" }}>
          {badge}
        </span>
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid rgba(0,63,135,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || BNI_BLUE2, margin: "2px 0" }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// Inline SVG icons
const IconUsers    = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconCoins    = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>;
const IconTrendUp  = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconAward    = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>;
const IconSearch   = ({ size = 14, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconBank     = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;
const IconEyeOff   = ({ size = 13, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function PasmarDashboard({ data: propData, loading = false }) {

  const data = useMemo(() => {
    if (!propData || propData.length === 0) return [];
    return propData.map(r => ({
      ...r,
      NO:      String(r.NO),
      NOMINAL: Number(r.NOMINAL) || 0,
      NAMA:    String(r.NAMA || ""),
    }));
  }, [propData]);

  // ── KPI ──
  const stats = useMemo(() => {
    if (!data.length) return { total: 0, totalNominal: 0, avg: 0, max: 0, maxNama: "-" };
    const sorted = [...data].sort((a, b) => b.NOMINAL - a.NOMINAL);
    const totalNominal = data.reduce((s, r) => s + r.NOMINAL, 0);
    return {
      total: data.length,
      totalNominal,
      avg:  Math.round(totalNominal / data.length),
      max:  sorted[0]?.NOMINAL || 0,
      maxNama: maskName(sorted[0]?.NAMA || "-"),
    };
  }, [data]);

  // ── Ranking top 10 ──
  const top10 = useMemo(() =>
    [...data].sort((a, b) => b.NOMINAL - a.NOMINAL).slice(0, 10).map((r, i) => ({
      rank: i + 1,
      nama: maskName(r.NAMA),
      no: r.NO,
      nominal: r.NOMINAL,
    })),
  [data]);

  // Bar chart top 10
  const top10Chart = useMemo(() =>
    top10.map(r => ({ label: "#" + r.rank + " " + r.nama, nominal: r.nominal })),
  [top10]);

  // ── Segmentasi ──
  const segData = useMemo(() => {
    return SEGMENTS.map(seg => {
      const count = data.filter(r => r.NOMINAL >= seg.min && r.NOMINAL < seg.max).length;
      const total = data.filter(r => r.NOMINAL >= seg.min && r.NOMINAL < seg.max).reduce((s, r) => s + r.NOMINAL, 0);
      return { ...seg, count, total };
    });
  }, [data]);

  // ── Distribusi bar 20-bucket histogram ──
  const histData = useMemo(() => {
    if (!data.length) return [];
    const max = Math.max(...data.map(r => r.NOMINAL));
    const bucketSize = max / 10;
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      label: fmtIDR(i * bucketSize) + "–" + fmtIDR((i + 1) * bucketSize),
      count: 0,
    }));
    data.forEach(r => {
      const idx = Math.min(Math.floor(r.NOMINAL / bucketSize), 9);
      buckets[idx].count++;
    });
    return buckets;
  }, [data]);

  // ── Table ──
  const [search, setSearch]       = useState("");
  const [filterSeg, setFilterSeg] = useState("");
  const [sortBy, setSortBy]       = useState("nominal_desc");
  const [page, setPage]           = useState(1);
  const [showReal, setShowReal]   = useState(false); // toggle nama asli

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r =>
        r.NAMA.toLowerCase().includes(q) ||
        String(r.NO).includes(q)
      );
    }
    if (filterSeg) {
      const seg = SEGMENTS.find(s => s.label === filterSeg);
      if (seg) rows = rows.filter(r => r.NOMINAL >= seg.min && r.NOMINAL < seg.max);
    }
    if (sortBy === "nominal_desc") rows.sort((a, b) => b.NOMINAL - a.NOMINAL);
    else if (sortBy === "nominal_asc") rows.sort((a, b) => a.NOMINAL - b.NOMINAL);
    else if (sortBy === "no_asc") rows.sort((a, b) => Number(a.NO) - Number(b.NO));
    return rows;
  }, [data, search, filterSeg, sortBy]);

  useEffect(() => { setPage(1); }, [search, filterSeg, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const dateStr    = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

  // ── RENDER ──
  return (
    <div style={{ padding: "24px 28px 40px", background: "#F0F4FA", minHeight: "100vh" }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #002960 0%, #003F87 100%)",
        borderRadius: 18, padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconBank size={24} />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Dashboard Analisis Nasabah Pasmar</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>Distribusi & ranking nominal nasabah</div>
          </div>
        </div>
        <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
          {/* <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Dicetak pada</div> */}
          <div style={{ color: "white", fontWeight: 700, fontSize: 13, marginTop: 2 }}>{dateStr}</div>
        </div>
      </div>

      {/* KPI */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Nasabah"      value={stats.total + " nasabah"}  sub="Terdaftar di DATA_PASMAR"           accentColor={BNI_BLUE2}  iconBg="rgba(0,63,135,0.1)"   icon={IconUsers}   />
        <KpiCard label="Total Nominal"      value={fmtIDR(stats.totalNominal)} sub="Akumulasi seluruh nasabah"        accentColor={GREEN}      iconBg="rgba(22,163,74,0.1)"  icon={IconCoins}   />
        <KpiCard label="Rata-rata Nominal"  value={fmtIDR(stats.avg)}          sub="Per nasabah"                     accentColor={BNI_ORANGE} iconBg="rgba(243,112,33,0.1)" icon={IconTrendUp} />
        <KpiCard label="Nominal Tertinggi"  value={fmtIDR(stats.max)}          sub={stats.maxNama}                   accentColor={PURPLE}     iconBg="rgba(124,58,237,0.1)" icon={IconAward}   />
      </div>

      {/* Row 1: Ranking Top 10 */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Ranking Top 10 Nasabah" sub="Berdasarkan nominal tertinggi" badge="Ranking">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={top10Chart} layout="vertical" barCategoryGap="25%" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtIDR} />
              <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={110} />
              <Tooltip content={<CustomTooltip formatter={fmtFull} />} />
              <Bar dataKey="nominal" name="Nominal" radius={[0, 6, 6, 0]}>
                {top10Chart.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Segmentasi + Distribusi histogram */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 3fr", gap: 16, marginBottom: 16 }}>

        {/* Pie segmentasi */}
        <ChartCard title="Segmentasi Nasabah" sub="Berdasarkan range nominal" badge="Segmen">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={segData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} dataKey="count" paddingAngle={3}>
                {segData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Pie>
              <Tooltip formatter={(v, n, p) => [v + " nasabah", p.payload.label]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: -4 }}>
            {segData.map(s => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 5, color: "#64748b" }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0, display: "inline-block" }} />
                  {s.label}
                </span>
                <span style={{ fontWeight: 700, color: BNI_BLUE }}>{s.count} nasabah</span>
              </div>
            ))}
          </div>
        </ChartCard>

        {/* Histogram distribusi */}
        <ChartCard title="Distribusi Nominal" sub="Sebaran nasabah per range nilai" badge="Distribusi">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={histData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" height={48} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Jumlah Nasabah" radius={[4, 4, 0, 0]}>
                {histData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Total nominal per segmen bar */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Total Nominal per Segmen" sub="Akumulasi nominal per kategori nasabah" badge="Nilai">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={segData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtIDR} />
              <Tooltip content={<CustomTooltip formatter={fmtFull} />} />
              <Bar dataKey="total" name="Total Nominal" radius={[4, 4, 0, 0]}>
                {segData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>Detail Data Nasabah</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Maks. {PER_PAGE} baris per halaman • nama disembunyikan</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {/* Toggle show real name */}
            <button
              onClick={() => setShowReal(v => !v)}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                fontSize: 11, padding: "5px 12px", borderRadius: 8,
                border: "1px solid " + (showReal ? BNI_ORANGE : "#e2e8f0"),
                background: showReal ? "rgba(243,112,33,0.08)" : "white",
                color: showReal ? BNI_ORANGE : "#64748b",
                cursor: "pointer", fontWeight: 600,
              }}
            >
              <IconEyeOff color={showReal ? BNI_ORANGE : "#94a3b8"} />
              {showReal ? "Sembunyikan Nama" : "Tampilkan Nama"}
            </button>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2 }}>
              {filtered.length} nasabah
            </span>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", flex: 1, minWidth: 180 }}>
            <IconSearch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama / nomor nasabah..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: "#334155", width: "100%" }}
            />
          </div>
          <select value={filterSeg} onChange={e => setFilterSeg(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", cursor: "pointer" }}>
            <option value="">Semua segmen</option>
            {SEGMENTS.map(s => <option key={s.label} value={s.label}>{s.label}</option>)}
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", cursor: "pointer" }}>
            <option value="nominal_desc">Nominal ↓ Terbesar</option>
            <option value="nominal_asc">Nominal ↑ Terkecil</option>
            <option value="no_asc">NO ↑ Urut</option>
          </select>
          {(search || filterSeg) && (
            <button onClick={() => { setSearch(""); setFilterSeg(""); }}
              style={{ fontSize: 11, padding: "6px 12px", borderRadius: 8, border: "1px solid #e2e8f0", background: "white", color: "#64748b", cursor: "pointer" }}>
              Reset filter
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["Rank","NO","Nama Nasabah","Nominal","Segmen"].map(h => (
                  <th key={h} style={{
                    textAlign: h === "Nominal" ? "right" : "left",
                    padding: "8px 12px", fontSize: 10, fontWeight: 700,
                    color: "#94a3b8", textTransform: "uppercase",
                    letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Tidak ada data</td></tr>
              ) : pageData.map((r, i) => {
                const globalRank = filtered.findIndex(x => x.NO === r.NO && x.NOMINAL === r.NOMINAL) + 1;
                const seg = getSegment(r.NOMINAL);
                const isTop3 = globalRank <= 3 && sortBy === "nominal_desc" && !search && !filterSeg;
                return (
                  <tr key={r.NO + i}
                    style={{ borderBottom: "1px solid #f1f5f9", background: isTop3 ? "rgba(0,63,135,0.02)" : "" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = isTop3 ? "rgba(0,63,135,0.02)" : ""}
                  >
                    <td style={{ padding: "8px 12px" }}>
                      {isTop3 ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                          width: 22, height: 22, borderRadius: "50%", fontSize: 10, fontWeight: 800,
                          background: globalRank === 1 ? "#fef08a" : globalRank === 2 ? "#e2e8f0" : "#fed7aa",
                          color: globalRank === 1 ? "#854d0e" : globalRank === 2 ? "#475569" : "#9a3412",
                        }}>{globalRank}</span>
                      ) : (
                        <span style={{ fontSize: 11, color: "#cbd5e1" }}>{(page - 1) * PER_PAGE + i + 1}</span>
                      )}
                    </td>
                    <td style={{ padding: "8px 12px", color: "#334155" }}>{r.NO}</td>
                    <td style={{ padding: "8px 12px", color: "#334155", fontFamily: "monospace", fontSize: 11 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {showReal ? r.NAMA : maskName(r.NAMA)}
                        {!showReal && <IconEyeOff size={11} />}
                      </div>
                    </td>
                    <td style={{ padding: "8px 12px", color: "#334155", textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>
                      {fmtFull(r.NOMINAL)}
                    </td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: seg.color + "20", color: seg.color,
                      }}>{seg.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Hal {page}/{totalPages} — {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} nasabah
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagiBtn disabled={page <= 1}          onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages
                ? <PagiBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PagiBtn>
                : null;
            })}
            <PagiBtn disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</PagiBtn>
          </div>
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
        © 2025 BNI Life Insurance — Dashboard Nasabah Pasmar Internal
      </p>
    </div>
  );
}

function PagiBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "4px 10px", fontSize: 11, borderRadius: 6, cursor: disabled ? "default" : "pointer",
      border: "1px solid " + (active ? BNI_BLUE2 : "#e2e8f0"),
      background: active ? BNI_BLUE2 : "white",
      color: active ? "white" : disabled ? "#cbd5e1" : "#334155",
      transition: "all .1s",
    }}>{children}</button>
  );
}