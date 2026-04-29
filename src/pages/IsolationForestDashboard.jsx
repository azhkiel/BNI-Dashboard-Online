import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  Cell, ReferenceLine,
} from "recharts";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const RED        = "#dc2626";
const RED_LIGHT  = "#fca5a5";
const AMBER      = "#d97706";
const GREEN      = "#16a34a";
const TEAL       = "#0d9488";
const PER_PAGE   = 20;

// Risk level thresholds
const RISK_HIGH   = 0.65;  // anomaly score > ini = HIGH
const RISK_MED    = 0.50;  // anomaly score > ini = MEDIUM

// ── HELPERS ────────────────────────────────────────────────────────────────
function fmtIDR(n) {
  if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(2) + "M";
  if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(2) + "jt";
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

// ── ISOLATION FOREST (Pure JS) ─────────────────────────────────────────────
/**
 * Isolation Forest implementation
 * Reference: Liu et al. (2008) "Isolation Forest"
 *
 * Core idea: anomalies are "few and different" — they are isolated faster
 * (shorter path length) than normal points in random trees.
 */

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

/** Build one isolation tree recursively */
function buildITree(data, indices, depth, maxDepth) {
  // Leaf condition
  if (indices.length <= 1 || depth >= maxDepth) {
    return { isLeaf: true, size: indices.length };
  }

  // Randomly pick a feature (col 0 = normalized amount, col 1 = normalized time)
  const featureIdx = Math.floor(Math.random() * data[0].length);
  const values = indices.map(i => data[i][featureIdx]);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);

  if (minVal === maxVal) {
    return { isLeaf: true, size: indices.length };
  }

  const splitVal = randomBetween(minVal, maxVal);
  const left  = indices.filter(i => data[i][featureIdx] <  splitVal);
  const right = indices.filter(i => data[i][featureIdx] >= splitVal);

  return {
    isLeaf: false,
    featureIdx,
    splitVal,
    left:  buildITree(data, left,  depth + 1, maxDepth),
    right: buildITree(data, right, depth + 1, maxDepth),
  };
}

/** Average path length of unsuccessful BST search (c(n)) */
function cFactor(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  const H = Math.log(n - 1) + 0.5772156649; // Euler-Mascheroni constant
  return 2 * H - (2 * (n - 1) / n);
}

/** Path length for one point through one tree */
function pathLength(point, node, depth) {
  if (node.isLeaf) {
    return depth + cFactor(node.size);
  }
  if (point[node.featureIdx] < node.splitVal) {
    return pathLength(point, node.left, depth + 1);
  }
  return pathLength(point, node.right, depth + 1);
}

/**
 * Run Isolation Forest
 * @param {number[][]} data      - normalized 2D array [amount, time]
 * @param {number}     numTrees  - number of isolation trees
 * @param {number}     sampleSize - subsample per tree
 * @returns {number[]} anomaly scores in [0,1] — closer to 1 = more anomalous
 */
function runIsolationForest(data, numTrees = 100, sampleSize = 256) {
  const n = data.length;
  if (n === 0) return [];

  const actualSample = Math.min(sampleSize, n);
  const maxDepth = Math.ceil(Math.log2(actualSample));
  const trees = [];

  for (let t = 0; t < numTrees; t++) {
    // Random subsample (without replacement)
    const shuffled = [...Array(n).keys()].sort(() => Math.random() - 0.5);
    const sampleIndices = shuffled.slice(0, actualSample);
    trees.push(buildITree(data, sampleIndices, 0, maxDepth));
  }

  // Compute anomaly score for each point
  const cf = cFactor(actualSample);
  return data.map(point => {
    const avgPath = trees.reduce((s, tree) => s + pathLength(point, tree, 0), 0) / numTrees;
    // Score: 2^(-avgPath / c(n))
    const score = Math.pow(2, -avgPath / cf);
    return +score.toFixed(4);
  });
}

