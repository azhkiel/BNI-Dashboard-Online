import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  Cell, ReferenceLine,
} from "recharts";
import {
  ShieldAlert, RefreshCw, BookOpen, Trees, AlertTriangle,
  CheckCircle2, Activity, Clock, TrendingUp, Layers,
  ChevronLeft, ChevronRight, Info, Zap, Database,
  BarChart2, ArrowUpRight, Circle,
} from "lucide-react";

// ── DESIGN TOKENS (BNI Style Guide) ────────────────────────────────────────
const C = {
  darkBlue  : "#002960",
  blue      : "#003F87",
  orange    : "#F37021",
  teal      : "#00A99D",
  pageBg    : "#F0F4FA",
  cardBg    : "#FFFFFF",
  badgeBg   : "#EEF4FF",
  inputBg   : "#F8FAFC",
  mutedText : "#94a3b8",
  bodyText  : "#64748b",
  border    : "rgba(0,63,135,0.07)",
  cardShadow: "0 2px 20px rgba(0,63,135,0.07)",
  // Risk
  red       : "#dc2626",
  redBg     : "#fee2e2",
  redText   : "#991b1b",
  amber     : "#d97706",
  amberBg   : "#fef3c7",
  amberText : "#92400e",
  green     : "#16a34a",
  greenBg   : "#dcfce7",
  greenText : "#166534",
};

// ── CONSTANTS ───────────────────────────────────────────────────────────────
const RISK_HIGH = 0.65;
const RISK_MED  = 0.50;
const PER_PAGE  = 20;

// ── HELPERS ─────────────────────────────────────────────────────────────────
const fmtIDR = (n) => {
  if (n >= 1e9) return "Rp " + (n / 1e9).toFixed(2) + "M";
  if (n >= 1e6) return "Rp " + (n / 1e6).toFixed(2) + "jt";
  return "Rp " + Math.round(n).toLocaleString("id-ID");
};
const fmtFull = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const parseTimeToHour = (timeStr) => {
  const parts = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const [h, m] = parts.substring(0, 5).split(":").map(Number);
  return h + m / 60;
};

// ── ISOLATION FOREST ─────────────────────────────────────────────────────────
function randomBetween(min, max) { return min + Math.random() * (max - min); }

function buildITree(data, indices, depth, maxDepth) {
  if (indices.length <= 1 || depth >= maxDepth)
    return { isLeaf: true, size: indices.length };
  const featureIdx = Math.floor(Math.random() * data[0].length);
  const values = indices.map(i => data[i][featureIdx]);
  const minVal = Math.min(...values), maxVal = Math.max(...values);
  if (minVal === maxVal) return { isLeaf: true, size: indices.length };
  const splitVal = randomBetween(minVal, maxVal);
  return {
    isLeaf: false, featureIdx, splitVal,
    left:  buildITree(data, indices.filter(i => data[i][featureIdx] <  splitVal), depth + 1, maxDepth),
    right: buildITree(data, indices.filter(i => data[i][featureIdx] >= splitVal), depth + 1, maxDepth),
  };
}

function cFactor(n) {
  if (n <= 1) return 0;
  if (n === 2) return 1;
  return 2 * (Math.log(n - 1) + 0.5772156649) - (2 * (n - 1) / n);
}

function pathLength(point, node, depth) {
  if (node.isLeaf) return depth + cFactor(node.size);
  return pathLength(point, node[point[node.featureIdx] < node.splitVal ? "left" : "right"], depth + 1);
}

function runIsolationForest(data, numTrees = 100, sampleSize = 256) {
  if (!data.length) return [];
  const n = data.length;
  const actualSample = Math.min(sampleSize, n);
  const maxDepth = Math.ceil(Math.log2(actualSample));
  const trees = Array.from({ length: numTrees }, () => {
    const sampleIndices = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, actualSample);
    return buildITree(data, sampleIndices, 0, maxDepth);
  });
  const cf = cFactor(actualSample);
  return data.map(point => {
    const avgPath = trees.reduce((s, t) => s + pathLength(point, t, 0), 0) / numTrees;
    return +Math.pow(2, -avgPath / cf).toFixed(4);
  });
}

