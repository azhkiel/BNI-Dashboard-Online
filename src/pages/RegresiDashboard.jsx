import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ReferenceLine,
} from "recharts";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const BNI_BLUE  = "#002960";
const BNI_BLUE2 = "#003F87";
const BNI_ORANGE = "#F37021";
const RED   = "#dc2626";
const GREEN = "#16a34a";
const PURPLE = "#7c3aed";
const PER_PAGE = 20;

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

// ── REGRESSION ALGORITHMS (Pure JS) ───────────────────────────────────────

/** Simple Linear Regression: y = a + bx */
function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { a: 0, b: 0, r2: 0 };
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const ssXY  = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const ssXX  = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const b = ssXX ? ssXY / ssXX : 0;
  const a = meanY - b * meanX;

  // R²
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (a + b * xs[i])) ** 2, 0);
  const r2 = ssTot ? 1 - ssRes / ssTot : 0;

  return { a, b, r2 };
}

/** Polynomial Regression degree 2: y = a + bx + cx² using least squares */
function polyRegression2(xs, ys) {
  const n = xs.length;
  if (n < 3) return { a: 0, b: 0, c: 0, r2: 0 };

  // Build normal equations [X'X][β] = [X'Y]
  const s0 = n;
  const s1 = xs.reduce((s, x) => s + x, 0);
  const s2 = xs.reduce((s, x) => s + x ** 2, 0);
  const s3 = xs.reduce((s, x) => s + x ** 3, 0);
  const s4 = xs.reduce((s, x) => s + x ** 4, 0);
  const t0 = ys.reduce((s, y) => s + y, 0);
  const t1 = xs.reduce((s, x, i) => s + x * ys[i], 0);
  const t2 = xs.reduce((s, x, i) => s + x ** 2 * ys[i], 0);

  // 3x3 matrix solve via Cramer's rule
  const M = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]];
  const T = [t0, t1, t2];

  function det3(m) {
    return m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])
          -m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])
          +m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
  }
  function replaceCol(mat, col, vec) {
    return mat.map((row, i) => row.map((v, j) => j === col ? vec[i] : v));
  }

  const d = det3(M);
  if (Math.abs(d) < 1e-12) return { a: 0, b: 0, c: 0, r2: 0 };

  const a = det3(replaceCol(M, 0, T)) / d;
  const b = det3(replaceCol(M, 1, T)) / d;
  const c = det3(replaceCol(M, 2, T)) / d;

  const meanY = T[0] / n;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (a + b*xs[i] + c*xs[i]**2)) ** 2, 0);
  const r2 = ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0;

  return { a, b, c, r2 };
}

/** Moving average over sorted series */
function movingAverage(data, window = 3) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    const avg   = slice.reduce((s, v) => s + v.y, 0) / slice.length;
    return { ...d, ma: +avg.toFixed(2) };
  });
}

/** MAE, RMSE */
function regressionMetrics(xs, ys, predictFn) {
  const n = xs.length;
  const errors = xs.map((x, i) => ys[i] - predictFn(x));
  const mae  = errors.reduce((s, e) => s + Math.abs(e), 0) / n;
  const rmse = Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / n);
  return { mae, rmse };
}

// ── SUB-COMPONENTS ─────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, accentColor, iconBg }) {
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
      <div style={{ fontSize: 20, fontWeight: 800, color: BNI_BLUE }}>{value}</div>
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