// ── RISK HELPERS ───────────────────────────────────────────────────────────
function getRiskLevel(score) {
  if (score >= RISK_HIGH) return "HIGH";
  if (score >= RISK_MED)  return "MEDIUM";
  return "NORMAL";
}
function getRiskColor(score) {
  if (score >= RISK_HIGH) return RED;
  if (score >= RISK_MED)  return AMBER;
  return GREEN;
}
function getRiskBg(score) {
  if (score >= RISK_HIGH) return "#fee2e2";
  if (score >= RISK_MED)  return "#fef3c7";
  return "#dcfce7";
}
function getRiskTextColor(score) {
  if (score >= RISK_HIGH) return "#991b1b";
  if (score >= RISK_MED)  return "#92400e";
  return "#166534";
}
function getRiskLabel(level) {
  if (level === "HIGH")   return "⚠ HIGH RISK";
  if (level === "MEDIUM") return "△ MEDIUM";
  return "✓ NORMAL";
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accentColor }) {
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
      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{label}</p>
      <div style={{ fontSize: 22, fontWeight: 800, color: BNI_BLUE }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, badge, children }) {
  return (
    <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{sub}</div>}
        </div>
        {badge && <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2, whiteSpace: "nowrap" }}>{badge}</span>}
      </div>
      {children}
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
    }}>{children}</button>
  );
}

function RiskBadge({ score }) {
  const level = getRiskLevel(score);
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 999,
      fontSize: 10, fontWeight: 700,
      background: getRiskBg(score),
      color: getRiskTextColor(score),
      border: `1px solid ${getRiskColor(score)}44`,
      whiteSpace: "nowrap",
    }}>{getRiskLabel(level)}</span>
  );
}