// ── RISK UTILITIES ───────────────────────────────────────────────────────────
const getRiskLevel = (s) => s >= RISK_HIGH ? "HIGH" : s >= RISK_MED ? "MEDIUM" : "NORMAL";
const getRiskColor = (s) => s >= RISK_HIGH ? C.red : s >= RISK_MED ? C.amber : C.green;
const getRiskBg    = (s) => s >= RISK_HIGH ? C.redBg : s >= RISK_MED ? C.amberBg : C.greenBg;
const getRiskText  = (s) => s >= RISK_HIGH ? C.redText : s >= RISK_MED ? C.amberText : C.greenText;

// ── SHARED STYLES ────────────────────────────────────────────────────────────
const card = {
  background: C.cardBg,
  borderRadius: 18,
  border: `1px solid ${C.border}`,
  boxShadow: C.cardShadow,
  padding: "24px",
  transition: "all 200ms",
};

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function RiskBadge({ score }) {
  const level = getRiskLevel(score);
  const Icon = level === "HIGH" ? AlertTriangle : level === "MEDIUM" ? Activity : CheckCircle2;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 10, fontWeight: 700,
      background: getRiskBg(score), color: getRiskText(score),
      border: `1px solid ${getRiskColor(score)}44`,
      whiteSpace: "nowrap",
    }}>
      <Icon size={10} />
      {level === "HIGH" ? "HIGH RISK" : level === "MEDIUM" ? "MEDIUM" : "NORMAL"}
    </span>
  );
}

function ScoreBar({ score }) {
  return (
    <div style={{ width: "100%", height: 6, background: "#f1f5f9", borderRadius: 999, overflow: "hidden" }}>
      <div style={{
        height: "100%", width: `${(score * 100).toFixed(1)}%`,
        background: `linear-gradient(90deg, ${C.green}, ${C.amber}, ${C.red})`,
        borderRadius: 999, transition: "width .3s",
      }} />
    </div>
  );
}

