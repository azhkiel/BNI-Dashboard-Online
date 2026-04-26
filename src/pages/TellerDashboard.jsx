import { useRef, useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from "recharts";
// import { getAllDataTeller } from "./../api";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const BNI_TEAL   = "#00A99D";
const RED        = "#dc2626";
const GREEN      = "#16a34a";
const PALETTE    = [BNI_BLUE2, BNI_ORANGE, BNI_TEAL, RED, "#7c3aed", "#0891b2", "#65a30d"];
const PER_PAGE   = 20;

// ── HELPERS ────────────────────────────────────────────────────────────────
function fmtIDR(n) {
  if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(2) + "M";
  if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(0) + "jt";
  return "Rp " + n.toLocaleString("id-ID");
}
function fmtFull(n) {
  return "Rp " + n.toLocaleString("id-ID");
}
function groupSum(arr, key, valKey) {
  return arr.reduce((m, r) => {
    const k = r[key];
    m[k] = (m[k] || 0) + (valKey ? Number(r[valKey]) : 1);
    return m;
  }, {});
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accentColor, iconBg, icon: Icon }) {
  return (
    <div style={{
      background: "white",
      borderRadius: 16,
      border: "1px solid rgba(0,63,135,0.08)",
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
      boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
      transition: "transform .15s, box-shadow .15s",
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,63,135,0.13)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,63,135,0.07)"; }}
    >
      {/* top accent */}
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
        <span style={{
          fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999,
          background: "rgba(0,63,135,0.08)", color: BNI_BLUE2, whiteSpace: "nowrap",
        }}>{badge}</span>
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "white", border: "1px solid rgba(0,63,135,0.12)",
      borderRadius: 10, padding: "10px 14px", fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    }}>
      <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || BNI_BLUE2, margin: "2px 0" }}>
          {p.name}: {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

// Lucide-style icons (inline SVG — no dependency needed)
const IconCreditCard = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
  </svg>
);
const IconTrendUp = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconTrendDown = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);
const IconClock = ({ size = 18, color }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconSearch = ({ size = 14, color = "#94a3b8" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconBank = ({ size = 24 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/>
    <line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/>
    <line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/>
  </svg>
);

// ── MAIN DASHBOARD ─────────────────────────────────────────────────────────
export default function TellerDashboard({ data: propData, loading = false }) {
//   const data = propData || [];
  const data = useMemo(() => {
    if (!propData || propData.length === 0) return [];
    return propData.map(r => {
      const time = r.TIME ? r.TIME.split(" ")[1]?.substring(0, 5) : "00:00";
      return { ...r, DATETIME: r.DATE?.split(" ")[0] + " " + time };
    });
  }, [propData]);
  // ── Derived / memoised data ──
  const stats = useMemo(() => {
    const cr = data.filter(r => r.TYPE === "CR");
    const dr = data.filter(r => r.TYPE === "DR");
    const crAmt = cr.reduce((s, r) => s + Number(r.AMOUNT), 0);
    const drAmt = dr.reduce((s, r) => s + Number(r.AMOUNT), 0);
    const totalAmt = crAmt + drAmt;
    return {
      total: data.length, totalAmt,
      crCount: cr.length, crAmt,
      drCount: dr.length, drAmt,
      avg: data.length ? Math.round(totalAmt / data.length) : 0,
    };
  }, [data]);

  // Hour chart
  const hourData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      const h = parseInt(r.DATETIME.split(" ")[1]?.split(":")[0] || "0");
      if (!map[h]) map[h] = { hour: h + ":00", CR: 0, DR: 0 };
      map[h][r.TYPE]++;
    });
    return Object.values(map).sort((a, b) => parseInt(a.hour) - parseInt(b.hour));
  }, [data]);

  // Pie: CR vs DR
  const typeData = useMemo(() => [
    { name: "CR", value: stats.crCount, color: BNI_BLUE2 },
    { name: "DR", value: stats.drCount, color: RED },
  ], [stats]);

  // Bar: amount per tran code
  const codeData = useMemo(() => {
    const g = groupSum(data, "TRAN_CODE", "AMOUNT");
    return Object.entries(g)
      .map(([k, v]) => ({ code: k, amount: v }))
      .sort((a, b) => b.amount - a.amount);
  }, [data]);

  // Bar: SYS count
  const sysData = useMemo(() => {
    const g = groupSum(data, "SYS");
    return Object.entries(g).map(([k, v], i) => ({ sys: k, count: v, color: PALETTE[i % PALETTE.length] }));
  }, [data]);

  // Bar: net flow per teller
  const tellerData = useMemo(() => {
    const tellers = [...new Set(data.map(r => r.TELLER))].sort();
    return tellers.map(t => {
      const rows = data.filter(r => r.TELLER === t);
      const cr = rows.filter(r => r.TYPE === "CR").reduce((s, r) => s + Number(r.AMOUNT), 0);
      const dr = rows.filter(r => r.TYPE === "DR").reduce((s, r) => s + Number(r.AMOUNT), 0);
      return { teller: t, net: cr - dr, cr, dr };
    });
  }, [data]);

  // Line: cumulative CR per hour
  const cumulData = useMemo(() => {
    let acc = 0;
    return hourData.map(h => {
      const crRows = data.filter(r => r.DATETIME.includes(h.hour.replace(":00","")) && r.TYPE === "CR");
      acc += crRows.reduce((s, r) => s + Number(r.AMOUNT), 0);
      return { hour: h.hour, cumul: acc };
    });
  }, [data, hourData]);

  // Table
  const [filterType, setFilterType] = useState("");
  const [filterSys, setFilterSys]   = useState("");
  const [search, setSearch]          = useState("");
  const [page, setPage]              = useState(1);

  const sysOptions = useMemo(() => [...new Set(data.map(r => r.SYS))], [data]);

  const filtered = useMemo(() => {
    return data.filter(r => {
      if (filterType && r.TYPE !== filterType) return false;
      if (filterSys && r.SYS !== filterSys) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!String(r.TELLER).toLowerCase().includes(q) &&
            !String(r.TRAN_CODE).toLowerCase().includes(q) &&
            !String(r.NO).toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, filterType, filterSys, search]);

  useEffect(() => { setPage(1); }, [filterType, filterSys, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageData   = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const dateStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });

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
            <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Dashboard Analisis Teller</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>Monitoring transaksi harian — CR &amp; DR</div>
          </div>
        </div>
        <div style={{ textAlign: "right", position: "relative", zIndex: 1 }}>
          {/* <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Dicetak pada</div> */}
          <div style={{ color: "white", fontWeight: 700, fontSize: 13, marginTop: 2 }}>{dateStr}</div>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Transaksi" value={stats.total + " txn"} sub={fmtIDR(stats.totalAmt) + " total"} accentColor={BNI_BLUE2} iconBg="rgba(0,63,135,0.1)" icon={IconCreditCard} />
        <KpiCard label="Total Credit (CR)" value={fmtIDR(stats.crAmt)} sub={stats.crCount + " transaksi"} accentColor={GREEN} iconBg="rgba(22,163,74,0.1)" icon={IconTrendUp} />
        <KpiCard label="Total Debit (DR)" value={fmtIDR(stats.drAmt)} sub={stats.drCount + " transaksi"} accentColor={RED} iconBg="rgba(220,38,38,0.1)" icon={IconTrendDown} />
        <KpiCard label="Rata-rata per Tran" value={fmtIDR(stats.avg)} sub="Per transaksi (semua)" accentColor={BNI_ORANGE} iconBg="rgba(243,112,33,0.1)" icon={IconClock} />
      </div>

      {/* Row 1: Volume per jam + Komposisi CR/DR */}
      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Volume transaksi per jam" sub="Jumlah transaksi CR dan DR per jam" badge="Harian">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="CR" name="CR" fill={BNI_BLUE2} radius={[4, 4, 0, 0]} />
              <Bar dataKey="DR" name="DR" fill={RED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 8, justifyContent: "center" }}>
            {[["CR", BNI_BLUE2], ["DR", RED]].map(([l, c]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Komposisi tipe" sub="CR vs DR (jumlah transaksi)" badge="Tipe">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={typeData} cx="50%" cy="45%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                {typeData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={(v) => v + " txn"} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: -8 }}>
            {typeData.map(e => (
              <span key={e.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: e.color, display: "inline-block" }} />
                {e.name} — {e.value} txn
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Row 2: Amount per tran code + SYS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Nilai per tran code" sub="Total amount per kode transaksi" badge="Tran Code">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={codeData} layout="vertical" barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtIDR} />
              <YAxis type="category" dataKey="code" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<CustomTooltip formatter={fmtFull} />} />
              <Bar dataKey="amount" name="Amount" radius={[0, 4, 4, 0]}>
                {codeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Distribusi sistem (SYS)" sub="Jumlah transaksi per sistem" badge="SYS">
          <div style={{ display: "flex", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            {sysData.map(s => (
              <span key={s.sys} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: s.color, display: "inline-block" }} />
                {s.sys} — {s.count}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={174}>
            <BarChart data={sysData} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="sys" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Jumlah" radius={[4, 4, 0, 0]}>
                {sysData.map((s, i) => <Cell key={i} fill={s.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Net flow per teller */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Net flow CR − DR per teller" sub="Selisih total CR dikurangi DR (biru = positif, merah = negatif)" badge="Teller">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tellerData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="teller" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtIDR} />
              <Tooltip content={<CustomTooltip formatter={fmtFull} />} />
              <Bar dataKey="net" name="Net" radius={[4, 4, 0, 0]}>
                {tellerData.map((d, i) => <Cell key={i} fill={d.net >= 0 ? BNI_BLUE2 : RED} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 4: Cumulative CR line chart */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Akumulasi CR per jam" sub="Total nilai credit yang terakumulasi sepanjang hari" badge="Tren">
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={cumulData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={fmtIDR} />
              <Tooltip content={<CustomTooltip formatter={fmtFull} />} />
              <Line type="monotone" dataKey="cumul" name="Kumulatif CR" stroke={BNI_ORANGE} strokeWidth={2.5} dot={{ r: 4, fill: BNI_ORANGE }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
        {/* Table header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>Detail data transaksi</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Maks. {PER_PAGE} baris per halaman</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2 }}>
            {filtered.length} baris
          </span>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", flex: 1, minWidth: 160 }}>
            <IconSearch />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari NO / Teller / Tran Code..."
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, color: "#334155", width: "100%" }}
            />
          </div>
          {/* Type filter */}
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", cursor: "pointer" }}>
            <option value="">Semua tipe</option>
            <option value="CR">CR</option>
            <option value="DR">DR</option>
          </select>
          {/* SYS filter */}
          <select value={filterSys} onChange={e => setFilterSys(e.target.value)}
            style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", cursor: "pointer" }}>
            <option value="">Semua SYS</option>
            {sysOptions.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filterType || filterSys || search) && (
            <button onClick={() => { setFilterType(""); setFilterSys(""); setSearch(""); }}
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
                {["#","NO","Datetime","Teller","Tran Code","SYS","CUR","Amount","Type"].map(h => (
                  <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Tidak ada data</td></tr>
              ) : pageData.map((r, i) => (
                <tr key={r.NO + i}
                  style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}
                >
                  <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 11 }}>{(page - 1) * PER_PAGE + i + 1}</td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.NO}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", whiteSpace: "nowrap" }}>{r.DATETIME}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", fontFamily: "monospace", fontSize: 11 }}>{r.TELLER}</td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.TRAN_CODE}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                      background: r.SYS === "BOR" ? "#dbeafe" : "#fef9c3",
                      color: r.SYS === "BOR" ? "#1e40af" : "#854d0e",
                    }}>{r.SYS}</span>
                  </td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.CUR}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtFull(r.AMOUNT)}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: r.TYPE === "CR" ? "#dcfce7" : "#fee2e2",
                      color: r.TYPE === "CR" ? "#166534" : "#991b1b",
                    }}>{r.TYPE}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Hal {page}/{totalPages} — menampilkan {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} dari {filtered.length} baris
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <PagiBtn disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>← Prev</PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <PagiBtn key={p} active={p === page} onClick={() => setPage(p)}>{p}</PagiBtn>
              ) : null;
            })}
            <PagiBtn disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next →</PagiBtn>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
        © 2025 BNI Life Insurance — Dashboard Teller Internal
      </p>
    </div>
  );
}

// Mini pagination button
function PagiBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "4px 10px", fontSize: 11, borderRadius: 6, cursor: disabled ? "default" : "pointer",
        border: "1px solid " + (active ? BNI_BLUE2 : "#e2e8f0"),
        background: active ? BNI_BLUE2 : "white",
        color: active ? "white" : disabled ? "#cbd5e1" : "#334155",
        transition: "all .1s",
      }}
    >
      {children}
    </button>
  );
}