// Score gauge bar
function ScoreBar({ score }) {
  const color = getRiskColor(score);
  return (
    <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${(score * 100).toFixed(1)}%`,
        background: `linear-gradient(90deg, ${GREEN}, ${AMBER}, ${RED})`,
        borderRadius: 999, transition: "width .3s",
      }} />
    </div>
  );
}

const IconBank    = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;
const IconShield  = ({ size = 24, color = "white" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// ── THEORY PANEL ────────────────────────────────────────────────────────────
function TheoryPanel() {
  return (
    <ChartCard title="Konsep Isolation Forest" sub="Liu et al. (2008) — Anomaly detection berbasis isolasi" badge="Teori">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[
          { icon: "🌲", term: "Isolation Tree", desc: "Pohon biner acak yang mempartisi data. Setiap node memilih fitur & split value secara random." },
          { icon: "📏", term: "Path Length", desc: "Berapa banyak split dibutuhkan untuk mengisolasi satu titik. Anomali → path pendek." },
          { icon: "🎯", term: "Anomaly Score", desc: "score = 2^(−avgPath / c(n)). Mendekati 1 = anomali, mendekati 0 = normal." },
          { icon: "🔢", term: "c(n) Factor", desc: "Panjang path rata-rata pada BST gagal: 2H(n-1) − 2(n-1)/n. Normalisasi skor." },
          { icon: "🌳", term: "Forest", desc: "Rata-rata path length dari banyak tree (default 100). Semakin banyak tree → semakin stabil." },
          { icon: "📊", term: "Sub-sampling", desc: "Tiap tree hanya menggunakan subset data (default 256). Efisien dan mengurangi overfitting." },
        ].map(({ icon, term, desc }) => (
          <div key={term} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: BNI_BLUE, marginBottom: 4 }}>{term}</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "linear-gradient(135deg,#002960,#003F87)", borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
          💡 <b style={{ color: "white" }}>Keunggulan Isolation Forest:</b> Kompleksitas O(n log n), tidak membutuhkan label (unsupervised), tidak sensitif terhadap distribusi data, dan sangat efisien untuk data berdimensi tinggi. Sangat cocok untuk <b style={{ color: BNI_ORANGE }}>deteksi fraud perbankan real-time.</b>
        </div>
      </div>
    </ChartCard>
  );
}

// ── ANOMALY ALERT CARD ──────────────────────────────────────────────────────
function AnomalyCard({ point, rank }) {
  const level = getRiskLevel(point.score);
  const color = getRiskColor(point.score);
  return (
    <div style={{
      borderRadius: 12, padding: "14px 16px",
      border: `1px solid ${color}44`,
      background: level === "HIGH" ? "#fef2f2" : level === "MEDIUM" ? "#fffbeb" : "white",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{ position: "absolute", top: 8, right: 10, fontSize: 22, opacity: 0.08, fontWeight: 900 }}>#{rank}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: BNI_BLUE }}>NO {point.NO}</div>
          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 1 }}>{point.timeLabel} · {point.TRAN_CODE}</div>
        </div>
        <RiskBadge score={point.score} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 800, color: BNI_BLUE, marginBottom: 8 }}>{fmtFull(point.amount)}</div>
      <ScoreBar score={point.score} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: "#94a3b8" }}>Anomaly Score</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{(point.score * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: point.TYPE === "CR" ? "#dcfce7" : "#fee2e2", color: point.TYPE === "CR" ? "#166534" : "#991b1b" }}>{point.TYPE}</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: "#dbeafe", color: "#1e40af" }}>{point.SYS}</span>
        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 999, fontWeight: 600, background: "#f1f5f9", color: "#475569" }}>{point.TELLER}</span>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
/**
 * IsolationForestDashboard
 * Props: data[], loading
 */
export default function IsolationForestDashboard({ data: propData = [], loading = false }) {
  const [numTrees,    setNumTrees]    = useState(100);
  const [sampleSize,  setSampleSize]  = useState(256);
  const [threshold,   setThreshold]   = useState(RISK_HIGH);
  const [filterRisk,  setFilterRisk]  = useState("ALL");
  const [showTheory,  setShowTheory]  = useState(false);
  const [tablePage,   setTablePage]   = useState(1);
  const [runSeed,     setRunSeed]     = useState(0); // re-run trigger

  // ── Prepare points ────────────────────────────────────────────────────
  const points = useMemo(() => {
    if (!propData.length) return [];
    return propData.map((r, idx) => {
      const timeStr = r.TIME || "00:00";
      return {
        ...r,
        amount: Number(r.AMOUNT),
        time: parseTimeToHour(timeStr),
        timeLabel: timeStr.includes(" ") ? timeStr.split(" ")[1]?.substring(0, 5) : timeStr.substring(0, 5),
        idx,
      };
    });
  }, [propData]);

  // ── Normalize for IF ──────────────────────────────────────────────────
  const normalized = useMemo(() => {
    if (!points.length) return [];
    const amounts = points.map(p => p.amount);
    const times   = points.map(p => p.time);
    const minA = Math.min(...amounts), maxA = Math.max(...amounts);
    const minT = Math.min(...times),   maxT = Math.max(...times);
    const rA = maxA - minA || 1, rT = maxT - minT || 1;
    return points.map(p => [
      (p.amount - minA) / rA,
      (p.time   - minT) / rT,
    ]);
  }, [points]);

  // ── Run Isolation Forest ───────────────────────────────────────────────
  const scores = useMemo(() => {
    if (!normalized.length) return [];
    // runSeed forces re-computation
    void runSeed;
    return runIsolationForest(normalized, numTrees, sampleSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, numTrees, sampleSize, runSeed]);

  // ── Combine points + scores ────────────────────────────────────────────
  const enriched = useMemo(() =>
    points.map((p, i) => ({
      ...p,
      score: scores[i] ?? 0,
      risk: getRiskLevel(scores[i] ?? 0),
    })),
    [points, scores]
  );

  // ── Stats ──────────────────────────────────────────────────────────────
  const highRisk   = useMemo(() => enriched.filter(p => p.score >= threshold), [enriched, threshold]);
  const medRisk    = useMemo(() => enriched.filter(p => p.score >= RISK_MED && p.score < threshold), [enriched, threshold]);
  const normalPts  = useMemo(() => enriched.filter(p => p.score < RISK_MED), [enriched]);
  const topAnomaly = useMemo(() => [...enriched].sort((a, b) => b.score - a.score).slice(0, 6), [enriched]);

  // ── Scatter data ───────────────────────────────────────────────────────
  const scatterHigh   = useMemo(() => highRisk.map(p => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(3) })), [highRisk]);
  const scatterMed    = useMemo(() => medRisk.map(p => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(3) })), [medRisk]);
  const scatterNormal = useMemo(() => normalPts.map(p => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(3) })), [normalPts]);

  // ── Score distribution histogram ───────────────────────────────────────
  const histData = useMemo(() => {
    const bins = 20;
    const arr  = Array.from({ length: bins }, (_, i) => ({
      range: `${(i / bins).toFixed(2)}–${((i + 1) / bins).toFixed(2)}`,
      center: (i + 0.5) / bins,
      count: 0,
    }));
    scores.forEach(s => {
      const bin = Math.min(bins - 1, Math.floor(s * bins));
      arr[bin].count++;
    });
    return arr;
  }, [scores]);

  // ── Score over time (sorted by time) ──────────────────────────────────
  const scoreTimeline = useMemo(() =>
    [...enriched].sort((a, b) => a.time - b.time).map((p, i) => ({
      i,
      timeLabel: p.timeLabel,
      score: p.score,
      amount: p.amount,
      NO: p.NO,
      risk: p.risk,
    })),
    [enriched]
  );

  // ── Hourly anomaly rate ────────────────────────────────────────────────
  const hourlyAnomaly = useMemo(() => {
    const map = {};
    enriched.forEach(p => {
      const h = Math.floor(p.time);
      if (!map[h]) map[h] = { hour: h + ":00", total: 0, anomaly: 0 };
      map[h].total++;
      if (p.score >= threshold) map[h].anomaly++;
    });
    return Object.values(map).sort((a, b) => parseInt(a.hour) - parseInt(b.hour)).map(d => ({
      ...d,
      rate: d.total ? +((d.anomaly / d.total) * 100).toFixed(1) : 0,
    }));
  }, [enriched, threshold]);

  // ── Table filter ───────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    setTablePage(1);
    if (filterRisk === "HIGH")   return [...enriched].filter(p => p.score >= threshold).sort((a, b) => b.score - a.score);
    if (filterRisk === "MEDIUM") return [...enriched].filter(p => p.score >= RISK_MED && p.score < threshold).sort((a, b) => b.score - a.score);
    if (filterRisk === "NORMAL") return enriched.filter(p => p.score < RISK_MED);
    return [...enriched].sort((a, b) => b.score - a.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, filterRisk, threshold]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PER_PAGE));
  const pageData   = tableData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>🌲</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Membangun Isolation Forest...</div>
      </div>
    </div>
  );

  const anomalyRate = enriched.length ? ((highRisk.length / enriched.length) * 100).toFixed(1) : 0;

  return (
    <div style={{ padding: "24px 28px 40px", background: "#F0F4FA", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #002960 0%, #7f1d1d 100%)",
        borderRadius: 18, padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -50, top: -50, width: 200, height: 200, borderRadius: "50%", background: "rgba(220,38,38,0.1)" }} />
        <div style={{ position: "absolute", left: "40%", bottom: -60, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(220,38,38,0.25)", border: "1px solid rgba(220,38,38,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconShield size={24} />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Dashboard Isolation Forest</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>Deteksi anomali & fraud transaksi — Liu et al. (2008)</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
          <button onClick={() => setRunSeed(s => s + 1)} style={{
            padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12, background: RED, color: "white",
          }}>🔄 Re-run Forest</button>
          <button onClick={() => setShowTheory(v => !v)} style={{
            padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
            background: showTheory ? TEAL : "rgba(255,255,255,0.1)",
            color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>📚 Teori</button>
        </div>
      </div>

      {/* ── Parameter Controls ── */}
      <div style={{ background: "white", borderRadius: 16, padding: "20px 24px", marginBottom: 20, boxShadow: "0 2px 20px rgba(0,63,135,0.07)", border: "1px solid rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>⚙️ Parameter Isolation Forest</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Klik "Re-run Forest" setelah mengubah parameter untuk hasil baru</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, background: "#fee2e2", color: "#991b1b", fontWeight: 700 }}>
              🚨 {highRisk.length} HIGH RISK ({anomalyRate}%)
            </span>
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, background: "#fef3c7", color: "#92400e", fontWeight: 700 }}>
              △ {medRisk.length} MEDIUM
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24 }}>
          {[
            { label: "Jumlah Trees", value: numTrees, min: 10, max: 200, step: 10, onChange: setNumTrees, hint: "Makin banyak tree → skor lebih stabil (tapi lebih lambat)", color: BNI_BLUE2 },
            { label: "Sample Size per Tree", value: sampleSize, min: 32, max: 512, step: 32, onChange: setSampleSize, hint: "Default 256. Lebih kecil → lebih cepat, kurang presisi", color: TEAL },
            { label: `Threshold HIGH RISK (${(threshold * 100).toFixed(0)}%)`, value: threshold, min: 0.5, max: 0.9, step: 0.01, onChange: setThreshold, hint: "Transaksi dengan score ≥ threshold dianggap HIGH RISK", color: RED },
          ].map(({ label, value, min, max, step, onChange, hint, color }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: BNI_BLUE }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color, background: color + "15", padding: "2px 10px", borderRadius: 8 }}>{typeof value === "number" && value < 1 ? (value * 100).toFixed(0) + "%" : value}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => onChange(Number(e.target.value))}
                style={{ width: "100%", accentColor: color, height: 4 }}
              />
              <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Theory Panel ── */}
      {showTheory && <div style={{ marginBottom: 20 }}><TheoryPanel /></div>}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Total Transaksi" value={enriched.length + " txn"} sub={`${numTrees} trees · sample ${sampleSize}`} accentColor={BNI_BLUE2} />
        <KpiCard label="HIGH RISK" value={<span style={{ color: RED }}>{highRisk.length} txn</span>} sub={`${anomalyRate}% dari total — perlu investigasi`} accentColor={RED} />
        <KpiCard label="MEDIUM RISK" value={<span style={{ color: AMBER }}>{medRisk.length} txn</span>} sub={`${enriched.length ? ((medRisk.length / enriched.length) * 100).toFixed(1) : 0}% — perlu pemantauan`} accentColor={AMBER} />
        <KpiCard label="Score Rata-rata" value={<span style={{ color: scores.length ? getRiskColor(scores.reduce((s, v) => s + v, 0) / scores.length) : BNI_BLUE }}>{scores.length ? (scores.reduce((s, v) => s + v, 0) / scores.length * 100).toFixed(1) + "%" : "-"}</span>} sub="Skor anomali rerata keseluruhan" accentColor={TEAL} />
      </div>

      {/* ── Row 1: Scatter + Score Distribution ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Scatter Plot */}
        <ChartCard title="Scatter Plot Anomali" sub="Merah = HIGH RISK · Kuning = MEDIUM · Hijau = NORMAL" badge="Visualisasi">
          <ResponsiveContainer width="100%" height={300}>
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
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: "white", border: `1px solid ${getRiskColor(d.score)}44`, borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>NO {d.NO}</p>
                    <p style={{ margin: "2px 0" }}>Status: <RiskBadge score={d.score} /></p>
                    <p style={{ color: "#64748b", margin: "2px 0" }}>Score: <b style={{ color: getRiskColor(d.score) }}>{(d.score * 100).toFixed(1)}%</b></p>
                    <p style={{ color: "#64748b", margin: "2px 0" }}>Amount: <b>{fmtFull(d.amount)}</b></p>
                    <p style={{ color: "#64748b", margin: "2px 0" }}>Jam: <b>{d.timeLabel}</b></p>
                    <p style={{ color: "#64748b", margin: "2px 0" }}>Tipe: <b>{d.TYPE}</b></p>
                  </div>
                );
              }} />
              <Scatter name="NORMAL"      data={scatterNormal} fill={GREEN}  fillOpacity={0.4} />
              <Scatter name="MEDIUM RISK" data={scatterMed}    fill={AMBER}  fillOpacity={0.75} />
              <Scatter name="HIGH RISK"   data={scatterHigh}   fill={RED}    fillOpacity={0.9} />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 14, marginTop: 8, justifyContent: "center" }}>
            {[["NORMAL", GREEN, normalPts.length], ["MEDIUM RISK", AMBER, medRisk.length], ["HIGH RISK", RED, highRisk.length]].map(([lbl, col, cnt]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />
                {lbl} ({cnt})
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Score Distribution Histogram */}
        <ChartCard title="Distribusi Anomaly Score" sub="Frekuensi skor 0.0 – 1.0" badge="Histogram">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={histData} barCategoryGap="5%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="range" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReferenceLine x={Math.floor(threshold * 20) + ""} stroke={RED} strokeDasharray="4 2" />
              <Tooltip formatter={(v, _, props) => [v + " transaksi", `Score ${props.payload?.range}`]} />
              <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                {histData.map((entry, i) => (
                  <Cell key={i} fill={entry.center >= threshold ? RED : entry.center >= RISK_MED ? AMBER : GREEN} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 8 }}>
            Garis merah = threshold HIGH RISK ({(threshold * 100).toFixed(0)}%)
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: Score Timeline + Hourly Anomaly Rate ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Score Timeline */}
        <ChartCard title="Anomaly Score per Transaksi" sub="Diurutkan berdasarkan waktu — garis merah = threshold" badge="Timeline">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} interval={Math.floor(scoreTimeline.length / 6)} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(0) + "%"} />
              <ReferenceLine y={threshold} stroke={RED} strokeDasharray="4 2" label={{ value: "Threshold", position: "right", fontSize: 10, fill: RED }} />
              <ReferenceLine y={RISK_MED}  stroke={AMBER} strokeDasharray="4 2" />
              <Tooltip formatter={(v, _) => [(v * 100).toFixed(1) + "%", "Anomaly Score"]} labelFormatter={l => "Jam: " + l} />
              <Line type="monotone" dataKey="score" stroke={BNI_BLUE2} strokeWidth={1.5} dot={({ cx, cy, payload }) => (
                <circle cx={cx} cy={cy} r={payload.score >= threshold ? 4 : payload.score >= RISK_MED ? 3 : 2}
                  fill={getRiskColor(payload.score)} fillOpacity={0.9} stroke="white" strokeWidth={1} />
              )} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hourly Anomaly Rate */}
        <ChartCard title="Tingkat Anomali per Jam" sub="% transaksi HIGH RISK dalam tiap jam" badge="Analisis Waktu">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyAnomaly} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v + "%"} />
              <Tooltip formatter={(v, name) => [name === "rate" ? v + "%" : v + " txn", name === "rate" ? "Anomaly Rate" : "Total Txn"]} />
              <Bar dataKey="total" fill={BNI_BLUE2} fillOpacity={0.15} radius={[3, 3, 0, 0]} name="total" />
              <Bar dataKey="rate"  radius={[3, 3, 0, 0]} name="rate">
                {hourlyAnomaly.map((entry, i) => (
                  <Cell key={i} fill={entry.rate > 30 ? RED : entry.rate > 10 ? AMBER : GREEN} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", marginTop: 8 }}>
            {[["Biru (latar): Total txn", BNI_BLUE2], ["Warna: Anomaly Rate %", RED]].map(([lbl, col]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />{lbl}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Top Anomaly Cards ── */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="🚨 Top Transaksi Mencurigakan" sub="6 transaksi dengan anomaly score tertinggi" badge="Alert">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {topAnomaly.map((p, i) => <AnomalyCard key={p.NO + i} point={p} rank={i + 1} />)}
          </div>
        </ChartCard>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>Detail transaksi + anomaly score</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Diurutkan dari skor tertinggi</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {[["ALL", "Semua"], ["HIGH", "HIGH RISK"], ["MEDIUM", "MEDIUM"], ["NORMAL", "NORMAL"]].map(([v, lbl]) => (
              <button key={v} onClick={() => { setFilterRisk(v); setTablePage(1); }} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: "1px solid " + (filterRisk === v ? (v === "HIGH" ? RED : v === "MEDIUM" ? AMBER : v === "NORMAL" ? GREEN : BNI_BLUE2) : "#e2e8f0"),
                background: filterRisk === v ? (v === "HIGH" ? RED : v === "MEDIUM" ? AMBER : v === "NORMAL" ? GREEN : BNI_BLUE2) : "white",
                color: filterRisk === v ? "white" : "#64748b",
              }}>{lbl}</button>
            ))}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "Status", "NO", "Jam", "Teller", "Tran Code", "SYS", "Amount", "Tipe", "Score", "Bar"].map(h => (
                  <th key={h} style={{ textAlign: ["Amount", "Score"].includes(h) ? "right" : "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>Tidak ada data</td></tr>
              ) : pageData.map((r, i) => (
                <tr key={r.NO + "-" + i}
                  style={{ borderBottom: "1px solid #f1f5f9", background: r.score >= threshold ? "#fef2f2" : r.score >= RISK_MED ? "#fffbeb" : "" }}
                  onMouseEnter={e => e.currentTarget.style.background = r.score >= threshold ? "#fee2e2" : r.score >= RISK_MED ? "#fef3c7" : "#f8fafc"}
                  onMouseLeave={e => e.currentTarget.style.background = r.score >= threshold ? "#fef2f2" : r.score >= RISK_MED ? "#fffbeb" : ""}
                >
                  <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 11 }}>{(tablePage - 1) * PER_PAGE + i + 1}</td>
                  <td style={{ padding: "8px 12px" }}><RiskBadge score={r.score} /></td>
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
                  <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700, color: getRiskColor(r.score) }}>
                    {(r.score * 100).toFixed(1)}%
                  </td>
                  <td style={{ padding: "8px 12px", minWidth: 80 }}>
                    <ScoreBar score={r.score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Hal {tablePage}/{totalPages} — {(tablePage - 1) * PER_PAGE + 1}–{Math.min(tablePage * PER_PAGE, tableData.length)} dari {tableData.length} baris
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagiBtn disabled={tablePage <= 1} onClick={() => setTablePage(p => Math.max(1, p - 1))}>← Prev</PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(tablePage - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? <PagiBtn key={p} active={p === tablePage} onClick={() => setTablePage(p)}>{p}</PagiBtn> : null;
            })}
            <PagiBtn disabled={tablePage >= totalPages} onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}>Next →</PagiBtn>
          </div>
        </div>
      </div>

      {/* ── Comparison Panel ── */}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="📊 Perbandingan Metode Anomaly Detection" sub="Isolation Forest vs DBSCAN vs metode statistik" badge="Referensi Akademik">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              {
                title: "Isolation Forest", color: RED, icon: "🌲",
                pros: ["Tidak perlu distribusi data (non-parametric)", "Sangat efisien O(n log n)", "Tidak terpengaruh outlier masif", "Cocok untuk high-dimensional data"],
                cons: ["Stochastic (hasil bisa berbeda tiap run)", "Tidak memberi penjelasan 'mengapa' anomali"],
              },
              {
                title: "DBSCAN (Noise)", color: BNI_BLUE2, icon: "🔍",
                pros: ["Noise point = anomali secara natural", "Berbasis density — intuitif", "Tidak perlu threshold eksplisit"],
                cons: ["Perlu tuning ε dan minPts", "Tidak ada skor numerik (hanya biner)", "Sensitif terhadap skala fitur"],
              },
              {
                title: "Z-Score / Statistik", color: TEAL, icon: "📐",
                pros: ["Sederhana dan explainable", "Asumsi distribusi normal", "Threshold berdasarkan std dev"],
                cons: ["Gagal untuk data non-normal", "Tidak bisa menangkap pola multivariat", "Sensitif terhadap outlier masif"],
              },
            ].map(({ title, color, icon, pros, cons }) => (
              <div key={title} style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: `1px solid ${color}22` }}>
                <div style={{ fontWeight: 700, color, fontSize: 13, marginBottom: 10 }}>{icon} {title}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: GREEN, textTransform: "uppercase", marginBottom: 4 }}>Kelebihan</div>
                {pros.map((p, i) => <div key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 4, display: "flex", gap: 6 }}><span style={{ color: GREEN }}>▸</span>{p}</div>)}
                <div style={{ fontSize: 10, fontWeight: 700, color: RED, textTransform: "uppercase", margin: "10px 0 4px" }}>Kekurangan</div>
                {cons.map((c, i) => <div key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 4, display: "flex", gap: 6 }}><span style={{ color: RED }}>▸</span>{c}</div>)}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
        © 2025 BNI Life Insurance — Isolation Forest Anomaly Detection Dashboard
      </p>
    </div>
  );
}