function KpiCard({ label, value, sub, accentColor, icon: Icon }) {
  return (
    <div
      style={{ ...card, position: "relative", overflow: "hidden" }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(0,63,135,0.11)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = C.cardShadow; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: accentColor, borderRadius: "18px 18px 0 0" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <p style={{ fontSize: 10, fontWeight: 700, color: C.mutedText, textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</p>
        {Icon && (
          <div style={{ width: 36, height: 36, borderRadius: 10, background: accentColor + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={16} color={accentColor} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.darkBlue, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mutedText, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, badge, children, noPad }) {
  return (
    <div style={{ ...card, padding: noPad ? "24px 24px 0" : "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 15 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: C.mutedText, marginTop: 3 }}>{sub}</div>}
        </div>
        {badge && (
          <span style={{
            fontSize: 11, fontWeight: 700, padding: "4px 12px",
            borderRadius: 999, background: C.badgeBg, color: C.blue, whiteSpace: "nowrap",
          }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function PagiBtn({ children, onClick, disabled, active }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: "4px 10px", fontSize: 11, borderRadius: 6,
      cursor: disabled ? "default" : "pointer",
      border: `1px solid ${active ? C.blue : "#e2e8f0"}`,
      background: active ? C.blue : "white",
      color: active ? "white" : disabled ? "#cbd5e1" : "#334155",
      display: "flex", alignItems: "center", gap: 3,
    }}>{children}</button>
  );
}

function AnomalyCard({ point, rank }) {
  const color = getRiskColor(point.score);
  const level = getRiskLevel(point.score);
  return (
    <div style={{
      borderRadius: 14, padding: "16px",
      border: `1px solid ${color}33`,
      background: level === "HIGH" ? "#fef2f2" : level === "MEDIUM" ? "#fffbeb" : "white",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: 8, right: 10,
        fontSize: 28, opacity: 0.06, fontWeight: 900, color: C.darkBlue,
      }}>#{rank}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 13, color: C.darkBlue }}>NO {point.NO}</div>
          <div style={{ fontSize: 10, color: C.mutedText, marginTop: 2 }}>{point.timeLabel} · {point.TRAN_CODE}</div>
        </div>
        <RiskBadge score={point.score} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.darkBlue, marginBottom: 10 }}>{fmtFull(point.amount)}</div>
      <ScoreBar score={point.score} />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 10, color: C.mutedText }}>Anomaly Score</span>
        <span style={{ fontSize: 11, fontWeight: 800, color }}>{(point.score * 100).toFixed(1)}%</span>
      </div>
      <div style={{ display: "flex", gap: 5, marginTop: 10, flexWrap: "wrap" }}>
        {[
          [point.TYPE, point.TYPE === "CR" ? C.greenBg : C.redBg, point.TYPE === "CR" ? C.greenText : C.redText],
          [point.SYS, "#dbeafe", "#1e40af"],
          [point.TELLER, "#f1f5f9", "#475569"],
        ].map(([label, bg, col]) => (
          <span key={label} style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 999,
            fontWeight: 600, background: bg, color: col,
          }}>{label}</span>
        ))}
      </div>
    </div>
  );
}

function TheoryPanel() {
  const items = [
    { Icon: Trees,       term: "Isolation Tree",  desc: "Pohon biner acak yang mempartisi data. Setiap node memilih fitur & split value secara random." },
    { Icon: ArrowUpRight,term: "Path Length",     desc: "Berapa banyak split dibutuhkan untuk mengisolasi satu titik. Anomali memiliki path yang lebih pendek." },
    { Icon: Zap,         term: "Anomaly Score",   desc: "score = 2^(−avgPath / c(n)). Mendekati 1 = anomali, mendekati 0 = normal." },
    { Icon: BarChart2,   term: "c(n) Factor",     desc: "Panjang path rata-rata pada BST gagal: 2H(n-1) − 2(n-1)/n. Normalisasi skor." },
    { Icon: Layers,      term: "Forest",          desc: "Rata-rata path length dari banyak tree (default 100). Semakin banyak tree → semakin stabil." },
    { Icon: Database,    term: "Sub-sampling",    desc: "Tiap tree hanya menggunakan subset data (default 256). Efisien dan mengurangi overfitting." },
  ];
  return (
    <ChartCard title="Konsep Isolation Forest" sub="Liu et al. (2008) — Anomaly detection berbasis isolasi" badge="Teori">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
        {items.map(({ Icon, term, desc }) => (
          <div key={term} style={{ background: C.pageBg, borderRadius: 12, padding: "14px", border: `1px solid ${C.border}` }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: C.badgeBg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <Icon size={15} color={C.blue} />
            </div>
            <div style={{ fontWeight: 700, fontSize: 12, color: C.darkBlue, marginBottom: 4 }}>{term}</div>
            <div style={{ fontSize: 11, color: C.bodyText, lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.darkBlue}, ${C.blue})`, borderRadius: 12, padding: "14px 18px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <Info size={14} color={C.orange} style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, margin: 0 }}>
            <b style={{ color: "white" }}>Keunggulan Isolation Forest:</b> Kompleksitas O(n log n), tidak membutuhkan label (unsupervised), tidak sensitif terhadap distribusi data, dan sangat efisien untuk data berdimensi tinggi. Sangat cocok untuk{" "}
            <b style={{ color: C.orange }}>deteksi fraud perbankan real-time.</b>
          </p>
        </div>
      </div>
    </ChartCard>
  );
}

// ── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "white", border: `1px solid ${getRiskColor(d.score)}33`,
      borderRadius: 12, padding: "12px 14px", fontSize: 12,
      boxShadow: "0 8px 24px rgba(0,0,0,0.10)",
    }}>
      <p style={{ fontWeight: 800, color: C.darkBlue, marginBottom: 6 }}>NO {d.NO}</p>
      <div style={{ marginBottom: 4 }}><RiskBadge score={d.score} /></div>
      <p style={{ color: C.bodyText, margin: "4px 0" }}>Score: <b style={{ color: getRiskColor(d.score) }}>{(d.score * 100).toFixed(1)}%</b></p>
      <p style={{ color: C.bodyText, margin: "4px 0" }}>Amount: <b>{fmtFull(d.amount)}</b></p>
      <p style={{ color: C.bodyText, margin: "4px 0" }}>Jam: <b>{d.timeLabel}</b></p>
      <p style={{ color: C.bodyText, margin: "4px 0" }}>Tipe: <b>{d.TYPE}</b></p>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function IsolationForestDashboard({ data: propData = [], loading = false }) {
  const [numTrees,   setNumTrees]   = useState(100);
  const [sampleSize, setSampleSize] = useState(256);
  const [threshold,  setThreshold]  = useState(RISK_HIGH);
  const [filterRisk, setFilterRisk] = useState("ALL");
  const [showTheory, setShowTheory] = useState(false);
  const [tablePage,  setTablePage]  = useState(1);
  const [runSeed,    setRunSeed]    = useState(0);

  // Prepare points
  const points = useMemo(() => propData.map((r, idx) => {
    const timeStr = r.TIME || "00:00";
    return {
      ...r, amount: Number(r.AMOUNT), idx,
      time: parseTimeToHour(timeStr),
      timeLabel: timeStr.includes(" ") ? timeStr.split(" ")[1]?.substring(0, 5) : timeStr.substring(0, 5),
    };
  }), [propData]);

  // Normalize
  const normalized = useMemo(() => {
    if (!points.length) return [];
    const amounts = points.map(p => p.amount), times = points.map(p => p.time);
    const [minA, maxA] = [Math.min(...amounts), Math.max(...amounts)];
    const [minT, maxT] = [Math.min(...times),   Math.max(...times)];
    const rA = maxA - minA || 1, rT = maxT - minT || 1;
    return points.map(p => [(p.amount - minA) / rA, (p.time - minT) / rT]);
  }, [points]);

  // Run IF
  const scores = useMemo(() => {
    void runSeed;
    return runIsolationForest(normalized, numTrees, sampleSize);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, numTrees, sampleSize, runSeed]);

  // Enrich
  const enriched = useMemo(() =>
    points.map((p, i) => ({ ...p, score: scores[i] ?? 0, risk: getRiskLevel(scores[i] ?? 0) })),
    [points, scores]
  );

  // Stats
  const highRisk   = useMemo(() => enriched.filter(p => p.score >= threshold),                    [enriched, threshold]);
  const medRisk    = useMemo(() => enriched.filter(p => p.score >= RISK_MED && p.score < threshold), [enriched, threshold]);
  const normalPts  = useMemo(() => enriched.filter(p => p.score < RISK_MED),                      [enriched]);
  const topAnomaly = useMemo(() => [...enriched].sort((a, b) => b.score - a.score).slice(0, 6),   [enriched]);
  const avgScore   = useMemo(() => scores.length ? scores.reduce((s, v) => s + v, 0) / scores.length : 0, [scores]);

  // Scatter
  const scatterHigh   = useMemo(() => highRisk.map(p  => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(3) })), [highRisk]);
  const scatterMed    = useMemo(() => medRisk.map(p   => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(3) })), [medRisk]);
  const scatterNormal = useMemo(() => normalPts.map(p => ({ ...p, x: +p.time.toFixed(3), y: +(p.amount / 1e6).toFixed(3) })), [normalPts]);

  // Histogram
  const histData = useMemo(() => {
    const bins = 20;
    const arr  = Array.from({ length: bins }, (_, i) => ({ range: `${(i/bins).toFixed(2)}–${((i+1)/bins).toFixed(2)}`, center: (i+0.5)/bins, count: 0 }));
    scores.forEach(s => { const bin = Math.min(bins - 1, Math.floor(s * bins)); arr[bin].count++; });
    return arr;
  }, [scores]);

  // Score timeline
  const scoreTimeline = useMemo(() =>
    [...enriched].sort((a, b) => a.time - b.time).map((p, i) => ({ i, timeLabel: p.timeLabel, score: p.score, amount: p.amount, NO: p.NO, risk: p.risk })),
    [enriched]
  );

  // Hourly anomaly rate
  const hourlyAnomaly = useMemo(() => {
    const map = {};
    enriched.forEach(p => {
      const h = Math.floor(p.time);
      if (!map[h]) map[h] = { hour: h + ":00", total: 0, anomaly: 0 };
      map[h].total++;
      if (p.score >= threshold) map[h].anomaly++;
    });
    return Object.values(map).sort((a, b) => parseInt(a.hour) - parseInt(b.hour))
      .map(d => ({ ...d, rate: d.total ? +((d.anomaly / d.total) * 100).toFixed(1) : 0 }));
  }, [enriched, threshold]);

  // Table
  const tableData = useMemo(() => {
    setTablePage(1);
    const sorted = {
      HIGH:   [...enriched].filter(p => p.score >= threshold).sort((a, b) => b.score - a.score),
      MEDIUM: [...enriched].filter(p => p.score >= RISK_MED && p.score < threshold).sort((a, b) => b.score - a.score),
      NORMAL: enriched.filter(p => p.score < RISK_MED),
    };
    return sorted[filterRisk] ?? [...enriched].sort((a, b) => b.score - a.score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enriched, filterRisk, threshold]);

  const totalPages = Math.max(1, Math.ceil(tableData.length / PER_PAGE));
  const pageData   = tableData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);
  const anomalyRate = enriched.length ? ((highRisk.length / enriched.length) * 100).toFixed(1) : 0;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: C.pageBg }}>
      <div style={{ textAlign: "center" }}>
        <Trees size={40} color={C.blue} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: C.bodyText }}>Membangun Isolation Forest...</div>
      </div>
    </div>
  );

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: "24px 28px 48px", background: C.pageBg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.darkBlue} 0%, ${C.blue} 100%)`,
        borderRadius: 18, padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, position: "relative", overflow: "hidden",
      }}>
        {/* decorative circles */}
        <div style={{ position: "absolute", right: -40, top: -40, width: 176, height: 176, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", right: 64, bottom: -56, width: 144, height: 144, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        {/* accent: red tint since it's a risk/fraud dashboard */}
        <div style={{ position: "absolute", left: "38%", top: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(220,38,38,0.08)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <ShieldAlert size={22} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}>
              Dashboard Isolation Forest
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 3 }}>
              Deteksi anomali & fraud transaksi — Liu et al. (2008)
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, position: "relative", zIndex: 1 }}>
          <button onClick={() => setRunSeed(s => s + 1)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 10, border: "none", cursor: "pointer",
            fontWeight: 700, fontSize: 12,
            background: `linear-gradient(135deg, ${C.orange} 0%, #e05800 100%)`,
            color: "white", boxShadow: "0 6px 20px rgba(243,112,33,0.35)",
          }}>
            <RefreshCw size={13} />
            Re-run Forest
          </button>
          <button onClick={() => setShowTheory(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderRadius: 10, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.2)",
            background: showTheory ? C.teal : "rgba(255,255,255,0.1)",
            color: "white", fontSize: 12, fontWeight: 700,
          }}>
            <BookOpen size={13} />
            Teori
          </button>
        </div>
      </div>

      {/* ── PARAMETER CONTROLS ── */}
      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: C.darkBlue, fontSize: 15 }}>
              <Layers size={15} color={C.blue} />
              Parameter Isolation Forest
            </div>
            <div style={{ fontSize: 11, color: C.mutedText, marginTop: 3 }}>
              Klik "Re-run Forest" setelah mengubah parameter untuk hasil baru
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "5px 12px", borderRadius: 999, background: C.redBg, color: C.redText, fontWeight: 700 }}>
              <AlertTriangle size={11} />{highRisk.length} HIGH RISK ({anomalyRate}%)
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, padding: "5px 12px", borderRadius: 999, background: C.amberBg, color: C.amberText, fontWeight: 700 }}>
              <Activity size={11} />{medRisk.length} MEDIUM
            </span>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 28 }}>
          {[
            { label: "Jumlah Trees", value: numTrees,   min: 10,  max: 200, step: 10,   set: setNumTrees,   hint: "Makin banyak tree → skor lebih stabil (tapi lebih lambat)", color: C.blue },
            { label: "Sample Size per Tree", value: sampleSize, min: 32,  max: 512, step: 32,  set: setSampleSize, hint: "Default 256. Lebih kecil → lebih cepat, kurang presisi",     color: C.teal },
            { label: `Threshold HIGH RISK`, value: threshold,  min: 0.5, max: 0.9, step: 0.01, set: setThreshold,  hint: "Transaksi dengan score ≥ threshold dianggap HIGH RISK",      color: C.red  },
          ].map(({ label, value, min, max, step, set, hint, color }) => (
            <div key={label}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.darkBlue }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color, background: color + "15", padding: "2px 10px", borderRadius: 8 }}>
                  {value < 1 ? (value * 100).toFixed(0) + "%" : value}
                </span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value}
                onChange={e => set(Number(e.target.value))}
                style={{ width: "100%", accentColor: color, height: 4 }}
              />
              <div style={{ fontSize: 10, color: C.mutedText, marginTop: 5 }}>{hint}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── THEORY ── */}
      {showTheory && <div style={{ marginBottom: 20 }}><TheoryPanel /></div>}

      {/* ── KPI CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="Total Transaksi"  value={enriched.length + " txn"} sub={`${numTrees} trees · sample ${sampleSize}`} accentColor={C.blue}   icon={Database} />
        <KpiCard label="High Risk"        value={<span style={{ color: C.red }}>{highRisk.length} txn</span>}  sub={`${anomalyRate}% dari total — perlu investigasi`}  accentColor={C.red}    icon={AlertTriangle} />
        <KpiCard label="Medium Risk"      value={<span style={{ color: C.amber }}>{medRisk.length} txn</span>} sub={`${enriched.length ? ((medRisk.length / enriched.length) * 100).toFixed(1) : 0}% — perlu pemantauan`} accentColor={C.amber} icon={Activity} />
        <KpiCard label="Score Rata-rata"  value={<span style={{ color: scores.length ? getRiskColor(avgScore) : C.darkBlue }}>{scores.length ? (avgScore * 100).toFixed(1) + "%" : "—"}</span>} sub="Skor anomali rerata keseluruhan" accentColor={C.teal} icon={TrendingUp} />
      </div>

      {/* ── ROW 1: SCATTER + HISTOGRAM ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Scatter */}
        <ChartCard title="Scatter Plot Anomali" sub="Merah = HIGH RISK · Kuning = MEDIUM · Hijau = NORMAL" badge="Visualisasi">
          <ResponsiveContainer width="100%" height={300}>
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
              <Scatter name="NORMAL"      data={scatterNormal} fill={C.green} fillOpacity={0.4} />
              <Scatter name="MEDIUM RISK" data={scatterMed}    fill={C.amber} fillOpacity={0.75} />
              <Scatter name="HIGH RISK"   data={scatterHigh}   fill={C.red}   fillOpacity={0.9} />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, marginTop: 10, justifyContent: "center" }}>
            {[[C.green, "NORMAL", normalPts.length], [C.amber, "MEDIUM RISK", medRisk.length], [C.red, "HIGH RISK", highRisk.length]].map(([col, lbl, cnt]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.bodyText }}>
                <Circle size={9} fill={col} color={col} />
                {lbl} ({cnt})
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Histogram */}
        <ChartCard title="Distribusi Anomaly Score" sub="Frekuensi skor 0.0 – 1.0" badge="Histogram">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={histData} barCategoryGap="5%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="range" tick={false} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.mutedText }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReferenceLine x={Math.floor(threshold * 20) + ""} stroke={C.red} strokeDasharray="4 2" />
              <Tooltip formatter={(v, _, p) => [v + " transaksi", `Score ${p.payload?.range}`]} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {histData.map((e, i) => (
                  <Cell key={i} fill={e.center >= threshold ? C.red : e.center >= RISK_MED ? C.amber : C.green} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", fontSize: 11, color: C.mutedText, marginTop: 8 }}>
            Garis merah = threshold HIGH RISK ({(threshold * 100).toFixed(0)}%)
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 2: TIMELINE + HOURLY RATE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Timeline */}
        <ChartCard title="Anomaly Score per Transaksi" sub="Diurutkan berdasarkan waktu" badge="Timeline">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={scoreTimeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: C.mutedText }} axisLine={false} tickLine={false} interval={Math.floor(scoreTimeline.length / 6)} />
              <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: C.mutedText }} axisLine={false} tickLine={false} tickFormatter={v => (v * 100).toFixed(0) + "%"} />
              <ReferenceLine y={threshold} stroke={C.red}   strokeDasharray="4 2" label={{ value: "Threshold", position: "right", fontSize: 10, fill: C.red }} />
              <ReferenceLine y={RISK_MED}  stroke={C.amber} strokeDasharray="4 2" />
              <Tooltip formatter={(v) => [(v * 100).toFixed(1) + "%", "Anomaly Score"]} labelFormatter={l => "Jam: " + l} />
              <Line type="monotone" dataKey="score" stroke={C.blue} strokeWidth={1.5}
                dot={({ cx, cy, payload }) => (
                  <circle cx={cx} cy={cy}
                    r={payload.score >= threshold ? 4 : payload.score >= RISK_MED ? 3 : 2}
                    fill={getRiskColor(payload.score)} fillOpacity={0.9} stroke="white" strokeWidth={1} />
                )}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Hourly Anomaly Rate */}
        <ChartCard title="Tingkat Anomali per Jam" sub="% transaksi HIGH RISK dalam tiap jam" badge="Analisis Waktu">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={hourlyAnomaly} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false} tickFormatter={v => v + "%"} />
              <Tooltip formatter={(v, name) => [name === "rate" ? v + "%" : v + " txn", name === "rate" ? "Anomaly Rate" : "Total Txn"]} />
              <Bar dataKey="total" fill={C.blue} fillOpacity={0.12} radius={[4, 4, 0, 0]} name="total" />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]} name="rate">
                {hourlyAnomaly.map((e, i) => (
                  <Cell key={i} fill={e.rate > 30 ? C.red : e.rate > 10 ? C.amber : C.green} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
            {[[C.blue, "Biru (latar): Total txn"], [C.red, "Warna: Anomaly Rate %"]].map(([col, lbl]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.bodyText }}>
                <Circle size={9} fill={col} color={col} />{lbl}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── TOP ANOMALY CARDS ── */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Top Transaksi Mencurigakan" sub="6 transaksi dengan anomaly score tertinggi" badge="Alert">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {topAnomaly.map((p, i) => <AnomalyCard key={p.NO + i} point={p} rank={i + 1} />)}
          </div>
        </ChartCard>
      </div>

      {/* ── TABLE ── */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: C.darkBlue, fontSize: 15 }}>
              <BarChart2 size={15} color={C.blue} />
              Detail Transaksi + Anomaly Score
            </div>
            <div style={{ fontSize: 11, color: C.mutedText, marginTop: 3 }}>Diurutkan dari skor tertinggi</div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {[["ALL", "Semua", C.blue], ["HIGH", "HIGH RISK", C.red], ["MEDIUM", "MEDIUM", C.amber], ["NORMAL", "NORMAL", C.green]].map(([v, lbl, col]) => (
              <button key={v} onClick={() => { setFilterRisk(v); setTablePage(1); }} style={{
                padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${filterRisk === v ? col : "#e2e8f0"}`,
                background: filterRisk === v ? col : "white",
                color: filterRisk === v ? "white" : C.bodyText,
              }}>{lbl}</button>
            ))}
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.pageBg }}>
                {["#", "Status", "NO", "Jam", "Teller", "Tran Code", "SYS", "Amount", "Tipe", "Score", "Bar"].map(h => (
                  <th key={h} style={{
                    textAlign: ["Amount", "Score"].includes(h) ? "right" : "left",
                    padding: "9px 12px", fontSize: 10, fontWeight: 700, color: C.mutedText,
                    textTransform: "uppercase", letterSpacing: "0.10em",
                    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.length === 0 ? (
                <tr><td colSpan={11} style={{ padding: "32px", textAlign: "center", color: C.mutedText }}>Tidak ada data</td></tr>
              ) : pageData.map((r, i) => (
                <tr key={r.NO + "-" + i}
                  style={{ borderBottom: `1px solid ${C.border}`, background: r.score >= threshold ? "#fef2f2" : r.score >= RISK_MED ? "#fffbeb" : "", transition: "background .15s" }}
                  onMouseEnter={e => e.currentTarget.style.background = r.score >= threshold ? "#fee2e2" : r.score >= RISK_MED ? "#fef3c7" : C.pageBg}
                  onMouseLeave={e => e.currentTarget.style.background  = r.score >= threshold ? "#fef2f2" : r.score >= RISK_MED ? "#fffbeb" : ""}
                >
                  <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 11 }}>{(tablePage - 1) * PER_PAGE + i + 1}</td>
                  <td style={{ padding: "8px 12px" }}><RiskBadge score={r.score} /></td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.NO}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", whiteSpace: "nowrap" }}>{r.timeLabel}</td>
                  <td style={{ padding: "8px 12px", color: "#334155", fontFamily: "monospace", fontSize: 11 }}>{r.TELLER}</td>
                  <td style={{ padding: "8px 12px", color: "#334155" }}>{r.TRAN_CODE}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                      background: r.SYS === "BOR" ? "#dbeafe" : "#fef9c3",
                      color: r.SYS === "BOR" ? "#1e40af" : "#854d0e",
                    }}>{r.SYS}</span>
                  </td>
                  <td style={{ padding: "8px 12px", color: "#334155", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{fmtFull(r.amount)}</td>
                  <td style={{ padding: "8px 12px" }}>
                    <span style={{
                      padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                      background: r.TYPE === "CR" ? C.greenBg : C.redBg,
                      color: r.TYPE === "CR" ? C.greenText : C.redText,
                    }}>{r.TYPE}</span>
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

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.mutedText }}>
            Hal {tablePage}/{totalPages} — {(tablePage - 1) * PER_PAGE + 1}–{Math.min(tablePage * PER_PAGE, tableData.length)} dari {tableData.length} baris
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagiBtn disabled={tablePage <= 1} onClick={() => setTablePage(p => Math.max(1, p - 1))}>
              <ChevronLeft size={12} />Prev
            </PagiBtn>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(tablePage - 2, totalPages - 4));
              const p = start + i;
              return p <= totalPages ? (
                <PagiBtn key={p} active={p === tablePage} onClick={() => setTablePage(p)}>{p}</PagiBtn>
              ) : null;
            })}
            <PagiBtn disabled={tablePage >= totalPages} onClick={() => setTablePage(p => Math.min(totalPages, p + 1))}>
              Next<ChevronRight size={12} />
            </PagiBtn>
          </div>
        </div>
      </div>

      {/* ── COMPARISON PANEL ── */}
      <div style={{ marginTop: 16 }}>
        <ChartCard title="Perbandingan Metode Anomaly Detection" sub="Isolation Forest vs DBSCAN vs metode statistik" badge="Referensi Akademik">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              {
                title: "Isolation Forest", color: C.red, Icon: Trees,
                pros: ["Tidak perlu distribusi data (non-parametric)", "Sangat efisien O(n log n)", "Tidak terpengaruh outlier masif", "Cocok untuk high-dimensional data"],
                cons: ["Stochastic (hasil bisa berbeda tiap run)", "Tidak memberi penjelasan 'mengapa' anomali"],
              },
              {
                title: "DBSCAN (Noise)", color: C.blue, Icon: Database,
                pros: ["Noise point = anomali secara natural", "Berbasis density — intuitif", "Tidak perlu threshold eksplisit"],
                cons: ["Perlu tuning ε dan minPts", "Tidak ada skor numerik (hanya biner)", "Sensitif terhadap skala fitur"],
              },
              {
                title: "Z-Score / Statistik", color: C.teal, Icon: BarChart2,
                pros: ["Sederhana dan explainable", "Asumsi distribusi normal", "Threshold berdasarkan std dev"],
                cons: ["Gagal untuk data non-normal", "Tidak bisa menangkap pola multivariat", "Sensitif terhadap outlier masif"],
              },
            ].map(({ title, color, Icon, pros, cons }) => (
              <div key={title} style={{ background: C.pageBg, borderRadius: 12, padding: "16px", border: `1px solid ${color}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700, color, fontSize: 13, marginBottom: 12 }}>
                  <div style={{ width: 28, height: 28, borderRadius: 8, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={14} color={color} />
                  </div>
                  {title}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>Kelebihan</div>
                {pros.map((p, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 5, display: "flex", gap: 6 }}>
                    <CheckCircle2 size={11} color={C.green} style={{ marginTop: 1, flexShrink: 0 }} />{p}
                  </div>
                ))}
                <div style={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: "0.1em", margin: "10px 0 6px" }}>Kekurangan</div>
                {cons.map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 5, display: "flex", gap: 6 }}>
                    <AlertTriangle size={11} color={C.red} style={{ marginTop: 1, flexShrink: 0 }} />{c}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: 11, color: C.mutedText, marginTop: 28 }}>
        © 2025 BNI Life Insurance — Isolation Forest Anomaly Detection Dashboard
      </p>
    </div>
  );
}