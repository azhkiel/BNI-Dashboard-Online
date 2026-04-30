// src/pages/DBSCANDashboard.jsx
// Style: BNI Life Insurance Design System (DM Sans + Playfair Display)
import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  Activity, Layers, AlertTriangle, Target, Landmark,
  BookOpen, EyeOff, Settings2, Crosshair, Square,
  Ruler, Hash, Lightbulb, BarChart2, Search,
  ChevronLeft, ChevronRight, Loader2,
} from "lucide-react";

// ── FONT INJECTION ─────────────────────────────────────────────────────────
const FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
  * { font-family: 'DM Sans', sans-serif; box-sizing: border-box; }
  input[type=range] { cursor: pointer; }
`;

// ── DESIGN TOKENS ──────────────────────────────────────────────────────────
const C = {
  darkBlue  : "#002960",
  blue      : "#003F87",
  orange    : "#F37021",
  teal      : "#00A99D",
  pageBg    : "#F0F4FA",
  card      : "#FFFFFF",
  badgeBg   : "#EEF4FF",
  inputBg   : "#F8FAFC",
  mutedText : "#94a3b8",
  bodyText  : "#64748b",
  border    : "rgba(0,63,135,0.07)",
  borderFoc : "#003F87",
  red       : "#dc2626",
  green     : "#16a34a",
  noise     : "#94a3b8",
};

const CLUSTER_COLORS = ["#003F87", "#F37021", "#00A99D", "#dc2626", "#7c3aed", "#0891b2", "#d97706"];

const cardBase = {
  background   : C.card,
  borderRadius : 18,
  border       : `1px solid ${C.border}`,
  boxShadow    : "0 2px 20px rgba(0,63,135,0.07)",
  padding      : "24px",
  transition   : "all .2s",
};

const PER_PAGE = 20;

// ── HELPERS ────────────────────────────────────────────────────────────────
function fmtIDR(n) {
  if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(2) + "M";
  if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(0) + "jt";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function fmtFull(n) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}
function parseTimeToHour(timeStr) {
  const parts = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const [h, m] = parts.substring(0, 5).split(":").map(Number);
  return h + m / 60;
}

// ── DBSCAN ─────────────────────────────────────────────────────────────────
function normalizeForDBSCAN(data) {
  const amounts = data.map(d => d.amount);
  const times   = data.map(d => d.time);
  const minA = Math.min(...amounts), maxA = Math.max(...amounts);
  const minT = Math.min(...times),   maxT = Math.max(...times);
  const rangeA = maxA - minA || 1, rangeT = maxT - minT || 1;
  return data.map(d => ({ ...d, na: (d.amount - minA) / rangeA, nt: (d.time - minT) / rangeT }));
}
function euclidean(a, b) { return Math.sqrt((a.na - b.na) ** 2 + (a.nt - b.nt) ** 2); }
function rangeQuery(points, idx, eps) {
  return points.reduce((acc, _, i) => { if (euclidean(points[idx], points[i]) <= eps) acc.push(i); return acc; }, []);
}
function runDBSCAN(points, eps, minPts) {
  const labels = new Array(points.length).fill(-2);
  let clusterId = 0;
  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== -2) continue;
    const neighbors = rangeQuery(points, i, eps);
    if (neighbors.length < minPts) { labels[i] = -1; continue; }
    labels[i] = clusterId;
    const seeds = [...neighbors.filter(n => n !== i)];
    let si = 0;
    while (si < seeds.length) {
      const q = seeds[si++];
      if (labels[q] === -1) labels[q] = clusterId;
      if (labels[q] !== -2) continue;
      labels[q] = clusterId;
      const qN = rangeQuery(points, q, eps);
      if (qN.length >= minPts) qN.forEach(n => { if (!seeds.includes(n)) seeds.push(n); });
    }
    clusterId++;
  }
  return { labels, numClusters: clusterId };
}



// ── KPI CARD ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accentColor, icon: Icon, iconColor }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        ...cardBase,
        padding: "22px 22px 18px",
        position: "relative", overflow: "hidden",
        transform: hov ? "translateY(-2px)" : "none",
        boxShadow: hov ? "0 8px 32px rgba(0,63,135,0.11)" : cardBase.boxShadow,
      }}
    >
      {/* accent top bar */}
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accentColor, borderRadius: "18px 18px 0 0" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 4 }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, color: C.mutedText, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8 }}>{label}</p>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.darkBlue, letterSpacing: "-0.3px" }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: C.mutedText, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{ width: 48, height: 48, borderRadius: 14, background: accentColor + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={20} color={iconColor || accentColor} />
          </div>
        )}
      </div>
    </div>
  );
}

// ── CHART CARD ─────────────────────────────────────────────────────────────
function ChartCard({ title, sub, badge, children, style = {}, titleIcon }) {
  return (
    <div style={{ ...cardBase, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 15, display: "flex", alignItems: "center", gap: 7 }}>
            {titleIcon && titleIcon}
            {title}
          </div>
          {sub && <div style={{ fontSize: 12, color: C.bodyText, marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 12px", borderRadius: 999, background: C.badgeBg, color: C.blue, whiteSpace: "nowrap", flexShrink: 0, marginLeft: 12 }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

// ── CLUSTER BADGE ──────────────────────────────────────────────────────────
function ClusterBadge({ ci }) {
  if (ci === -1) return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: C.mutedText + "22", color: C.bodyText, border: `1px solid ${C.mutedText}55` }}>
      Noise
    </span>
  );
  const col = CLUSTER_COLORS[ci % CLUSTER_COLORS.length];
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700, background: col + "22", color: col, border: `1px solid ${col}55` }}>
      Cluster {ci + 1}
    </span>
  );
}

// ── SCATTER TOOLTIP ────────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isNoise = d.cluster === -1;
  const col = isNoise ? C.noise : CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length];
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 12, boxShadow: "0 8px 24px rgba(0,63,135,0.12)", minWidth: 180 }}>
      <p style={{ fontWeight: 800, color: C.darkBlue, marginBottom: 6, fontSize: 13 }}>NO {d.NO}</p>
      <p style={{ color: C.bodyText, margin: "3px 0" }}>Status: <b style={{ color: col }}>{isNoise ? "Noise / Anomali" : `Cluster ${d.cluster + 1}`}</b></p>
      <p style={{ color: C.bodyText, margin: "3px 0" }}>Tipe: <b style={{ color: d.TYPE === "CR" ? C.green : C.red }}>{d.TYPE}</b></p>
      <p style={{ color: C.bodyText, margin: "3px 0" }}>Amount: <b style={{ color: C.darkBlue }}>{fmtFull(d.amount)}</b></p>
      <p style={{ color: C.bodyText, margin: "3px 0" }}>Jam: <b>{d.timeLabel}</b></p>
    </div>
  );
}

// ── PARAM SLIDER ────────────────────────────────────────────────────────────
function ParamSlider({ label, value, min, max, step, onChange, hint, accentColor }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: accentColor, background: accentColor + "15", padding: "2px 12px", borderRadius: 8, border: `1px solid ${accentColor}25` }}>
          {value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor, height: 5, borderRadius: 4 }}
      />
      <div style={{ fontSize: 11, color: C.mutedText, marginTop: 5, lineHeight: 1.5 }}>{hint}</div>
    </div>
  );
}

// ── PAGINATION BUTTON ──────────────────────────────────────────────────────
function PagiBtn({ children, onClick, disabled, active }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "5px 11px", fontSize: 11, fontWeight: 600, borderRadius: 8, cursor: disabled ? "default" : "pointer",
        border: `1px solid ${active ? C.blue : "#e2e8f0"}`,
        background: active ? C.blue : "white",
        color: active ? "white" : disabled ? "#cbd5e1" : C.bodyText,
        transition: "all .1s",
      }}
    >{children}</button>
  );
}

// ── THEORY PANEL ────────────────────────────────────────────────────────────
function ExplainPanel() {
  const items = [
    { icon: <Crosshair size={18} color={C.blue} />,       term: "Core Point",  desc: "Titik dengan ≥ minPts tetangga dalam radius ε. Menjadi inti sebuah cluster." },
    { icon: <Square size={18} color={C.teal} />,          term: "Border Point", desc: "Berada dalam radius ε dari core point, tapi punya tetangga < minPts." },
    { icon: <AlertTriangle size={18} color={C.red} />,    term: "Noise Point",  desc: "Bukan core & bukan border. Dianggap anomali atau outlier." },
    { icon: <Ruler size={18} color={C.orange} />,         term: "Epsilon (ε)",  desc: "Radius pencarian tetangga. Makin besar = cluster melebar, noise berkurang." },
    { icon: <Hash size={18} color="#7c3aed" />,           term: "MinPts",       desc: "Minimum tetangga agar jadi core point. Makin besar = cluster lebih padat." },
  ];
  return (
    <ChartCard title="Konsep DBSCAN" sub="Density-Based Spatial Clustering of Applications with Noise" badge="Teori">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map(({ icon, term, desc }) => (
          <div key={term} style={{ background: C.inputBg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
            <div style={{ marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.darkBlue, marginBottom: 4 }}>{term}</div>
            <div style={{ fontSize: 11, color: C.bodyText, lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
        <div style={{ background: `linear-gradient(135deg, ${C.darkBlue}, ${C.blue})`, borderRadius: 12, padding: "14px 16px", gridColumn: "span 2", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Lightbulb size={16} color="rgba(255,255,255,0.7)" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
            <b style={{ color: "white" }}>Keunggulan vs K-Means:</b> DBSCAN tidak perlu menentukan jumlah cluster (K), tahan terhadap outlier, dan mampu mendeteksi cluster dengan bentuk arbitrer.
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function DBSCANDashboard({ data: propData, loading = false }) {
  const [eps, setEps]         = useState(0.15);
  const [minPts, setMinPts]   = useState(3);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [showExplain, setShowExplain] = useState(false);

  // ── Prepare points ──────────────────────────────────────────────────────
  const points = useMemo(() => {
    const safeData = Array.isArray(propData) ? propData : [];
    if (!safeData.length) return [];
    return safeData.map(r => {
      const timeStr = r.TIME || "00:00";
      return {
        ...r,
        amount: Number(r.AMOUNT),
        time: parseTimeToHour(timeStr),
        timeLabel: timeStr.includes(" ") ? timeStr.split(" ")[1]?.substring(0, 5) : timeStr.substring(0, 5),
      };
    });
  }, [propData]);

  const normalized = useMemo(() => normalizeForDBSCAN(points), [points]);

  const { labels, numClusters } = useMemo(() => {
    if (normalized.length < 2) return { labels: [], numClusters: 0 };
    return runDBSCAN(normalized, eps, minPts);
  }, [normalized, eps, minPts]);

  const noisePoints   = useMemo(() => points.filter((_, i) => labels[i] === -1), [points, labels]);
  const noiseRate     = points.length ? ((noisePoints.length / points.length) * 100).toFixed(1) : 0;

  const clusterGroups = useMemo(() => (
    Array.from({ length: numClusters }, (_, ci) => points.filter((_, i) => labels[i] === ci))
  ), [points, labels, numClusters]);

  const scatterDatasets = useMemo(() => {
    const datasets = clusterGroups.map((grp, ci) => ({
      name: `Cluster ${ci + 1}`,
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      points: grp.map(p => ({ ...p, cluster: ci, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(2) })),
    }));
    if (noisePoints.length > 0) datasets.push({
      name: "Noise / Anomali", color: C.noise,
      points: noisePoints.map(p => ({ ...p, cluster: -1, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(2) })),
    });
    return datasets;
  }, [clusterGroups, noisePoints]);

  const barData = useMemo(() => {
    const arr = clusterGroups.map((grp, ci) => ({
      name: `C${ci + 1}`,
      jumlah: grp.length,
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
    }));
    if (noisePoints.length) arr.push({ name: "Noise", jumlah: noisePoints.length, color: C.noise });
    return arr;
  }, [clusterGroups, noisePoints]);

  const radarData = useMemo(() => {
    if (!clusterGroups.length) return [];
    const maxAmt   = Math.max(...points.map(p => p.amount)) || 1;
    const maxCount = Math.max(...clusterGroups.map(g => g.length)) || 1;
    return [
      { subject: "Jumlah Txn",    ...Object.fromEntries(clusterGroups.map((g, i) => [`C${i+1}`, +(g.length / maxCount * 100).toFixed(1)])) },
      { subject: "Rata-rata Amt", ...Object.fromEntries(clusterGroups.map((g, i) => { const avg = g.length ? g.reduce((s,p)=>s+p.amount,0)/g.length:0; return [`C${i+1}`, +(avg/maxAmt*100).toFixed(1)]; })) },
      { subject: "% CR",          ...Object.fromEntries(clusterGroups.map((g, i) => [`C${i+1}`, g.length ? +(g.filter(p=>p.TYPE==="CR").length/g.length*100).toFixed(1):0])) },
      { subject: "% DR",          ...Object.fromEntries(clusterGroups.map((g, i) => [`C${i+1}`, g.length ? +(g.filter(p=>p.TYPE==="DR").length/g.length*100).toFixed(1):0])) },
      { subject: "Jam Avg",       ...Object.fromEntries(clusterGroups.map((g, i) => { const avg = g.length ? g.reduce((s,p)=>s+p.time,0)/g.length:0; return [`C${i+1}`, +(avg/18*100).toFixed(1)]; })) },
    ];
  }, [clusterGroups, points]);

  const tableData = useMemo(() => {
    setTablePage(1);
    return points
      .map((p, i) => ({ ...p, cluster: labels[i] }))
      .filter(p => selectedCluster === null || p.cluster === selectedCluster);
  }, [points, labels, selectedCluster]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PER_PAGE));
  const pageData   = tableData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: C.pageBg }}>
      <div style={{ textAlign: "center", color: C.mutedText }}>
        <Loader2 size={36} color={C.mutedText} style={{ marginBottom: 12, animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Memuat data DBSCAN...</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "28px 32px 48px", background: C.pageBg, minHeight: "100vh" }}>
      <style>{FONT_STYLE}</style>

      {/* ── HEADER BANNER ─────────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.darkBlue} 0%, ${C.blue} 100%)`,
        borderRadius: 18, padding: "22px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position:"absolute", right:-40, top:-40, width:176, height:176, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ position:"absolute", right:64, bottom:-56, width:144, height:144, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />
        {/* orange accent circle */}
        <div style={{ position:"absolute", right:120, top:-20, width:80, height:80, borderRadius:"50%", background:`rgba(243,112,33,0.10)` }} />

        <div style={{ display:"flex", alignItems:"center", gap:18, position:"relative", zIndex:1 }}>
          <div style={{ width:48, height:48, borderRadius:12, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Landmark size={22} color="white" strokeWidth={1.8} />
          </div>
          <div>
            <div style={{ fontFamily:"'Playfair Display', serif", color:"white", fontWeight:800, fontSize:20, letterSpacing:"-0.3px" }}>
              Dashboard DBSCAN Clustering
            </div>
            <div style={{ color:"rgba(255,255,255,0.55)", fontSize:12, marginTop:3 }}>
              Density-Based Clustering — deteksi anomali otomatis tanpa menentukan K
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowExplain(v => !v)}
          style={{
            padding:"9px 18px", borderRadius:12, border:"1px solid rgba(255,255,255,0.2)",
            background: showExplain ? C.orange : "rgba(255,255,255,0.1)",
            color:"white", fontSize:12, fontWeight:700, cursor:"pointer",
            transition:"all .15s", position:"relative", zIndex:1,
            boxShadow: showExplain ? `0 6px 20px rgba(243,112,33,0.35)` : "none",
          }}
        >
          <span style={{ display:"flex", alignItems:"center", gap:6 }}>
            {showExplain
              ? <><EyeOff size={14} /> Sembunyikan</>
              : <><BookOpen size={14} /> Teori DBSCAN</>
            }
          </span>
        </button>
      </div>

      {/* ── PARAMETER PANEL ───────────────────────────────────────────── */}
      <div style={{ ...cardBase, marginBottom: 24 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
          <div>
            <div style={{ fontWeight:700, color:C.darkBlue, fontSize:15, display:"flex", alignItems:"center", gap:8 }}>
              <Settings2 size={16} color={C.darkBlue} strokeWidth={2} />
              Parameter DBSCAN
            </div>
            <div style={{ fontSize:12, color:C.bodyText, marginTop:3 }}>Geser slider untuk mengubah parameter secara real-time</div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <span style={{ fontSize:11, fontWeight:700, padding:"4px 14px", borderRadius:999, background:"#dcfce7", color:"#166534" }}>
              {numClusters} cluster ditemukan
            </span>
            <span style={{ fontSize:11, fontWeight:700, padding:"4px 14px", borderRadius:999,
              background: noisePoints.length > 0 ? "#fee2e2" : C.inputBg,
              color: noisePoints.length > 0 ? "#991b1b" : C.mutedText,
            }}>
              {noisePoints.length} noise point
            </span>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28 }}>
          <ParamSlider label="Epsilon (ε) — Radius Tetangga" value={eps} min={0.05} max={0.5} step={0.01} onChange={setEps}
            hint="Makin besar ε → cluster melebar, noise berkurang" accentColor={C.orange} />
          <ParamSlider label="MinPts — Minimum Tetangga" value={minPts} min={2} max={10} step={1} onChange={setMinPts}
            hint="Makin besar minPts → cluster lebih padat, noise bertambah" accentColor={C.blue} />
        </div>
      </div>

      {/* ── THEORY TOGGLE ─────────────────────────────────────────────── */}
      {showExplain && <div style={{ marginBottom: 24 }}><ExplainPanel /></div>}

      {/* ── KPI CARDS ─────────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:18, marginBottom:24 }}>
        <KpiCard
          label="Total Transaksi"
          value={points.length + " txn"}
          sub="Data diproses DBSCAN"
          accentColor={C.blue}
          icon={Activity}
          iconColor={C.blue}
        />
        <KpiCard
          label="Cluster Ditemukan"
          value={numClusters + " cluster"}
          sub="Otomatis tanpa K"
          accentColor={C.teal}
          icon={Layers}
          iconColor={C.teal}
        />
        <KpiCard
          label="Noise / Anomali"
          value={noisePoints.length + " txn"}
          sub={noiseRate + "% dari total transaksi"}
          accentColor={noisePoints.length > 5 ? C.red : C.noise}
          icon={AlertTriangle}
          iconColor={noisePoints.length > 5 ? C.red : C.noise}
        />
        <KpiCard
          label="Cluster Terbesar"
          value={clusterGroups.length ? `C${clusterGroups.indexOf(clusterGroups.reduce((a,b)=>a.length>=b.length?a:b))+1}` : "—"}
          sub={clusterGroups.length ? Math.max(...clusterGroups.map(g=>g.length)) + " transaksi" : "Belum ada cluster"}
          accentColor={C.orange}
          icon={Target}
          iconColor={C.orange}
        />
      </div>

      {/* ── SCATTER + BAR ─────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:18, marginBottom:18 }}>

        {/* Scatter Plot */}
        <ChartCard title="Scatter Plot DBSCAN" sub="Sumbu X = jam transaksi · Sumbu Y = nilai (juta Rp)" badge={`ε=${eps} · minPts=${minPts}`}>
          <ResponsiveContainer width="100%" height={270}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" type="number" name="Jam" domain={[7, 18]} tickCount={7}
                tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(0) + ":00"}
                label={{ value: "Jam", position: "insideBottomRight", offset: -4, fontSize: 11, fill: C.mutedText }}
              />
              <YAxis dataKey="y" type="number" name="Amount"
                tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false}
                tickFormatter={v => v + "jt"}
                label={{ value: "Amount", angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fill: C.mutedText }}
              />
              <Tooltip content={<ScatterTooltip />} />
              {scatterDatasets.map((ds, i) => (
                <Scatter key={i} name={ds.name} data={ds.points} fill={ds.color}
                  fillOpacity={ds.name === "Noise / Anomali" ? 0.5 : 0.85}
                  shape={ds.name === "Noise / Anomali" ? "cross" : "circle"}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display:"flex", flexWrap:"wrap", gap:14, marginTop:10, justifyContent:"center" }}>
            {scatterDatasets.map((ds, i) => (
              <span key={i} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:C.bodyText }}>
                <span style={{ width:10, height:10, borderRadius: ds.name === "Noise / Anomali" ? 1 : 3, background:ds.color, display:"inline-block", flexShrink:0 }} />
                {ds.name} ({ds.points.length} txn)
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Bar: distribusi */}
        <ChartCard title="Distribusi per Cluster" sub="Jumlah transaksi tiap cluster" badge="Komposisi">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={barData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:11, fill:C.mutedText }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:C.mutedText }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={v => [v + " txn", "Jumlah"]} />
              <Bar dataKey="jumlah" radius={[0, 7, 7, 0]}>
                {barData.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── CLUSTER PROFILE CARDS ─────────────────────────────────────── */}
      {clusterGroups.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <ChartCard title="Profil Masing-masing Cluster" sub="Klik kartu untuk filter tabel di bawah" badge="Detail">
            <div style={{ display:"grid", gridTemplateColumns:`repeat(${Math.min(clusterGroups.length + (noisePoints.length > 0 ? 1 : 0), 4)}, 1fr)`, gap:14 }}>
              {clusterGroups.map((grp, ci) => {
                const avgAmt  = grp.length ? grp.reduce((s,p) => s+p.amount, 0) / grp.length : 0;
                const maxAmt  = grp.length ? Math.max(...grp.map(p=>p.amount)) : 0;
                const minAmt  = grp.length ? Math.min(...grp.map(p=>p.amount)) : 0;
                const avgTime = grp.length ? grp.reduce((s,p) => s+p.time, 0) / grp.length : 0;
                const crCount = grp.filter(p => p.TYPE === "CR").length;
                const drCount = grp.filter(p => p.TYPE === "DR").length;
                const isSelected = selectedCluster === ci;
                const col = CLUSTER_COLORS[ci % CLUSTER_COLORS.length];
                return (
                  <div key={ci} onClick={() => setSelectedCluster(isSelected ? null : ci)} style={{
                    borderRadius:14, padding:"16px 18px", cursor:"pointer", transition:"all .15s",
                    border: isSelected ? `2px solid ${col}` : `1px solid ${col}44`,
                    background: isSelected ? col + "0e" : "white",
                    boxShadow: isSelected ? `0 6px 20px ${col}28` : "none",
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                      <div style={{ fontWeight:800, fontSize:15, color:col }}>Cluster {ci + 1}</div>
                      <span style={{ fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:999, background:col+"22", color:col }}>
                        {grp.length} txn
                      </span>
                    </div>
                    <div style={{ borderTop:`1px solid ${col}22`, paddingTop:10, display:"flex", flexDirection:"column", gap:6 }}>
                      {[
                        ["Rata-rata", fmtIDR(avgAmt)],
                        ["Terkecil", fmtIDR(minAmt)],
                        ["Terbesar", fmtIDR(maxAmt)],
                        ["Jam avg", avgTime.toFixed(1) + ":xx"],
                      ].map(([lbl, val]) => (
                        <div key={lbl} style={{ display:"flex", justifyContent:"space-between", fontSize:11 }}>
                          <span style={{ color:C.mutedText }}>{lbl}</span>
                          <span style={{ fontWeight:700, color:C.darkBlue }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, marginTop:4, paddingTop:8, borderTop:`1px solid ${col}22` }}>
                        <span style={{ color:C.green, fontWeight:700 }}>CR: {crCount}</span>
                        <span style={{ color:C.red,   fontWeight:700 }}>DR: {drCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Noise card */}
              {noisePoints.length > 0 && (
                <div onClick={() => setSelectedCluster(selectedCluster === -1 ? null : -1)} style={{
                  borderRadius:14, padding:"16px 18px", cursor:"pointer", transition:"all .15s",
                  border: selectedCluster === -1 ? `2px solid ${C.red}` : `1px solid ${C.red}44`,
                  background: selectedCluster === -1 ? C.red + "0e" : "white",
                  boxShadow: selectedCluster === -1 ? `0 6px 20px ${C.red}28` : "none",
                }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                    <div style={{ fontWeight:800, fontSize:15, color:C.red, display:"flex", alignItems:"center", gap:6 }}>
                      <AlertTriangle size={15} color={C.red} /> Noise
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:"2px 10px", borderRadius:999, background:C.red+"22", color:C.red }}>
                      {noisePoints.length} txn
                    </span>
                  </div>
                  <div style={{ borderTop:`1px solid ${C.red}22`, paddingTop:10 }}>
                    <div style={{ fontSize:11, color:C.bodyText, lineHeight:1.7 }}>
                      Titik ini tidak masuk ke cluster manapun. Kemungkinan <b style={{ color:C.red }}>transaksi anomali</b> yang perlu diperiksa.
                    </div>
                    <div style={{ marginTop:10, fontSize:11 }}>
                      <span style={{ fontWeight:800, color:C.red }}>{noiseRate}%</span>
                      <span style={{ color:C.mutedText }}> dari total transaksi</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── RADAR CHART ──────────────────────────────────────────────── */}
      {clusterGroups.length >= 2 && (
        <div style={{ marginBottom: 18 }}>
          <ChartCard title="Perbandingan Profil Cluster (Radar)" sub="Normalisasi 0–100 untuk perbandingan relatif antar cluster" badge="Analisis">
            <ResponsiveContainer width="100%" height={290}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(0,63,135,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize:11, fill:C.bodyText }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize:9, fill:C.mutedText }} />
                {clusterGroups.map((_, ci) => (
                  <Radar key={ci} name={`Cluster ${ci+1}`} dataKey={`C${ci+1}`}
                    stroke={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
                    fill={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
                    fillOpacity={0.12} strokeWidth={2}
                  />
                ))}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display:"flex", flexWrap:"wrap", gap:14, justifyContent:"center", marginTop:4 }}>
              {clusterGroups.map((_, ci) => (
                <span key={ci} style={{ display:"flex", alignItems:"center", gap:6, fontSize:11, color:C.bodyText }}>
                  <span style={{ width:10, height:10, borderRadius:3, background:CLUSTER_COLORS[ci % CLUSTER_COLORS.length], display:"inline-block" }} />
                  Cluster {ci + 1}
                </span>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── NOISE ANOMALY DETAIL ─────────────────────────────────────── */}
      {noisePoints.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <ChartCard title="Transaksi Anomali (Noise)" sub="Transaksi yang tidak masuk ke cluster manapun — patut diperiksa" badge="Anomali"
            titleIcon={<AlertTriangle size={15} color={C.red} />}>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:12 }}>
              {noisePoints.slice(0, 9).map((p, i) => (
                <div key={i} style={{ background:"#fef2f2", borderRadius:12, padding:"12px 14px", border:"1px solid #fecaca" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:C.red }}>NO {p.NO}</span>
                    <span style={{ fontSize:10, padding:"1px 10px", borderRadius:999, background: p.TYPE==="CR" ? "#dcfce7":"#fee2e2", color: p.TYPE==="CR" ? "#166534":"#991b1b", fontWeight:700 }}>{p.TYPE}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, color:C.darkBlue, marginBottom:4 }}>{fmtFull(p.amount)}</div>
                  <div style={{ fontSize:11, color:C.mutedText }}>Jam {p.timeLabel} · {p.TRAN_CODE}</div>
                </div>
              ))}
              {noisePoints.length > 9 && (
                <div style={{ background:C.inputBg, borderRadius:12, padding:"12px 14px", border:`1px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <span style={{ fontSize:12, color:C.mutedText }}>+{noisePoints.length - 9} transaksi lainnya</span>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── DATA TABLE ───────────────────────────────────────────────── */}
      <div style={{ ...cardBase, marginBottom: 18 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
          <div>
            <div style={{ fontWeight:700, color:C.darkBlue, fontSize:15, display:"flex", alignItems:"center", gap:8 }}>
              Detail Transaksi per Cluster
              {selectedCluster !== null && <ClusterBadge ci={selectedCluster} />}
            </div>
            <div style={{ fontSize:12, color:C.bodyText, marginTop:3 }}>
              {selectedCluster !== null ? "Klik kartu cluster untuk reset filter" : "Klik kartu cluster di atas untuk filter"}
            </div>
          </div>
          <span style={{ fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:999, background:C.badgeBg, color:C.blue, flexShrink:0 }}>
            {tableData.length} baris
          </span>
        </div>

        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ background:C.inputBg }}>
                {["#","Cluster","NO","Jam","Teller","Tran Code","SYS","Amount","Tipe"].map(h => (
                  <th key={h} style={{
                    textAlign: h === "Amount" ? "right" : "left",
                    padding:"9px 14px", fontSize:10, fontWeight:700, color:C.mutedText,
                    textTransform:"uppercase", letterSpacing:"0.08em",
                    borderBottom:`1px solid #f1f5f9`, whiteSpace:"nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={9} style={{ padding:28, textAlign:"center", color:C.mutedText, fontSize:13 }}>Tidak ada data</td></tr>
              ) : pageData.map((r, i) => (
                <tr key={r.NO + "-" + i}
                  style={{ borderBottom:`1px solid #f1f5f9`, background: r.cluster === -1 ? "#fef2f2" : "transparent", transition:"background .1s" }}
                  onMouseEnter={e => e.currentTarget.style.background = r.cluster === -1 ? "#fee2e2" : C.inputBg}
                  onMouseLeave={e => e.currentTarget.style.background = r.cluster === -1 ? "#fef2f2" : "transparent"}
                >
                  <td style={{ padding:"9px 14px", color:"#cbd5e1", fontSize:11 }}>{(tablePage-1)*PER_PAGE + i + 1}</td>
                  <td style={{ padding:"9px 14px" }}><ClusterBadge ci={r.cluster} /></td>
                  <td style={{ padding:"9px 14px", color:C.bodyText }}>{r.NO}</td>
                  <td style={{ padding:"9px 14px", color:C.bodyText, whiteSpace:"nowrap" }}>{r.timeLabel}</td>
                  <td style={{ padding:"9px 14px", color:C.bodyText, fontFamily:"monospace", fontSize:11 }}>{r.TELLER}</td>
                  <td style={{ padding:"9px 14px", color:C.bodyText }}>{r.TRAN_CODE}</td>
                  <td style={{ padding:"9px 14px" }}>
                    <span style={{ padding:"2px 10px", borderRadius:999, fontSize:10, fontWeight:600,
                      background: r.SYS === "BOR" ? "#dbeafe" : "#fef9c3",
                      color: r.SYS === "BOR" ? "#1e40af" : "#854d0e" }}>{r.SYS}</span>
                  </td>
                  <td style={{ padding:"9px 14px", color:C.darkBlue, textAlign:"right", fontVariantNumeric:"tabular-nums", fontWeight:600 }}>{fmtFull(r.amount)}</td>
                  <td style={{ padding:"9px 14px" }}>
                    <span style={{ padding:"2px 10px", borderRadius:999, fontSize:10, fontWeight:700,
                      background: r.TYPE === "CR" ? "#dcfce7" : "#fee2e2",
                      color: r.TYPE === "CR" ? "#166534" : "#991b1b" }}>{r.TYPE}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:16, flexWrap:"wrap", gap:8 }}>
          <span style={{ fontSize:11, color:C.mutedText }}>
            Hal {tablePage}/{totalPages} — {(tablePage-1)*PER_PAGE+1}–{Math.min(tablePage*PER_PAGE, tableData.length)} dari {tableData.length} baris
          </span>
          <div style={{ display:"flex", gap:4 }}>
            <PagiBtn disabled={tablePage <= 1} onClick={() => setTablePage(p => Math.max(1, p-1))}>
              <ChevronLeft size={13} style={{ display:"inline", verticalAlign:"middle" }} /> Prev
            </PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
              const start = Math.max(1, Math.min(tablePage - 2, totalPages - 4));
              const p = start + idx;
              return p <= totalPages ? (
                <PagiBtn key={p} active={p === tablePage} onClick={() => setTablePage(p)}>{p}</PagiBtn>
              ) : null;
            })}
            <PagiBtn disabled={tablePage >= totalPages} onClick={() => setTablePage(p => Math.min(totalPages, p+1))}>
              Next <ChevronRight size={13} style={{ display:"inline", verticalAlign:"middle" }} />
            </PagiBtn>
          </div>
        </div>
      </div>

      {/* ── K-MEANS VS DBSCAN ─────────────────────────────────────────── */}
      <ChartCard
        title="K-Means vs DBSCAN — Perbandingan"
        titleIcon={<BarChart2 size={15} color={C.darkBlue} />}
        sub="Perbedaan konseptual untuk keperluan akademik"
        badge="Referensi"
      >
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18 }}>
          {[
            {
              title:"K-Means", color:C.blue,
              icon: <Target size={16} color={C.blue} />,
              items:[
                "Perlu menentukan K terlebih dahulu",
                "Cluster berbentuk bulat (spherical)",
                "Sensitif terhadap outlier",
                "Cepat dan sederhana — O(nkt)",
                "Cocok untuk data terstruktur",
              ],
            },
            {
              title:"DBSCAN", color:"#7c3aed",
              icon: <Search size={16} color="#7c3aed" />,
              items:[
                "K otomatis dari data (tidak perlu ditentukan)",
                "Cluster bentuk bebas (arbitrer)",
                "Tahan terhadap outlier (dijadikan noise)",
                "Lebih lambat untuk data besar — O(n²)",
                "Cocok untuk data dengan noise/anomali",
              ],
            },
          ].map(({ title, color, icon, items }) => (
            <div key={title} style={{ background:C.inputBg, borderRadius:14, padding:"16px 18px", border:`1px solid ${color}22` }}>
              <div style={{ fontWeight:700, color, marginBottom:12, fontSize:14, display:"flex", alignItems:"center", gap:8 }}>
                {icon} {title}
              </div>
              {items.map((item, i) => (
                <div key={i} style={{ display:"flex", gap:8, marginBottom:8 }}>
                  <span style={{ color, fontSize:11, flexShrink:0, marginTop:1, fontWeight:700 }}>▸</span>
                  <span style={{ fontSize:12, color:C.bodyText, lineHeight:1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </ChartCard>

      <p style={{ textAlign:"center", fontSize:11, color:C.mutedText, marginTop:28 }}>
        © 2025 BNI Life Insurance — DBSCAN Clustering Dashboard
      </p>
    </div>
  );
}