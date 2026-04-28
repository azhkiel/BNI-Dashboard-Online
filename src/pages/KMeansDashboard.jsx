import { useState, useMemo, useEffect, useRef } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar, Cell, Legend,
} from "recharts";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const RED        = "#dc2626";
const GREEN      = "#16a34a";

const CLUSTER_COLORS = ["#003F87", "#F37021", "#00A99D", "#dc2626", "#7c3aed"];
const CLUSTER_LABELS = ["Cluster A", "Cluster B", "Cluster C", "Cluster D", "Cluster E"];
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
  // Handles "08:19" or "30/12/1899 08:19:00"
  const parts = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const [h, m] = parts.substring(0, 5).split(":").map(Number);
  return h + m / 60;
}

// ── K-MEANS ALGORITHM (pure JS, no library) ───────────────────────────────
function normalizePoints(data) {
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

function kmeansOnce(points, k, maxIter = 150) {
  // KMeans++ initialisation for better stability
  const centroids = [];
  centroids.push(points[Math.floor(Math.random() * points.length)]);
  while (centroids.length < k) {
    const dists = points.map(p => {
      const d = Math.min(...centroids.map(c => (p.na - c.na) ** 2 + (p.nt - c.nt) ** 2));
      return d;
    });
    const total = dists.reduce((s, d) => s + d, 0);
    let r = Math.random() * total;
    for (let i = 0; i < points.length; i++) {
      r -= dists[i];
      if (r <= 0) { centroids.push(points[i]); break; }
    }
  }

  let labels = new Array(points.length).fill(0);
  let cs = centroids.map(c => ({ na: c.na, nt: c.nt }));

  for (let iter = 0; iter < maxIter; iter++) {
    const newLabels = points.map(p => {
      let best = 0, bestD = Infinity;
      cs.forEach((c, ci) => {
        const d = (p.na - c.na) ** 2 + (p.nt - c.nt) ** 2;
        if (d < bestD) { bestD = d; best = ci; }
      });
      return best;
    });
    if (newLabels.every((l, i) => l === labels[i])) break;
    labels = newLabels;
    cs = cs.map((_, ci) => {
      const pts = points.filter((_, i) => labels[i] === ci);
      if (!pts.length) return cs[ci];
      return {
        na: pts.reduce((s, p) => s + p.na, 0) / pts.length,
        nt: pts.reduce((s, p) => s + p.nt, 0) / pts.length,
      };
    });
  }

  const wcss = points.reduce((s, p, i) => {
    const c = cs[labels[i]];
    return s + (p.na - c.na) ** 2 + (p.nt - c.nt) ** 2;
  }, 0);

  return { labels, centroids: cs, wcss };
}

function runKMeans(points, k, runs = 10) {
  let best = null;
  for (let i = 0; i < runs; i++) {
    const r = kmeansOnce(points, k);
    if (!best || r.wcss < best.wcss) best = r;
  }
  // Re-label clusters by average amount (ascending) so labels are stable
  const avgAmounts = Array.from({ length: k }, (_, ci) => {
    const pts = points.filter((_, i) => best.labels[i] === ci);
    return pts.length ? pts.reduce((s, p) => s + p.amount, 0) / pts.length : 0;
  });
  const order = avgAmounts.map((a, i) => ({ a, i })).sort((x, y) => x.a - y.a).map(o => o.i);
  const remap = new Array(k);
  order.forEach((orig, newIdx) => { remap[orig] = newIdx; });
  return { ...best, labels: best.labels.map(l => remap[l]) };
}

function computeElbow(points, maxK = 6) {
  return Array.from({ length: maxK - 1 }, (_, i) => {
    const k = i + 2;
    const { wcss } = runKMeans(points, k, 8);
    return { k, wcss: +wcss.toFixed(4) };
  });
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
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 11, fontWeight: 700,
      background: CLUSTER_COLORS[ci] + "22",
      color: CLUSTER_COLORS[ci],
      border: "1px solid " + CLUSTER_COLORS[ci] + "55",
    }}>
      {CLUSTER_LABELS[ci]}
    </span>
  );
}