const IconBank = ({ size = 24 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;

// ── PREDICT INPUT PANEL ────────────────────────────────────────────────────
function PredictPanel({ linReg, polyReg, mode }) {
  const [jam, setJam] = useState(10);
  const predLinear = linReg.a + linReg.b * jam;
  const predPoly   = polyReg.a + polyReg.b * jam + polyReg.c * jam ** 2;
  const pred = mode === "linear" ? predLinear : predPoly;

  return (
    <div style={{ background: "linear-gradient(135deg,#002960,#003F87)", borderRadius: 14, padding: "16px 20px" }}>
      <div style={{ color: "white", fontWeight: 700, fontSize: 13, marginBottom: 12 }}>🔮 Simulasi Prediksi</div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Jam transaksi:</span>
          <span style={{ color: BNI_ORANGE, fontWeight: 800, fontSize: 14 }}>{jam.toFixed(1)}:00</span>
        </div>
        <input type="range" min={7} max={18} step={0.5} value={jam}
          onChange={e => setJam(Number(e.target.value))}
          style={{ width: "100%", accentColor: BNI_ORANGE }}
        />
      </div>
      <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px" }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Prediksi Nilai Transaksi
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{fmtIDR(pred)}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
          Model: {mode === "linear" ? "Regresi Linear" : "Regresi Polinomial (deg 2)"}
        </div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Linear</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: BNI_ORANGE }}>{fmtIDR(predLinear)}</div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>Polinomial</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#a78bfa" }}>{fmtIDR(predPoly)}</div>
        </div>
      </div>
    </div>
  );
}

