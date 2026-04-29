import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const RED        = "#dc2626";
const GREEN      = "#16a34a";
const NOISE_COLOR = "#94a3b8";

const CLUSTER_COLORS = ["#003F87", "#F37021", "#00A99D", "#dc2626", "#7c3aed", "#0891b2", "#d97706"];
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

// ── DBSCAN ALGORITHM (Pure JS) ─────────────────────────────────────────────
function normalizeForDBSCAN(data) {
  const amounts = data.map(d => d.amount);
  const times   = data.map(d => d.time);
  const minA = Math.min(...amounts), maxA = Math.max(...amounts);
  const minT = Math.min(...times),   maxT = Math.max(...times);
  const rangeA = maxA - minA || 1;
  const rangeT = maxT - minT || 1;
  return data.map(d => ({
    ...d,
    na: (d.amount - minA) / rangeA,
    nt: (d.time   - minT) / rangeT,
  }));
}

function euclidean(a, b) {
  return Math.sqrt((a.na - b.na) ** 2 + (a.nt - b.nt) ** 2);
}

function rangeQuery(points, idx, eps) {
  return points.reduce((acc, _, i) => {
    if (euclidean(points[idx], points[i]) <= eps) acc.push(i);
    return acc;
  }, []);
}

function runDBSCAN(points, eps, minPts) {
  const labels = new Array(points.length).fill(-2); // -2 = unvisited
  let clusterId = 0;

  for (let i = 0; i < points.length; i++) {
    if (labels[i] !== -2) continue;
    const neighbors = rangeQuery(points, i, eps);

    if (neighbors.length < minPts) {
      labels[i] = -1; // noise
      continue;
    }

    labels[i] = clusterId;
    const seeds = [...neighbors.filter(n => n !== i)];

    let si = 0;
    while (si < seeds.length) {
      const q = seeds[si++];
      if (labels[q] === -1) labels[q] = clusterId; // border point
      if (labels[q] !== -2) continue;
      labels[q] = clusterId;
      const qNeighbors = rangeQuery(points, q, eps);
      if (qNeighbors.length >= minPts) {
        qNeighbors.forEach(n => { if (!seeds.includes(n)) seeds.push(n); });
      }
    }
    clusterId++;
  }

  return { labels, numClusters: clusterId };
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
        {Icon && (
          <div style={{ width: 40, height: 40, borderRadius: 12, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={18} color={accentColor} />
          </div>
        )}
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
        {badge && (
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2, whiteSpace: "nowrap" }}>
            {badge}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function ClusterBadge({ ci }) {
  if (ci === -1) return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: "#94a3b822", color: "#64748b",
      border: "1px solid #94a3b855",
    }}>Noise</span>
  );
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: (CLUSTER_COLORS[ci % CLUSTER_COLORS.length]) + "22",
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      border: "1px solid " + (CLUSTER_COLORS[ci % CLUSTER_COLORS.length]) + "55",
    }}>Cluster {ci + 1}</span>
  );
}

// Inline icons
const IconRadar   = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>;
const IconAlert   = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="10.29 3.86 1.82 18 2 18 22 18 22.18 18 13.71 3.86 10.29 3.86"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconLayers  = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconTarget  = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
const IconBank    = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;

function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const isNoise = d.cluster === -1;
  return (
    <div style={{ background: "white", border: "1px solid rgba(0,63,135,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>NO {d.NO}</p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>
        Status: <b style={{ color: isNoise ? NOISE_COLOR : CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length] }}>
          {isNoise ? "⚠ Noise / Anomali" : `Cluster ${d.cluster + 1}`}
        </b>
      </p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Tipe: <b style={{ color: d.TYPE === "CR" ? GREEN : RED }}>{d.TYPE}</b></p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Amount: <b>{fmtFull(d.amount)}</b></p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Jam: <b>{d.timeLabel}</b></p>
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

// ── PARAM SLIDER ────────────────────────────────────────────────────────────
function ParamSlider({ label, value, min, max, step, onChange, hint, color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: BNI_BLUE }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: color || BNI_ORANGE, background: (color || BNI_ORANGE) + "15", padding: "2px 10px", borderRadius: 8 }}>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color || BNI_ORANGE, height: 4 }}
      />
      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{hint}</div>
    </div>
  );
}