// Inline SVG icons
const IconCpu   = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>;
const IconGrid  = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>;
const IconZap   = ({ size = 18, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconBank  = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;

// Custom scatter tooltip
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "white", border: "1px solid rgba(0,63,135,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>NO {d.NO}</p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Tipe: <b style={{ color: d.TYPE === "CR" ? GREEN : RED }}>{d.TYPE}</b></p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Amount: <b>{fmtFull(d.amount)}</b></p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Jam: <b>{d.timeLabel}</b></p>
      <p style={{ color: "#64748b", margin: "2px 0" }}>Tran Code: <b>{d.TRAN_CODE}</b></p>
    </div>
  );
}

function ElbowTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "white", border: "1px solid rgba(0,63,135,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>K = {label}</p>
      <p style={{ color: "#64748b" }}>Inertia (WCSS): <b>{payload[0]?.value?.toFixed(4)}</b></p>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
/**
 * KMeansDashboard
 * Props:
 *   data    – array of transaction objects (same shape as TellerDashboard)
 *   loading – boolean (optional)
 */
export default function KMeansDashboard({ data: propData = [], loading = false }) {
  const [k, setK]             = useState(3);
  const [runSeed, setRunSeed] = useState(0); // increment to re-run
  const [selectedCluster, setSelectedCluster] = useState(null); // null = all
  const [tablePage, setTablePage] = useState(1);

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

  const normalized = useMemo(() => normalizePoints(points), [points]);

  // ── K-Means result ──────────────────────────────────────────────────────
  const { labels } = useMemo(() => {
    if (normalized.length < 2) return { labels: [], centroids: [], wcss: 0 };
    return runKMeans(normalized, Math.min(k, normalized.length), 10);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, k, runSeed]);

  // ── Elbow data ──────────────────────────────────────────────────────────
  const elbowData = useMemo(() => {
    if (normalized.length < 4) return [];
    return computeElbow(normalized, Math.min(6, normalized.length));
  }, [normalized]);

  // Recommended K from elbow
  const recommendedK = useMemo(() => {
    if (elbowData.length < 2) return 3;
    const diffs = elbowData.slice(1).map((e, i) => elbowData[i].wcss - e.wcss);
    const maxDiff = Math.max(...diffs);
    const idx = diffs.indexOf(maxDiff);
    return elbowData[idx + 1]?.k ?? 3;
  }, [elbowData]);

  // ── Per-cluster groups ──────────────────────────────────────────────────
  const clusterGroups = useMemo(() => {
    return Array.from({ length: k }, (_, ci) =>
      points.filter((_, i) => labels[i] === ci)
    );
  }, [points, labels, k]);

  // ── Scatter data ────────────────────────────────────────────────────────
  const scatterDatasets = useMemo(() => {
    return Array.from({ length: k }, (_, ci) => ({
      name: CLUSTER_LABELS[ci],
      color: CLUSTER_COLORS[ci],
      points: points
        .filter((_, i) => labels[i] === ci)
        .map(p => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(2) })),
    }));
  }, [points, labels, k]);

  // ── Bar: CR/DR per cluster ───────────────────────────────────────────────
  const barData = useMemo(() => {
    return clusterGroups.map((grp, ci) => ({
      name: CLUSTER_LABELS[ci],
      CR: grp.filter(p => p.TYPE === "CR").length,
      DR: grp.filter(p => p.TYPE === "DR").length,
      color: CLUSTER_COLORS[ci],
    }));
  }, [clusterGroups]);

  // ── Table (filtered by selected cluster) ─────────────────────────────────
  const tableData = useMemo(() => {
    setTablePage(1);
    return points.map((p, i) => ({ ...p, cluster: labels[i] }))
      .filter(p => selectedCluster === null || p.cluster === selectedCluster);
  }, [points, labels, selectedCluster]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PER_PAGE));
  const pageData   = tableData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: "#F0F4FA" }}>
        <div style={{ textAlign: "center", color: "#94a3b8" }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚙️</div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Memuat data...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px 40px", background: "#F0F4FA", minHeight: "100vh" }}>

      {/* ── Header ── */}
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
            <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Dashboard K-Means Clustering</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 2 }}>Pengelompokan transaksi otomatis berbasis nilai &amp; waktu</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
          {/* K selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600 }}>Jumlah Cluster (K):</span>
            {[2, 3, 4, 5].map(v => (
              <button key={v} onClick={() => setK(v)} style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
                background: k === v ? BNI_ORANGE : "rgba(255,255,255,0.15)",
                color: "white", transition: "background .15s",
              }}>{v}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        <KpiCard label="Total Transaksi" value={points.length + " txn"} sub={"Diproses " + k + " cluster"} accentColor={BNI_BLUE2} iconBg="rgba(0,63,135,0.1)" icon={IconCpu} />
        <KpiCard label="Jumlah Cluster (K)" value={"K = " + k} sub={recommendedK === k ? "✓ Sesuai rekomendasi" : "Rekomendasi: K = " + recommendedK} accentColor={BNI_ORANGE} iconBg="rgba(243,112,33,0.1)" icon={IconGrid} />
        <KpiCard label="Cluster terbesar" value={CLUSTER_LABELS[clusterGroups.indexOf(clusterGroups.reduce((a, b) => a.length >= b.length ? a : b))]} sub={Math.max(...clusterGroups.map(g => g.length)) + " transaksi"} accentColor={CLUSTER_COLORS[0]} iconBg="rgba(0,63,135,0.1)" icon={IconZap} />
        <KpiCard label="Rata-rata / cluster" value={Math.round(points.length / k) + " txn"} sub="Distribusi ideal merata" accentColor={GREEN} iconBg="rgba(22,163,74,0.1)" icon={IconGrid} />
      </div>

      {/* ── Row 1: Elbow + Scatter ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>

        {/* Elbow Chart */}
        <ChartCard title="Elbow method" sub="Cari K optimal — titik siku = K terbaik" badge="Otomatis">
          {elbowData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={elbowData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                  <XAxis dataKey="k" tickFormatter={v => "K=" + v} tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(2)} />
                  <Tooltip content={<ElbowTooltip />} />
                  <Line type="monotone" dataKey="wcss" stroke={BNI_ORANGE} strokeWidth={2.5}
                    dot={({ cx, cy, payload }) => (
                      <circle key={payload.k} cx={cx} cy={cy} r={payload.k === recommendedK ? 7 : 4}
                        fill={payload.k === recommendedK ? BNI_ORANGE : BNI_BLUE2}
                        stroke="white" strokeWidth={2} />
                    )}
                  />
                </LineChart>
              </ResponsiveContainer>
              <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#64748b" }}>
                <span style={{ background: BNI_ORANGE + "22", color: BNI_ORANGE, padding: "2px 10px", borderRadius: 999, fontWeight: 700 }}>
                  Rekomendasi: K = {recommendedK}
                </span>
              </div>
            </>
          ) : (
            <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>
              Data terlalu sedikit untuk elbow method
            </div>
          )}
        </ChartCard>

        {/* Scatter Plot */}
        <ChartCard title="Scatter plot cluster" sub="Sumbu X = jam transaksi, sumbu Y = nilai (juta Rp)" badge={"K = " + k}>
          <ResponsiveContainer width="100%" height={220}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" type="number" name="Jam" domain={[7, 18]} tickCount={7}
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => v.toFixed(0) + ":00"} label={{ value: "Jam", position: "insideBottomRight", offset: -4, fontSize: 11, fill: "#94a3b8" }} />
              <YAxis dataKey="y" type="number" name="Amount"
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => v + "jt"} label={{ value: "Amount", angle: -90, position: "insideLeft", offset: 8, fontSize: 11, fill: "#94a3b8" }} />
              <Tooltip content={<ScatterTooltip />} />
              {scatterDatasets.map((ds, ci) => (
                <Scatter key={ci} name={ds.name} data={ds.points} fill={ds.color} fillOpacity={0.8} />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
          {/* Legend */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, justifyContent: "center" }}>
            {scatterDatasets.map((ds, ci) => (
              <span key={ci} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: ds.color, display: "inline-block" }} />
                {ds.name} ({ds.points.length} txn)
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: Cluster Summary Cards ── */}
      <ChartCard title="Profil masing-masing cluster" sub="Klik cluster untuk filter tabel di bawah" badge="Detail">
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${k}, 1fr)`, gap: 12 }}>
          {clusterGroups.map((grp, ci) => {
            const avgAmt = grp.length ? grp.reduce((s, p) => s + p.amount, 0) / grp.length : 0;
            const maxAmt = grp.length ? Math.max(...grp.map(p => p.amount)) : 0;
            const minAmt = grp.length ? Math.min(...grp.map(p => p.amount)) : 0;
            const crCount = grp.filter(p => p.TYPE === "CR").length;
            const drCount = grp.filter(p => p.TYPE === "DR").length;
            const dominan = crCount >= drCount ? "CR" : "DR";
            const isSelected = selectedCluster === ci;

            return (
              <div key={ci} onClick={() => setSelectedCluster(isSelected ? null : ci)}
                style={{
                  borderRadius: 12, padding: "14px 16px",
                  border: isSelected ? `2px solid ${CLUSTER_COLORS[ci]}` : `1px solid ${CLUSTER_COLORS[ci]}44`,
                  background: isSelected ? CLUSTER_COLORS[ci] + "11" : "white",
                  cursor: "pointer", transition: "all .15s",
                  boxShadow: isSelected ? `0 4px 16px ${CLUSTER_COLORS[ci]}33` : "none",
                }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: CLUSTER_COLORS[ci] }}>{CLUSTER_LABELS[ci]}</div>
                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: CLUSTER_COLORS[ci] + "22", color: CLUSTER_COLORS[ci] }}>
                    {grp.length} txn
                  </span>
                </div>
                <div style={{ borderTop: `1px solid ${CLUSTER_COLORS[ci]}22`, paddingTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                  {[
                    ["Rata-rata", fmtIDR(avgAmt)],
                    ["Terkecil", fmtIDR(minAmt)],
                    ["Terbesar", fmtIDR(maxAmt)],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                      <span style={{ color: "#94a3b8" }}>{label}</span>
                      <span style={{ fontWeight: 700, color: BNI_BLUE }}>{val}</span>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginTop: 4, paddingTop: 6, borderTop: `1px solid ${CLUSTER_COLORS[ci]}22` }}>
                    <span style={{ color: GREEN, fontWeight: 700 }}>CR: {crCount}</span>
                    <span style={{ color: RED, fontWeight: 700 }}>DR: {drCount}</span>
                    <span style={{ fontWeight: 700, color: dominan === "CR" ? GREEN : RED }}>↑ {dominan}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ChartCard>

      {/* ── Row 3: Bar Chart CR/DR per cluster ── */}
      <div style={{ marginTop: 16, marginBottom: 16 }}>
        <ChartCard title="Distribusi CR & DR per cluster" sub="Jumlah transaksi credit dan debit dalam tiap cluster" badge="Komposisi">
          <div style={{ display: "flex", gap: 16, marginBottom: 8, justifyContent: "center" }}>
            {[["CR", BNI_BLUE2], ["DR", RED]].map(([l, c]) => (
              <span key={l} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: c, display: "inline-block" }} />{l}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="CR" name="CR" fill={BNI_BLUE2} radius={[4, 4, 0, 0]} />
              <Bar dataKey="DR" name="DR" fill={RED} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>
              Detail transaksi per cluster
              {selectedCluster !== null && (
                <span style={{ marginLeft: 8 }}><ClusterBadge ci={selectedCluster} /></span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
              {selectedCluster !== null
                ? "Menampilkan cluster " + CLUSTER_LABELS[selectedCluster] + " — klik kartu cluster untuk reset"
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
                <tr key={r.NO + "-" + i} style={{ borderBottom: "1px solid #f1f5f9" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = ""}>
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
            Hal {tablePage}/{totalPages} — menampilkan {(tablePage - 1) * PER_PAGE + 1}–{Math.min(tablePage * PER_PAGE, tableData.length)} dari {tableData.length} baris
          </span>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            <PagiBtn disabled={tablePage <= 1} onClick={() => setTablePage(p => Math.max(1, p - 1))}>← Prev</PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(tablePage - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <PagiBtn key={p} active={p === tablePage} onClick={() => setTablePage(p)}>{p}</PagiBtn>
              ) : null;
            })}
            <PagiBtn disabled={tablePage >= totalPages} onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}>Next →</PagiBtn>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
        © 2025 BNI Life Insurance — K-Means Clustering Dashboard
      </p>
    </div>
  );
}

// ── Pagination button ──────────────────────────────────────────────────────
function PagiBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "4px 10px", fontSize: 11, borderRadius: 6, cursor: disabled ? "default" : "pointer",
      border: "1px solid " + (active ? BNI_BLUE2 : "#e2e8f0"),
      background: active ? BNI_BLUE2 : "white",
      color: active ? "white" : disabled ? "#cbd5e1" : "#334155",
      transition: "all .1s",
    }}>
      {children}
    </button>
  );
}