// ── THEORY PANEL ────────────────────────────────────────────────────────────
function TheoryPanel() {
  const items = [
    { icon: "📐", term: "Regresi Linear", desc: "y = a + bx. Mencari garis lurus terbaik yang meminimalkan jumlah kuadrat residual (OLS)." },
    { icon: "📈", term: "Regresi Polinomial", desc: "y = a + bx + cx². Memodelkan hubungan non-linear dengan menambah fitur kuadrat." },
    { icon: "📊", term: "R² (Koefisien Determinasi)", desc: "Mengukur seberapa baik model menjelaskan variansi data. R²=1 sempurna, R²=0 tidak berguna." },
    { icon: "📉", term: "MAE & RMSE", desc: "Mean Absolute Error & Root Mean Squared Error. Mengukur rata-rata kesalahan prediksi model." },
    { icon: "〰️", term: "Moving Average", desc: "Rata-rata bergerak untuk memperhalus tren dan melihat pola tersembunyi dalam data." },
    { icon: "🎯", term: "OLS (Least Squares)", desc: "Metode yang meminimalkan Σ(yi - ŷi)². Solusi analitik tanpa iterasi." },
  ];
  return (
    <ChartCard title="Konsep Regresi" sub="Fondasi matematis yang digunakan dalam dashboard ini" badge="Teori">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {items.map(({ icon, term, desc }) => (
          <div key={term} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: BNI_BLUE, marginBottom: 4 }}>{term}</div>
            <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.5 }}>{desc}</div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
/**
 * RegresiDashboard
 * Props: data[], loading
 */
export default function RegresiDashboard({ data: propData = [], loading = false }) {
  const [mode, setMode]         = useState("linear");   // "linear" | "poly"
  const [xAxis, setXAxis]       = useState("time");     // "time" | "index"
  const [filterType, setFilterType] = useState("ALL");  // "ALL" | "CR" | "DR"
  const [showTheory, setShowTheory] = useState(false);
  const [tablePage, setTablePage]   = useState(1);

  // ── Prepare data ──────────────────────────────────────────────────────
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

  const filtered = useMemo(() =>
    filterType === "ALL" ? points : points.filter(p => p.TYPE === filterType),
    [points, filterType]
  );

  // ── Regression inputs ─────────────────────────────────────────────────
  const xs = useMemo(() => filtered.map(p => xAxis === "time" ? p.time : p.idx), [filtered, xAxis]);
  const ys = useMemo(() => filtered.map(p => p.amount / 1e6), [filtered]); // in juta

  // ── Model fit ─────────────────────────────────────────────────────────
  const linReg  = useMemo(() => linearRegression(xs, ys), [xs, ys]);
  const polyReg = useMemo(() => polyRegression2(xs, ys), [xs, ys]);

  const activeModel = mode === "linear" ? linReg : polyReg;
  const predictFn   = mode === "linear"
    ? (x) => linReg.a + linReg.b * x
    : (x) => polyReg.a + polyReg.b * x + polyReg.c * x ** 2;

  // ── Metrics ───────────────────────────────────────────────────────────
  const metrics = useMemo(() => regressionMetrics(xs, ys, predictFn), [xs, ys, predictFn]);

  // ── Scatter + line data ────────────────────────────────────────────────
  const scatterData = useMemo(() =>
    filtered.map((p, i) => ({
      ...p,
      x: +(xs[i]).toFixed(3),
      y: +(p.amount / 1e6).toFixed(3),
      yhat: +predictFn(xs[i]).toFixed(3),
      residual: +((p.amount / 1e6) - predictFn(xs[i])).toFixed(3),
    })),
    [filtered, xs, predictFn]
  );

  // Regression line points
  const xMin = xs.length ? Math.min(...xs) : 7;
  const xMax = xs.length ? Math.max(...xs) : 18;
  const linePoints = useMemo(() => {
    const steps = 60;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const x = xMin + (xMax - xMin) * i / steps;
      return { x: +x.toFixed(3), yhat: +predictFn(x).toFixed(3) };
    });
  }, [xMin, xMax, predictFn]);

  // ── Hourly aggregate ───────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const h = Math.floor(p.time);
      if (!map[h]) map[h] = { hour: h, total: 0, count: 0 };
      map[h].total += p.amount / 1e6;
      map[h].count++;
    });
    const arr = Object.values(map).sort((a, b) => a.hour - b.hour).map(d => ({
      hour: d.hour + ":00",
      avg: +(d.total / d.count).toFixed(2),
      count: d.count,
      y: +(d.total / d.count).toFixed(2),
    }));
    return movingAverage(arr, 3);
  }, [filtered]);

  // ── Residual bar data ──────────────────────────────────────────────────
  const residualData = useMemo(() =>
    scatterData.slice(0, 40).map((d, i) => ({
      i: i + 1,
      residual: d.residual,
      color: d.residual >= 0 ? GREEN : RED,
    })),
    [scatterData]
  );

  // ── Table ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(scatterData.length / PER_PAGE));
  const pageData   = scatterData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center", color: "#94a3b8" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>📈</div>
        <div style={{ fontSize: 14, fontWeight: 600 }}>Memuat data regresi...</div>
      </div>
    </div>
  );

  const r2Pct  = (activeModel.r2 * 100).toFixed(1);
  const r2Color = activeModel.r2 > 0.7 ? GREEN : activeModel.r2 > 0.4 ? BNI_ORANGE : RED;

  return (
    <div style={{ padding: "24px 28px 40px", background: "#F0F4FA", minHeight: "100vh" }}>

      {/* ── Header ── */}
      <div style={{
        background: "linear-gradient(135deg, #002960 0%, #0f4c81 100%)",
        borderRadius: 18, padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 24, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: "50%", background: "rgba(243,112,33,0.08)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <IconBank size={24} />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18 }}>Dashboard Regresi</div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>Prediksi nilai transaksi berdasarkan waktu — Linear &amp; Polinomial</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {/* Mode toggle */}
          {[["linear", "📏 Linear"], ["poly", "〰️ Polinomial"]].map(([v, lbl]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              padding: "8px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12,
              background: mode === v ? BNI_ORANGE : "rgba(255,255,255,0.15)",
              color: "white", transition: "background .15s",
            }}>{lbl}</button>
          ))}
          <button onClick={() => setShowTheory(v => !v)} style={{
            padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.2)",
            background: showTheory ? PURPLE : "rgba(255,255,255,0.1)",
            color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer",
          }}>📚 Teori</button>
        </div>
      </div>

      {/* ── Controls Bar ── */}
      <div style={{ background: "white", borderRadius: 14, padding: "14px 20px", marginBottom: 20, boxShadow: "0 2px 20px rgba(0,63,135,0.07)", border: "1px solid rgba(0,63,135,0.07)", display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: BNI_BLUE }}>Sumbu X:</span>
          {[["time", "Jam Transaksi"], ["index", "Urutan (Index)"]].map(([v, lbl]) => (
            <button key={v} onClick={() => setXAxis(v)} style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid " + (xAxis === v ? BNI_BLUE2 : "#e2e8f0"),
              background: xAxis === v ? BNI_BLUE2 : "white", color: xAxis === v ? "white" : "#64748b",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: BNI_BLUE }}>Tipe:</span>
          {[["ALL", "Semua"], ["CR", "Credit"], ["DR", "Debit"]].map(([v, lbl]) => (
            <button key={v} onClick={() => { setFilterType(v); setTablePage(1); }} style={{
              padding: "5px 12px", borderRadius: 8, border: "1px solid " + (filterType === v ? BNI_ORANGE : "#e2e8f0"),
              background: filterType === v ? BNI_ORANGE : "white", color: filterType === v ? "white" : "#64748b",
              fontSize: 11, fontWeight: 600, cursor: "pointer",
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>
          {filtered.length} data diproses
        </div>
      </div>

      {/* ── Theory Panel ── */}
      {showTheory && <div style={{ marginBottom: 20 }}><TheoryPanel /></div>}

      {/* ── KPI Cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard label="R² Score" value={<span style={{ color: r2Color }}>{r2Pct}%</span>} sub={activeModel.r2 > 0.7 ? "✓ Model fit baik" : activeModel.r2 > 0.4 ? "⚠ Fit moderat" : "✗ Fit lemah"} accentColor={r2Color} />
        <KpiCard label="MAE (juta Rp)" value={fmtIDR(metrics.mae * 1e6)} sub="Mean Absolute Error" accentColor={BNI_ORANGE} />
        <KpiCard label="RMSE (juta Rp)" value={fmtIDR(metrics.rmse * 1e6)} sub="Root Mean Squared Error" accentColor={PURPLE} />
        <KpiCard label="Persamaan Model"
          value={<span style={{ fontSize: 13 }}>
            {mode === "linear"
              ? `ŷ = ${linReg.a.toFixed(2)} + ${linReg.b.toFixed(2)}x`
              : `ŷ = ${polyReg.a.toFixed(1)} + ${polyReg.b.toFixed(2)}x + ${polyReg.c.toFixed(2)}x²`}
          </span>}
          sub={mode === "linear" ? "Regresi Linear (OLS)" : "Regresi Polinomial Derajat 2"}
          accentColor={BNI_BLUE2}
        />
      </div>

      {/* ── Row 1: Scatter + Predict ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
        <ChartCard title="Scatter plot + Garis Regresi" sub={`Sumbu X = ${xAxis === "time" ? "jam transaksi" : "urutan index"}, Y = nilai (juta Rp)`} badge={mode === "linear" ? "Linear" : "Polinomial"}>
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" type="number" name="X"
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => xAxis === "time" ? v.toFixed(0) + ":00" : "#" + v}
                domain={[xMin - 0.5, xMax + 0.5]}
              />
              <YAxis dataKey="y" type="number" name="Amount"
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={v => v + "jt"}
              />
              <Tooltip content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0]?.payload;
                if (!d) return null;
                return (
                  <div style={{ background: "white", border: "1px solid rgba(0,63,135,0.12)", borderRadius: 10, padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
                    <p style={{ fontWeight: 700, color: BNI_BLUE, marginBottom: 4 }}>NO {d.NO}</p>
                    <p style={{ color: "#64748b", margin: "2px 0" }}>Aktual: <b>{fmtFull(d.amount)}</b></p>
                    <p style={{ color: "#64748b", margin: "2px 0" }}>Prediksi: <b>{fmtIDR(d.yhat * 1e6)}</b></p>
                    <p style={{ color: d.residual >= 0 ? GREEN : RED, margin: "2px 0" }}>Residual: <b>{d.residual >= 0 ? "+" : ""}{d.residual.toFixed(2)}jt</b></p>
                  </div>
                );
              }} />
              <Scatter name="Data Aktual" data={scatterData} fill={BNI_BLUE2} fillOpacity={0.6} />
              <Scatter name="Garis Regresi" data={linePoints} fill="none" line={{ stroke: BNI_ORANGE, strokeWidth: 2.5 }} shape={() => null} />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
            {[["Data Aktual", BNI_BLUE2], ["Garis Regresi", BNI_ORANGE]].map(([lbl, col]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />{lbl}
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Predict Panel */}
        <ChartCard title="Prediksi &amp; Model" sub="Simulasi prediksi nilai transaksi" badge="Interaktif">
          <PredictPanel linReg={linReg} polyReg={polyReg} mode={mode} />
          {/* Model comparison */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "R² Linear", value: (linReg.r2 * 100).toFixed(1) + "%", color: BNI_BLUE2 },
              { label: "R² Polinomial", value: (polyReg.r2 * 100).toFixed(1) + "%", color: PURPLE },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: `1px solid ${color}22` }}>
                <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Row 2: Hourly Trend + Residual ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        {/* Hourly avg + moving average */}
        <ChartCard title="Tren Rata-rata per Jam" sub="Rata-rata nilai transaksi + moving average (window 3)" badge="Tren">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v + "jt"} />
              <Tooltip formatter={(v, name) => [fmtIDR(v * 1e6), name === "avg" ? "Rata-rata" : "Moving Avg"]} />
              <Line type="monotone" dataKey="avg" stroke={BNI_BLUE2} strokeWidth={2} dot={{ r: 3, fill: BNI_BLUE2 }} name="avg" />
              <Line type="monotone" dataKey="ma" stroke={BNI_ORANGE} strokeWidth={2} strokeDasharray="5 3" dot={false} name="ma" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 8 }}>
            {[["Rata-rata aktual", BNI_BLUE2], ["Moving Average", BNI_ORANGE]].map(([lbl, col]) => (
              <span key={lbl} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#64748b" }}>
                <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: "inline-block" }} />{lbl}
              </span>
            ))}
          </div>
        </ChartCard>

        {/* Residual plot */}
        <ChartCard title="Plot Residual" sub="Selisih nilai aktual vs prediksi (40 data pertama)" badge="Diagnostik">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={residualData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="i" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1)} />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 2" />
              <Tooltip formatter={(v) => [v.toFixed(2) + " jt", "Residual"]} />
              <Bar dataKey="residual" radius={[3, 3, 0, 0]}>
                {residualData.map((entry, i) => (
                  <rect key={i} fill={entry.residual >= 0 ? GREEN : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#64748b" }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>■</span> Prediksi terlalu rendah &nbsp;
            <span style={{ color: RED, fontWeight: 700 }}>■</span> Prediksi terlalu tinggi
          </div>
        </ChartCard>
      </div>

      {/* ── Interpretation Card ── */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="📋 Interpretasi Model" sub="Penjelasan hasil untuk keperluan akademik" badge="Analisis">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              {
                title: "Koefisien Regresi",
                color: BNI_BLUE2,
                items: [
                  `Intercept (a): ${linReg.a.toFixed(4)} jt`,
                  `Slope (b): ${linReg.b >= 0 ? "+" : ""}${linReg.b.toFixed(4)} jt/jam`,
                  linReg.b > 0 ? "↑ Nilai transaksi cenderung naik siang hari" : "↓ Nilai transaksi cenderung turun siang hari",
                ],
              },
              {
                title: "Evaluasi Model",
                color: r2Color,
                items: [
                  `R² = ${(activeModel.r2).toFixed(4)} (${r2Pct}%)`,
                  `MAE = ${(metrics.mae).toFixed(4)} jt`,
                  `RMSE = ${(metrics.rmse).toFixed(4)} jt`,
                  activeModel.r2 > 0.7 ? "✓ Model mampu menjelaskan variasi data dengan baik" : "⚠ Hubungan linear lemah — coba model lain",
                ],
              },
              {
                title: "Kesimpulan",
                color: PURPLE,
                items: [
                  `Data transaksi: ${filtered.length} record`,
                  `Rentang jam: ${xMin.toFixed(1)} – ${xMax.toFixed(1)}`,
                  "Waktu transaksi hanya 1 fitur (sederhana)",
                  "Tambahkan fitur lain untuk meningkatkan R²",
                ],
              },
            ].map(({ title, color, items }) => (
              <div key={title} style={{ background: "#f8fafc", borderRadius: 12, padding: "14px 16px", border: `1px solid ${color}22` }}>
                <div style={{ fontWeight: 700, color, fontSize: 12, marginBottom: 10 }}>{title}</div>
                {items.map((item, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 5, display: "flex", gap: 6 }}>
                    <span style={{ color, flexShrink: 0 }}>▸</span>{item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── Table ── */}
      <div style={{ background: "white", borderRadius: 16, border: "1px solid rgba(0,63,135,0.07)", padding: "18px 20px", boxShadow: "0 2px 20px rgba(0,63,135,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 14 }}>Detail transaksi + nilai prediksi</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>Perbandingan nilai aktual vs prediksi model {mode === "linear" ? "linear" : "polinomial"}</div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 999, background: "rgba(0,63,135,0.08)", color: BNI_BLUE2 }}>{scatterData.length} baris</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                {["#", "NO", "Jam", "Tipe", "Aktual", "Prediksi", "Residual", "Error %"].map(h => (
                  <th key={h} style={{ textAlign: ["Aktual", "Prediksi", "Residual", "Error %"].includes(h) ? "right" : "left", padding: "8px 12px", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #f1f5f9", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => {
                const errPct = r.y ? Math.abs(r.residual / r.y * 100) : 0;
                return (
                  <tr key={r.NO + "-" + i} style={{ borderBottom: "1px solid #f1f5f9" }}
                    onMouseEnter={e => e.currentTarget.style.background = "#f8fafc"}
                    onMouseLeave={e => e.currentTarget.style.background = ""}>
                    <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 11 }}>{(tablePage - 1) * PER_PAGE + i + 1}</td>
                    <td style={{ padding: "8px 12px", color: "#334155" }}>{r.NO}</td>
                    <td style={{ padding: "8px 12px", color: "#334155" }}>{r.timeLabel}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{ padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700, background: r.TYPE === "CR" ? "#dcfce7" : "#fee2e2", color: r.TYPE === "CR" ? "#166534" : "#991b1b" }}>{r.TYPE}</span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: BNI_BLUE, fontWeight: 600 }}>{fmtFull(r.amount)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: "#64748b" }}>{fmtIDR(r.yhat * 1e6)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: r.residual >= 0 ? GREEN : RED, fontWeight: 700 }}>{r.residual >= 0 ? "+" : ""}{r.residual.toFixed(2)}jt</td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600, background: errPct < 20 ? "#dcfce7" : errPct < 50 ? "#fef9c3" : "#fee2e2", color: errPct < 20 ? "#166534" : errPct < 50 ? "#854d0e" : "#991b1b" }}>
                        {errPct.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: "#94a3b8" }}>
            Hal {tablePage}/{totalPages} — {(tablePage - 1) * PER_PAGE + 1}–{Math.min(tablePage * PER_PAGE, scatterData.length)} dari {scatterData.length}
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

      <p style={{ textAlign: "center", fontSize: 11, color: "#94a3b8", marginTop: 24 }}>
        © 2025 BNI Life Insurance — Dashboard Regresi Linear &amp; Polinomial
      </p>
    </div>
  );
}   