// ── DBSCAN EXPLANATION PANEL ────────────────────────────────────────────────
function ExplainPanel() {
  const items = [
    { icon: "🎯", term: "Core Point", desc: "Titik dengan ≥ minPts tetangga dalam radius ε. Inti sebuah cluster." },
    { icon: "🔲", term: "Border Point", desc: "Titik yang berada dalam radius ε dari core point, tapi punya tetangga < minPts." },
    { icon: "⚠️", term: "Noise Point", desc: "Titik yang bukan core & bukan border. Dianggap anomali/outlier." },
    { icon: "📐", term: "Epsilon (ε)", desc: "Radius pencarian tetangga. Makin besar = cluster makin lebar, noise makin sedikit." },
    { icon: "🔢", term: "MinPts", desc: "Minimum tetangga agar jadi core point. Makin besar = cluster makin padat, noise makin banyak." },
  ];
  return (
    <ChartCard title="Konsep DBSCAN" sub="Density-Based Spatial Clustering of Applications with Noise" badge="Teori">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {items.map(({ icon, term, desc }) => (
          <div key={term} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: BNI_BLUE, marginBottom: 3 }}>{term}</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
        <div style={{ background: "linear-gradient(135deg,#002960,#003F87)", borderRadius: 10, padding: "10px 12px", gridColumn: "span 2" }}>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>
            💡 <b style={{ color: "white" }}>Keunggulan vs K-Means:</b> DBSCAN tidak perlu menentukan jumlah cluster (K) terlebih dahulu, tahan terhadap outlier, dan bisa mendeteksi cluster dengan bentuk arbitrer (tidak harus bulat).
          </div>
        </div>
      </div>
    </ChartCard>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
/**
 * DBSCANDashboard
 * Props:
 *   data    – array of transaction objects
 *   loading – boolean (optional)
 */
export default function DBSCANDashboard({ data: propData = [], loading = false }) {
  const [eps, setEps]         = useState(0.15);
  const [minPts, setMinPts]   = useState(3);
  const [selectedCluster, setSelectedCluster] = useState(null);
  const [tablePage, setTablePage] = useState(1);
  const [showExplain, setShowExplain] = useState(false);

  // ── Prepare points ──────────────────────────────────────────────────────
  const points = useMemo(() => {
    if (!propData.length) return [];
    return propData.map(r => {
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

  // ── DBSCAN result ───────────────────────────────────────────────────────
  const { labels, numClusters } = useMemo(() => {
    if (normalized.length < 2) return { labels: [], numClusters: 0 };
    return runDBSCAN(normalized, eps, minPts);
  }, [normalized, eps, minPts]);

  // ── Derived stats ───────────────────────────────────────────────────────
  const noisePoints   = useMemo(() => points.filter((_, i) => labels[i] === -1), [points, labels]);
  const noiseRate     = points.length ? ((noisePoints.length / points.length) * 100).toFixed(1) : 0;

  const clusterGroups = useMemo(() => {
    return Array.from({ length: numClusters }, (_, ci) =>
      points.filter((_, i) => labels[i] === ci)
    );
  }, [points, labels, numClusters]);

  // ── Scatter datasets ────────────────────────────────────────────────────
  const scatterDatasets = useMemo(() => {
    const datasets = clusterGroups.map((grp, ci) => ({
      name: `Cluster ${ci + 1}`,
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      points: grp.map(p => ({ ...p, cluster: ci, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(2) })),
    }));
    // Noise
    if (noisePoints.length > 0) {
      datasets.push({
        name: "Noise / Anomali",
        color: NOISE_COLOR,
        points: noisePoints.map(p => ({ ...p, cluster: -1, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(2) })),
      });
    }
    return datasets;
  }, [clusterGroups, noisePoints]);

  // ── Bar data ─────────────────────────────────────────────────────────────
  const barData = useMemo(() => {
    const arr = clusterGroups.map((grp, ci) => ({
      name: `C${ci + 1}`,
      jumlah: grp.length,
      color: CLUSTER_COLORS[ci % CLUSTER_COLORS.length],
      avgAmount: grp.length ? grp.reduce((s, p) => s + p.amount, 0) / grp.length : 0,
    }));
    if (noisePoints.length) arr.push({ name: "Noise", jumlah: noisePoints.length, color: NOISE_COLOR, avgAmount: 0 });
    return arr;
  }, [clusterGroups, noisePoints]);

  // ── Radar data per cluster ────────────────────────────────────────────────
  const radarData = useMemo(() => {
    if (!clusterGroups.length) return [];
    const allAmounts = points.map(p => p.amount);
    const maxAmt = Math.max(...allAmounts) || 1;
    const maxCount = Math.max(...clusterGroups.map(g => g.length)) || 1;
    return [
      { subject: "Jumlah Txn",   ...Object.fromEntries(clusterGroups.map((g, i) => [`C${i+1}`, +(g.length / maxCount * 100).toFixed(1)])) },
      { subject: "Rata-rata Amt",...Object.fromEntries(clusterGroups.map((g, i) => { const avg = g.length ? g.reduce((s,p)=>s+p.amount,0)/g.length:0; return [`C${i+1}`, +(avg/maxAmt*100).toFixed(1)]; })) },
      { subject: "% CR",         ...Object.fromEntries(clusterGroups.map((g, i) => [`C${i+1}`, g.length ? +(g.filter(p=>p.TYPE==="CR").length/g.length*100).toFixed(1):0])) },
      { subject: "% DR",         ...Object.fromEntries(clusterGroups.map((g, i) => [`C${i+1}`, g.length ? +(g.filter(p=>p.TYPE==="DR").length/g.length*100).toFixed(1):0])) },
      { subject: "Jam Rata-rata", ...Object.fromEntries(clusterGroups.map((g, i) => { const avg = g.length ? g.reduce((s,p)=>s+p.time,0)/g.length:0; return [`C${i+1}`, +(avg/18*100).toFixed(1)]; })) },
    ];
  }, [clusterGroups, points]);

  // ── Table ─────────────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    setTablePage(1);
    return points
      .map((p, i) => ({ ...p, cluster: labels[i] }))
      .filter(p => selectedCluster === null || p.cluster === selectedCluster);
  }, [points, labels, selectedCluster]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PER_PAGE));
  const pageData   = tableData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: "#F0F4FA" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Memuat data DBSCAN...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px 40px", background: "#F0F4FA", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #002960 0%, #1a0050 100%)",
        borderRadius: 18, padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -60, top: -60, width: 200, height: 200, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "absolute", right: 80, bottom: -40, width: 120, height: 120, borderRadius: "50%", background: "rgba(243,112,33,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconBank size={24} />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Dashboard DBSCAN Clustering</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>Density-Based Clustering — deteksi anomali otomatis tanpa menentukan K</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", position: "relative", zIndex: 1 }}>
          <button onClick={() => setShowExplain(v => !v)} style={{
            padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
            background: showExplain ? BNI_ORANGE : "rgba(255,255,255,0.1)",
            color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>
            {showExplain ? "Sembunyikan" : "📚 Teori DBSCAN"}
          </button>
        </div>
      </div>

      {/* ── Param Controls ── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 24, boxShadow: "0 2px 20px rgba(0,63,135,0.07)", border: "1px solid rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>⚙️ Parameter DBSCAN</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Geser slider untuk mengubah parameter secara real-time</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, background: "#dcfce7", color: "#166534", fontWeight: 700 }}>
              {numClusters} cluster ditemukan
            </span>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, background: noisePoints.length > 0 ? "#fee2e2" : "#f1f5f9", color: noisePoints.length > 0 ? "#991b1b" : "#94a3b8", fontWeight: 700 }}>
              {noisePoints.length} noise point
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <ParamSlider
            label="Epsilon (ε) — Radius Tetangga"
            value={eps} min={0.05} max={0.5} step={0.01}
            onChange={setEps}
            hint="Makin besar ε → cluster melebar, noise berkurang"
            color={BNI_ORANGE}
          />
          <ParamSlider
            label="MinPts — Minimum Tetangga"
            value={minPts} min={2} max={10} step={1}
            onChange={setMinPts}
            hint="Makin besar minPts → cluster lebih padat, noise bertambah"
            color={BNI_BLUE2}
          />
        </div>
      </div>

      {/* ── Theory Panel (toggle) ── */}
      {showExplain && (
        <div style={{ marginBottom: 24 }}>
          <ExplainPanel />
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Transaksi" value={points.length + " txn"} sub="Data diproses DBSCAN" accentColor={BNI_BLUE2} iconBg="rgba(0,63,135,0.1)" icon={IconRadar} />
        <KpiCard label="Cluster Ditemukan" value={numClusters + " cluster"} sub="Otomatis tanpa K" accentColor={GREEN} iconBg="rgba(22,163,74,0.1)" icon={IconLayers} />
        <KpiCard label="Noise / Anomali" value={noisePoints.length + " txn"} sub={noiseRate + "% dari total"} accentColor={noisePoints.length > 5 ? RED : NOISE_COLOR} iconBg="rgba(220,38,38,0.08)" icon={IconAlert} />
        <KpiCard
          label="Cluster Terbesar"
          value={clusterGroups.length ? `C${clusterGroups.indexOf(clusterGroups.reduce((a,b)=>a.length>=b.length?a:b))+1}` : "-"}
          sub={clusterGroups.length ? Math.max(...clusterGroups.map(g=>g.length)) + " transaksi" : "Belum ada cluster"}
          accentColor={CLUSTER_COLORS[0]} iconBg="rgba(0,63,135,0.1)" icon={IconTarget}
        />
      </div>

      {/* ── Row 1: Scatter + Bar ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Scatter Plot */}
        <ChartCard title="Scatter plot DBSCAN" sub="Sumbu X = jam transaksi, sumbu Y = nilai (juta Rp)" badge={`ε=${eps} · minPts=${minPts}`}>
          <ResponsiveContainer width="100%" height={260}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" type="number" name="Jam" domain={[7, 18]} tickCount={7}
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(0) + ":00"}
                label={{ value: "Jam", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "#94a3b8" }}
              />
              <YAxis dataKey="y" type="number" name="Amount"
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => v + "jt"}
                label={{ value: "Amount", angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fill: "#94a3b8" }}
              />
              <Tooltip content={<ScatterTooltip />} />
              {scatterDatasets.map((ds, ci) => (
                <Scatter key={ci} name={ds.name} data={ds.points} fill={ds.color}
                  fillOpacity={ds.name === "Noise / Anomali" ? 0.5 : 0.85}
                  shape={ds.name === "Noise / Anomali" ? "cross" : "circle"}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, justifyContent: "center" }}>
            {scatterDatasets.map((ds, ci) => (
              <span key={ci} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: ds.name === "Noise / Anomali" ? 1 : 2, background: ds.color, display: "inline-block" }} />
                {ds.name} ({ds.points.length} txn)
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Bar: jumlah per cluster */}
        <ChartCard title="Distribusi per cluster" sub="Jumlah transaksi tiap cluster" badge="Komposisi">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={barData} layout="vertical" barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v) => [v + " txn", "Jumlah"]} />
              <Bar dataKey="jumlah" radius={[0, 6, 6, 0]}>
                {barData.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Row 2: Cluster Profile Cards ── */}
      {clusterGroups.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ChartCard title="Profil masing-masing cluster" sub="Klik untuk filter tabel" badge="Detail">
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(clusterGroups.length, 4)}, 1fr)`, gap: 12 }}>
              {clusterGroups.map((grp, ci) => {
                const avgAmt  = grp.length ? grp.reduce((s, p) => s + p.amount, 0) / grp.length : 0;
                const maxAmt  = grp.length ? Math.max(...grp.map(p => p.amount)) : 0;
                const minAmt  = grp.length ? Math.min(...grp.map(p => p.amount)) : 0;
                const avgTime = grp.length ? grp.reduce((s, p) => s + p.time, 0) / grp.length : 0;
                const crCount = grp.filter(p => p.TYPE === "CR").length;
                const drCount = grp.filter(p => p.TYPE === "DR").length;
                const isSelected = selectedCluster === ci;
                const color = CLUSTER_COLORS[ci % CLUSTER_COLORS.length];
                return (
                  <div key={ci} onClick={() => setSelectedCluster(isSelected ? null : ci)}
                    style={{
                      borderRadius: 12, padding: "14px 16px",
                      border: isSelected ? `2px solid ${color}` : `1px solid ${color}44`,
                      background: isSelected ? color + "11" : "white",
                      cursor: "pointer", transition: "all .15s",
                      boxShadow: isSelected ? `0 4px 16px ${color}33` : "none",
                    }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontWeight: 800, fontSize: 15, color }}>Cluster {ci + 1}</div>
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: color + "22", color }}>
                        {grp.length} txn
                      </span>
                    </div>
                    <div style={{ borderTop: `1px solid ${color}22`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                      {[
                        ["Rata-rata", fmtIDR(avgAmt)],
                        ["Terkecil", fmtIDR(minAmt)],
                        ["Terbesar", fmtIDR(maxAmt)],
                        ["Jam rata-rata", avgTime.toFixed(1) + ":xx"],
                      ].map(([label, val]) => (
                        <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "#94a3b8" }}>{label}</span>
                          <span style={{ fontWeight: 700, color: BNI_BLUE }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${color}22` }}>
                        <span style={{ color: GREEN, fontWeight: 700 }}>CR: {crCount}</span>
                        <span style={{ color: RED, fontWeight: 700 }}>DR: {drCount}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Noise card */}
              {noisePoints.length > 0 && (
                <div onClick={() => setSelectedCluster(selectedCluster === -1 ? null : -1)}
                  style={{
                    borderRadius: 12, padding: "14px 16px",
                    border: selectedCluster === -1 ? `2px solid ${RED}` : `1px solid ${RED}44`,
                    background: selectedCluster === -1 ? RED + "11" : "white",
                    cursor: "pointer", transition: "all .15s",
                    boxShadow: selectedCluster === -1 ? `0 4px 16px ${RED}33` : "none",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 15, color: RED }}>⚠ Noise</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: RED + "22", color: RED }}>
                      {noisePoints.length} txn
                    </span>
                  </div>
                  <div style={{ borderTop: `1px solid ${RED}22`, paddingTop: 10 }}>
                    <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6 }}>
                      Titik-titik ini tidak masuk ke cluster manapun. Kemungkinan merupakan <b style={{ color: RED }}>transaksi anomali</b> yang perlu diperiksa lebih lanjut.
                    </div>
                    <div style={{ marginTop: 8, fontSize: 11 }}>
                      <span style={{ fontWeight: 700, color: RED }}>{noiseRate}%</span>
                      <span style={{ color: "#94a3b8" }}> dari total transaksi</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── Radar Chart (if ≥2 clusters) ── */}
      {clusterGroups.length >= 2 && (
        <div style={{ marginBottom: 16 }}>
          <ChartCard title="Perbandingan profil cluster (Radar)" sub="Normalisasi 0–100 untuk perbandingan relatif antar cluster" badge="Analisis">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(0,63,135,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "#64748b" }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9, fill: "#94a3b8" }} />
                {clusterGroups.map((_, ci) => (
                  <Radar key={ci} name={`Cluster ${ci + 1}`} dataKey={`C${ci+1}`}
                    stroke={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
                    fill={CLUSTER_COLORS[ci % CLUSTER_COLORS.length]}
                    fillOpacity={0.12} strokeWidth={2}
                  />
                ))}
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "center" }}>
              {clusterGroups.map((_, ci) => (
                <span key={ci} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: CLUSTER_COLORS[ci % CLUSTER_COLORS.length], display: "inline-block" }} />
                  Cluster {ci + 1}
                </span>
              ))}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── Noise Detail ── */}
      {noisePoints.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ChartCard title="⚠ Transaksi Anomali (Noise)" sub="Transaksi yang tidak masuk ke cluster manapun — patut diperiksa" badge="Anomali">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 10 }}>
              {noisePoints.slice(0, 9).map((p, i) => (
                <div key={i} style={{ background: "#fef2f2", borderRadius: 10, padding: "10px 14px", border: "1px solid #fecaca" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: RED }}>NO {p.NO}</span>
                    <span style={{ fontSize: 10, padding: "1px 8px", borderRadius: 999, background: p.TYPE === "CR" ? "#dcfce7" : "#fee2e2", color: p.TYPE === "CR" ? "#166534" : "#991b1b", fontWeight: 700 }}>{p.TYPE}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: BNI_BLUE, marginBottom: 3 }}>{fmtFull(p.amount)}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8" }}>Jam {p.timeLabel} · {p.TRAN_CODE}</div>
                </div>
              ))}
              {noisePoints.length > 9 && (
                <div style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 14px", border: "1px dashed #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>+{noisePoints.length - 9} transaksi lainnya</span>
                </div>
              )}
            </div>
          </ChartCard>
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>
              Detail transaksi per cluster
              {selectedCluster !== null && (
                <span style={{ marginLeft: 8 }}>
                  <ClusterBadge ci={selectedCluster} />
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {selectedCluster !== null
                ? "Klik kartu cluster untuk reset filter"
                : "Klik kartu cluster di atas untuk filter"}
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2 }}>
            {tableData.length} baris
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "Cluster", "NO", "Jam", "Teller", "Tran Code", "SYS", "Amount", "Tipe"].map(h => (
                  <th key={h} style={{ textAlign: h === "Amount" ? "right" : "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: "24px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>Tidak ada data</td></tr>
              ) : pageData.map((r, i) => (
                <tr key={r.NO + "-" + i} style={{ borderBottom: "1px solid #f1f5f9", background: r.cluster === -1 ? "#fef2f2" : "" }}
                  onMouseEnter={e => e.currentTarget.style.background = r.cluster === -1 ? "#fee2e2" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = r.cluster === -1 ? "#fef2f2" : ""}>
                  <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 11 }}>{(tablePage - 1) * PER_PAGE + i + 1}</td>
                  <td style={{ padding: "8px 12px" }}><ClusterBadge ci={r.cluster} /></td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.NO}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", whiteSpace: "nowrap" }}>{r.timeLabel}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", fontFamily: "monospace", fontSize: 11 }}>{r.TELLER}</td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.TRAN_CODE}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: r.SYS === "BOR" ? "#dbeafe" : "#fef9c3", color: r.SYS === "BOR" ? "#1e40af" : "#854d0e" }}>{r.SYS}</span>
                  </td>
                  <td style={{ padding: "8px 12px", color: "#334155", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtFull(r.amount)}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: r.TYPE === "CR" ? "#dcfce7" : "#fee2e2", color: r.TYPE === "CR" ? "#166534" : "#991b1b" }}>{r.TYPE}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Hal {tablePage}/{totalPages} — {(tablePage-1)*PER_PAGE+1}–{Math.min(tablePage*PER_PAGE, tableData.length)} dari {tableData.length} baris
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagiBtn disabled={tablePage <= 1} onClick={() => setTablePage(p => Math.max(1, p-1))}>← Prev</PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(tablePage - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <PagiBtn key={p} active={p === tablePage} onClick={() => setTablePage(p)}>{p}</PagiBtn>
              ) : null;
            })}
            <PagiBtn disabled={tablePage >= totalPages} onClick={() => setTablePage(p => Math.min(totalPages, p+1))}>Next →</PagiBtn>
          </div>
        </div>
      </div>

      {/* ── Comparison K-Means vs DBSCAN ── */}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="📊 K-Means vs DBSCAN — Perbandingan" sub="Perbedaan konseptual untuk keperluan akademik" badge="Referensi">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {[
              {
                title: "K-Means", color: BNI_BLUE2, icon: "🎯",
                items: [
                  "Perlu menentukan K terlebih dahulu",
                  "Cluster berbentuk bulat (spherical)",
                  "Sensitif terhadap outlier",
                  "Cepat dan sederhana (O(nkt))",
                  "Cocok untuk data terstruktur",
                ],
              },
              {
                title: "DBSCAN", color: "#7c3aed", icon: "🔍",
                items: [
                  "K otomatis dari data (tidak perlu ditentukan)",
                  "Cluster bentuk bebas (arbitrer)",
                  "Tahan terhadap outlier (jadi noise)",
                  "Lebih lambat untuk data besar (O(n²))",
                  "Cocok untuk data dengan noise/anomali",
                ],
              },
            ].map(({ title, color, icon, items }) => (
              <div key={title} style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: `1px solid ${color}22` }}>
                <div style={{ fontWeight: 700, color, marginBottom: 10, fontSize: 13 }}>{icon} {title}</div>
                {items.map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
                    <span style={{ color, fontSize: 11, flexShrink: 0, marginTop: 1 }}>▸</span>
                    <span style={{ fontSize: 11, color: "#334155", lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
        © 2025 BNI Life Insurance — DBSCAN Clustering Dashboard
      </p>
    </div>
  );
}