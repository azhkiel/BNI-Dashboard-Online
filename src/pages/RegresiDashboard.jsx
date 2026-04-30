import { useState, useMemo } from "react";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, BarChart, Bar, ReferenceLine, Cell,
} from "recharts";
import {
  TrendingUp, BookOpen, ChevronLeft, ChevronRight,
  BarChart2, Activity, Target, Info, CheckCircle2,
  AlertTriangle, ArrowRight, Clock, Sliders, Database,
  Sigma, LineChart as LineChartIcon, GitBranch,
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
  mutedText : "#94a3b8",
  bodyText  : "#64748b",
  border    : "rgba(0,63,135,0.07)",
  cardShadow: "0 2px 20px rgba(0,63,135,0.07)",
  // Semantic
  red       : "#dc2626",
  redBg     : "#fee2e2",
  redText   : "#991b1b",
  amber     : "#d97706",
  amberBg   : "#fef3c7",
  amberText : "#92400e",
  green     : "#16a34a",
  greenBg   : "#dcfce7",
  greenText : "#166534",
  purple    : "#7c3aed",
  purpleBg  : "#ede9fe",
  purpleText: "#4c1d95",
};

// ── CONSTANTS ───────────────────────────────────────────────────────────────
const PER_PAGE = 20;

// ── SHARED CARD STYLE ────────────────────────────────────────────────────────
const card = {
  background  : C.cardBg,
  borderRadius: 18,
  border      : `1px solid ${C.border}`,
  boxShadow   : C.cardShadow,
  padding     : "24px",
  transition  : "all 200ms",
};

// ── HELPERS ─────────────────────────────────────────────────────────────────
const fmtIDR  = (n) => n >= 1e9 ? "Rp " + (n / 1e9).toFixed(2) + "M" : n >= 1e6 ? "Rp " + (n / 1e6).toFixed(2) + "jt" : "Rp " + Math.round(n).toLocaleString("id-ID");
const fmtFull = (n) => "Rp " + Math.round(n).toLocaleString("id-ID");
const parseTimeToHour = (timeStr) => {
  const parts = timeStr.includes(" ") ? timeStr.split(" ")[1] : timeStr;
  const [h, m] = parts.substring(0, 5).split(":").map(Number);
  return h + m / 60;
};

// ── REGRESSION ALGORITHMS ────────────────────────────────────────────────────
function linearRegression(xs, ys) {
  const n = xs.length;
  if (n < 2) return { a: 0, b: 0, r2: 0 };
  const meanX = xs.reduce((s, v) => s + v, 0) / n;
  const meanY = ys.reduce((s, v) => s + v, 0) / n;
  const ssXY  = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0);
  const ssXX  = xs.reduce((s, x) => s + (x - meanX) ** 2, 0);
  const b = ssXX ? ssXY / ssXX : 0;
  const a = meanY - b * meanX;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (a + b * xs[i])) ** 2, 0);
  return { a, b, r2: ssTot ? 1 - ssRes / ssTot : 0 };
}

function polyRegression2(xs, ys) {
  const n = xs.length;
  if (n < 3) return { a: 0, b: 0, c: 0, r2: 0 };
  const s0 = n,
        s1 = xs.reduce((s, x) => s + x, 0),
        s2 = xs.reduce((s, x) => s + x ** 2, 0),
        s3 = xs.reduce((s, x) => s + x ** 3, 0),
        s4 = xs.reduce((s, x) => s + x ** 4, 0),
        t0 = ys.reduce((s, y) => s + y, 0),
        t1 = xs.reduce((s, x, i) => s + x * ys[i], 0),
        t2 = xs.reduce((s, x, i) => s + x ** 2 * ys[i], 0);
  const M = [[s0, s1, s2], [s1, s2, s3], [s2, s3, s4]];
  const T = [t0, t1, t2];
  const det3 = (m) =>
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1])
    - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
    + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const replaceCol = (mat, col, vec) => mat.map((row, i) => row.map((v, j) => (j === col ? vec[i] : v)));
  const d = det3(M);
  if (Math.abs(d) < 1e-12) return { a: 0, b: 0, c: 0, r2: 0 };
  const a = det3(replaceCol(M, 0, T)) / d;
  const b = det3(replaceCol(M, 1, T)) / d;
  const c = det3(replaceCol(M, 2, T)) / d;
  const meanY = T[0] / n;
  const ssTot = ys.reduce((s, y) => s + (y - meanY) ** 2, 0);
  const ssRes = ys.reduce((s, y, i) => s + (y - (a + b * xs[i] + c * xs[i] ** 2)) ** 2, 0);
  return { a, b, c, r2: ssTot ? Math.max(0, 1 - ssRes / ssTot) : 0 };
}

function movingAverage(data, window = 3) {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    return { ...d, ma: +(slice.reduce((s, v) => s + v.y, 0) / slice.length).toFixed(2) };
  });
}

function regressionMetrics(xs, ys, predictFn) {
  const n = xs.length;
  const errors = xs.map((x, i) => ys[i] - predictFn(x));
  return {
    mae : errors.reduce((s, e) => s + Math.abs(e), 0) / n,
    rmse: Math.sqrt(errors.reduce((s, e) => s + e ** 2, 0) / n),
  };
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────
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
          <div style={{ width: 34, height: 34, borderRadius: 9, background: accentColor + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon size={15} color={accentColor} />
          </div>
        )}
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: C.darkBlue, lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.mutedText, marginTop: 6 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, sub, badge, children }) {
  return (
    <div style={{ ...card }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 15 }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: C.mutedText, marginTop: 3 }}>{sub}</div>}
        </div>
        {badge && (
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: C.badgeBg, color: C.blue, whiteSpace: "nowrap" }}>{badge}</span>
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

function LegendDot({ color, label }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: C.bodyText }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color, display: "inline-block" }} />
      {label}
    </span>
  );
}

// ── PREDICT PANEL ─────────────────────────────────────────────────────────────
function PredictPanel({ linReg, polyReg, mode }) {
  const [jam, setJam] = useState(10);
  const predLinear = linReg.a + linReg.b * jam;
  const predPoly   = polyReg.a + polyReg.b * jam + polyReg.c * jam ** 2;
  const pred = mode === "linear" ? predLinear : predPoly;

  return (
    <div style={{ background: `linear-gradient(135deg, ${C.darkBlue}, ${C.blue})`, borderRadius: 14, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7, color: "white", fontWeight: 700, fontSize: 13, marginBottom: 14 }}>
        <Sliders size={14} color={C.orange} />
        Simulasi Prediksi
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ color: "rgba(255,255,255,0.65)", fontSize: 12 }}>Jam transaksi</span>
          <span style={{ color: C.orange, fontWeight: 800, fontSize: 14 }}>{jam.toFixed(1)}:00</span>
        </div>
        <input type="range" min={7} max={18} step={0.5} value={jam}
          onChange={e => setJam(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.orange }}
        />
      </div>

      <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.10em", marginBottom: 4 }}>
          Prediksi Nilai Transaksi
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "white" }}>{fmtIDR(pred * 1e6)}</div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginTop: 4 }}>
          Model: {mode === "linear" ? "Regresi Linear" : "Regresi Polinomial (deg 2)"}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[
          { label: "Linear",      value: fmtIDR(predLinear * 1e6), color: C.orange },
          { label: "Polinomial",  value: fmtIDR(predPoly * 1e6),   color: "#a78bfa" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: "rgba(255,255,255,0.07)", borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── THEORY PANEL ─────────────────────────────────────────────────────────────
function TheoryPanel() {
  const items = [
    { Icon: LineChartIcon, term: "Regresi Linear",              desc: "y = a + bx. Mencari garis lurus terbaik yang meminimalkan jumlah kuadrat residual (OLS)." },
    { Icon: GitBranch,     term: "Regresi Polinomial",          desc: "y = a + bx + cx². Memodelkan hubungan non-linear dengan menambah fitur kuadrat." },
    { Icon: Target,        term: "R² (Koefisien Determinasi)",  desc: "Mengukur seberapa baik model menjelaskan variansi data. R²=1 sempurna, R²=0 tidak berguna." },
    { Icon: Activity,      term: "MAE & RMSE",                  desc: "Mean Absolute Error & Root Mean Squared Error. Mengukur rata-rata kesalahan prediksi model." },
    { Icon: TrendingUp,    term: "Moving Average",              desc: "Rata-rata bergerak untuk memperhalus tren dan melihat pola tersembunyi dalam data." },
    { Icon: Sigma,         term: "OLS (Least Squares)",         desc: "Metode yang meminimalkan Σ(yi − ŷi)². Solusi analitik tanpa iterasi." },
  ];
  return (
    <ChartCard title="Konsep Regresi" sub="Fondasi matematis yang digunakan dalam dashboard ini" badge="Teori">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
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
    </ChartCard>
  );
}

// ── SCATTER TOOLTIP ──────────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{ background: "white", border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", fontSize: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.10)" }}>
      <p style={{ fontWeight: 800, color: C.darkBlue, marginBottom: 6 }}>NO {d.NO}</p>
      <p style={{ color: C.bodyText, margin: "3px 0" }}>Aktual: <b>{fmtFull(d.amount)}</b></p>
      <p style={{ color: C.bodyText, margin: "3px 0" }}>Prediksi: <b>{fmtIDR(d.yhat * 1e6)}</b></p>
      <p style={{ color: d.residual >= 0 ? C.green : C.red, margin: "3px 0", fontWeight: 700 }}>
        Residual: {d.residual >= 0 ? "+" : ""}{d.residual.toFixed(2)} jt
      </p>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function RegresiDashboard({ data: propData = [], loading = false }) {
  const [mode,       setMode]       = useState("linear");
  const [xAxis,      setXAxis]      = useState("time");
  const [filterType, setFilterType] = useState("ALL");
  const [showTheory, setShowTheory] = useState(false);
  const [tablePage,  setTablePage]  = useState(1);

  // Prepare data
  const points = useMemo(() =>
    propData.map((r, idx) => {
      const timeStr = r.TIME || "00:00";
      return {
        ...r, amount: Number(r.AMOUNT), idx,
        time: parseTimeToHour(timeStr),
        timeLabel: timeStr.includes(" ") ? timeStr.split(" ")[1]?.substring(0, 5) : timeStr.substring(0, 5),
      };
    }),
    [propData]
  );

  const filtered = useMemo(() =>
    filterType === "ALL" ? points : points.filter(p => p.TYPE === filterType),
    [points, filterType]
  );

  const xs = useMemo(() => filtered.map(p => xAxis === "time" ? p.time : p.idx), [filtered, xAxis]);
  const ys = useMemo(() => filtered.map(p => p.amount / 1e6), [filtered]);

  const linReg  = useMemo(() => linearRegression(xs, ys),  [xs, ys]);
  const polyReg = useMemo(() => polyRegression2(xs, ys),   [xs, ys]);

  const predictFn = useMemo(() =>
    mode === "linear"
      ? (x) => linReg.a  + linReg.b  * x
      : (x) => polyReg.a + polyReg.b * x + polyReg.c * x ** 2,
    [mode, linReg, polyReg]
  );

  const activeModel = mode === "linear" ? linReg : polyReg;
  const metrics     = useMemo(() => regressionMetrics(xs, ys, predictFn), [xs, ys, predictFn]);

  // Scatter data
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

  // Regression line
  const xMin = xs.length ? Math.min(...xs) : 7;
  const xMax = xs.length ? Math.max(...xs) : 18;
  const linePoints = useMemo(() =>
    Array.from({ length: 61 }, (_, i) => {
      const x = xMin + (xMax - xMin) * i / 60;
      return { x: +x.toFixed(3), yhat: +predictFn(x).toFixed(3) };
    }),
    [xMin, xMax, predictFn]
  );

  // Hourly aggregate
  const hourlyData = useMemo(() => {
    const map = {};
    filtered.forEach(p => {
      const h = Math.floor(p.time);
      if (!map[h]) map[h] = { hour: h, total: 0, count: 0 };
      map[h].total += p.amount / 1e6;
      map[h].count++;
    });
    return movingAverage(
      Object.values(map).sort((a, b) => a.hour - b.hour)
        .map(d => ({ hour: d.hour + ":00", avg: +(d.total / d.count).toFixed(2), count: d.count, y: +(d.total / d.count).toFixed(2) })),
      3
    );
  }, [filtered]);

  // Residual data
  const residualData = useMemo(() =>
    scatterData.slice(0, 40).map((d, i) => ({ i: i + 1, residual: d.residual })),
    [scatterData]
  );

  // Table
  const totalPages = Math.max(1, Math.ceil(scatterData.length / PER_PAGE));
  const pageData   = scatterData.slice((tablePage - 1) * PER_PAGE, tablePage * PER_PAGE);

  const r2Pct   = (activeModel.r2 * 100).toFixed(1);
  const r2Color = activeModel.r2 > 0.7 ? C.green : activeModel.r2 > 0.4 ? C.orange : C.red;

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh", background: C.pageBg }}>
      <div style={{ textAlign: "center" }}>
        <TrendingUp size={40} color={C.blue} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: C.bodyText }}>Memuat data regresi...</div>
      </div>
    </div>
  );

  return (
    <div style={{ padding: "24px 28px 48px", background: C.pageBg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(135deg, ${C.darkBlue} 0%, ${C.blue} 100%)`,
        borderRadius: 18, padding: "20px 28px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 20, position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 176, height: 176, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", right: 64, bottom: -56, width: 144, height: 144, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />
        <div style={{ position: "absolute", left: "38%", top: -20, width: 100, height: 100, borderRadius: "50%", background: "rgba(243,112,33,0.07)" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative", zIndex: 1 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TrendingUp size={22} color="white" />
          </div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 18, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}>
              Dashboard Regresi
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 3 }}>
              Prediksi nilai transaksi berdasarkan waktu — Linear &amp; Polinomial
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", position: "relative", zIndex: 1 }}>
          {[["linear", "Linear", LineChartIcon], ["poly", "Polinomial", GitBranch]].map(([v, lbl, Icon]) => (
            <button key={v} onClick={() => setMode(v)} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "9px 14px", borderRadius: 10, border: "none", cursor: "pointer",
              fontWeight: 700, fontSize: 12, transition: "background .15s",
              background: mode === v
                ? `linear-gradient(135deg, ${C.orange} 0%, #e05800 100%)`
                : "rgba(255,255,255,0.12)",
              color: "white",
              boxShadow: mode === v ? "0 6px 20px rgba(243,112,33,0.35)" : "none",
            }}>
              <Icon size={13} />{lbl}
            </button>
          ))}
          <button onClick={() => setShowTheory(v => !v)} style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderRadius: 10, cursor: "pointer",
            border: "1px solid rgba(255,255,255,0.2)",
            background: showTheory ? C.teal : "rgba(255,255,255,0.1)",
            color: "white", fontSize: 12, fontWeight: 700,
          }}>
            <BookOpen size={13} />Teori
          </button>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{ ...card, marginBottom: 20, display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: C.darkBlue }}>
            <Clock size={13} color={C.blue} />Sumbu X
          </span>
          {[["time", "Jam Transaksi"], ["index", "Urutan (Index)"]].map(([v, lbl]) => (
            <button key={v} onClick={() => setXAxis(v)} style={{
              padding: "5px 12px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${xAxis === v ? C.blue : "#e2e8f0"}`,
              background: xAxis === v ? C.blue : "white",
              color: xAxis === v ? "white" : C.bodyText,
              fontSize: 11, fontWeight: 600,
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ width: 1, height: 24, background: "#e2e8f0" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, fontWeight: 700, color: C.darkBlue }}>
            <Database size={13} color={C.blue} />Tipe
          </span>
          {[["ALL", "Semua"], ["CR", "Credit"], ["DR", "Debit"]].map(([v, lbl]) => (
            <button key={v} onClick={() => { setFilterType(v); setTablePage(1); }} style={{
              padding: "5px 12px", borderRadius: 8, cursor: "pointer",
              border: `1px solid ${filterType === v ? C.orange : "#e2e8f0"}`,
              background: filterType === v ? C.orange : "white",
              color: filterType === v ? "white" : C.bodyText,
              fontSize: 11, fontWeight: 600,
            }}>{lbl}</button>
          ))}
        </div>
        <div style={{ marginLeft: "auto", fontSize: 11, color: C.mutedText }}>
          {filtered.length} data diproses
        </div>
      </div>

      {/* ── THEORY ── */}
      {showTheory && <div style={{ marginBottom: 20 }}><TheoryPanel /></div>}

      {/* ── KPI CARDS ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 20 }}>
        <KpiCard
          label="R² Score"
          value={<span style={{ color: r2Color }}>{r2Pct}%</span>}
          sub={activeModel.r2 > 0.7 ? "Model fit baik" : activeModel.r2 > 0.4 ? "Fit moderat" : "Fit lemah"}
          accentColor={r2Color}
          icon={Target}
        />
        <KpiCard
          label="MAE (juta Rp)"
          value={fmtIDR(metrics.mae * 1e6)}
          sub="Mean Absolute Error"
          accentColor={C.orange}
          icon={Activity}
        />
        <KpiCard
          label="RMSE (juta Rp)"
          value={fmtIDR(metrics.rmse * 1e6)}
          sub="Root Mean Squared Error"
          accentColor={C.purple}
          icon={BarChart2}
        />
        <KpiCard
          label="Persamaan Model"
          value={
            <span style={{ fontSize: 13 }}>
              {mode === "linear"
                ? `ŷ = ${linReg.a.toFixed(2)} + ${linReg.b.toFixed(2)}x`
                : `ŷ = ${polyReg.a.toFixed(1)} + ${polyReg.b.toFixed(2)}x + ${polyReg.c.toFixed(2)}x²`}
            </span>
          }
          sub={mode === "linear" ? "Regresi Linear (OLS)" : "Regresi Polinomial Derajat 2"}
          accentColor={C.blue}
          icon={Sigma}
        />
      </div>

      {/* ── ROW 1: SCATTER + PREDICT ── */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>

        <ChartCard
          title="Scatter Plot + Garis Regresi"
          sub={`Sumbu X = ${xAxis === "time" ? "jam transaksi" : "urutan index"}, Y = nilai (juta Rp)`}
          badge={mode === "linear" ? "Linear" : "Polinomial"}
        >
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="x" type="number" name="X"
                tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false}
                tickFormatter={v => xAxis === "time" ? v.toFixed(0) + ":00" : "#" + v}
                domain={[xMin - 0.5, xMax + 0.5]}
              />
              <YAxis dataKey="y" type="number" name="Amount"
                tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false}
                tickFormatter={v => v + "jt"}
              />
              <Tooltip content={<ScatterTooltip />} />
              <Scatter name="Data Aktual"  data={scatterData} fill={C.blue}   fillOpacity={0.6} />
              <Scatter name="Garis Regresi" data={linePoints}  fill="none"
                line={{ stroke: C.orange, strokeWidth: 2.5 }} shape={() => null}
              />
            </ScatterChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
            <LegendDot color={C.blue}   label="Data Aktual" />
            <LegendDot color={C.orange} label="Garis Regresi" />
          </div>
        </ChartCard>

        <ChartCard title="Prediksi & Model" sub="Simulasi prediksi nilai transaksi" badge="Interaktif">
          <PredictPanel linReg={linReg} polyReg={polyReg} mode={mode} />
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { label: "R² Linear",     value: (linReg.r2  * 100).toFixed(1) + "%", color: C.blue   },
              { label: "R² Polinomial", value: (polyReg.r2 * 100).toFixed(1) + "%", color: C.purple },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: C.pageBg, borderRadius: 10, padding: "10px 12px", border: `1px solid ${color}22` }}>
                <div style={{ fontSize: 10, color: C.mutedText, fontWeight: 700, marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── ROW 2: TREN + RESIDUAL ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

        <ChartCard title="Tren Rata-rata per Jam" sub="Rata-rata nilai transaksi + moving average (window 3)" badge="Tren">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.mutedText }} axisLine={false} tickLine={false} tickFormatter={v => v + "jt"} />
              <Tooltip formatter={(v, name) => [fmtIDR(v * 1e6), name === "avg" ? "Rata-rata" : "Moving Avg"]} />
              <Line type="monotone" dataKey="avg" stroke={C.blue}   strokeWidth={2} dot={{ r: 3, fill: C.blue }}   name="avg" />
              <Line type="monotone" dataKey="ma"  stroke={C.orange} strokeWidth={2} strokeDasharray="5 3" dot={false} name="ma" />
            </LineChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
            <LegendDot color={C.blue}   label="Rata-rata aktual" />
            <LegendDot color={C.orange} label="Moving Average" />
          </div>
        </ChartCard>

        <ChartCard title="Plot Residual" sub="Selisih nilai aktual vs prediksi (40 data pertama)" badge="Diagnostik">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={residualData} barCategoryGap="15%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="i" tick={{ fontSize: 10, fill: C.mutedText }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: C.mutedText }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(1)} />
              <ReferenceLine y={0} stroke={C.mutedText} strokeDasharray="4 2" />
              <Tooltip formatter={(v) => [v.toFixed(2) + " jt", "Residual"]} />
              <Bar dataKey="residual" radius={[3, 3, 0, 0]}>
                {residualData.map((entry, i) => (
                  <Cell key={i} fill={entry.residual >= 0 ? C.green : C.red} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 10 }}>
            <LegendDot color={C.green} label="Prediksi terlalu rendah" />
            <LegendDot color={C.red}   label="Prediksi terlalu tinggi" />
          </div>
        </ChartCard>
      </div>

      {/* ── INTERPRETATION ── */}
      <div style={{ marginBottom: 16 }}>
        <ChartCard title="Interpretasi Model" sub="Penjelasan hasil untuk keperluan akademik" badge="Analisis">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              {
                title: "Koefisien Regresi", color: C.blue, Icon: LineChartIcon,
                items: [
                  `Intercept (a): ${linReg.a.toFixed(4)} jt`,
                  `Slope (b): ${linReg.b >= 0 ? "+" : ""}${linReg.b.toFixed(4)} jt/jam`,
                  linReg.b > 0 ? "Nilai transaksi cenderung naik siang hari" : "Nilai transaksi cenderung turun siang hari",
                ],
              },
              {
                title: "Evaluasi Model", color: r2Color, Icon: Target,
                items: [
                  `R² = ${activeModel.r2.toFixed(4)} (${r2Pct}%)`,
                  `MAE = ${metrics.mae.toFixed(4)} jt`,
                  `RMSE = ${metrics.rmse.toFixed(4)} jt`,
                  activeModel.r2 > 0.7 ? "Model mampu menjelaskan variasi data dengan baik" : "Hubungan linear lemah — coba model lain",
                ],
              },
              {
                title: "Kesimpulan", color: C.purple, Icon: Info,
                items: [
                  `Data transaksi: ${filtered.length} record`,
                  `Rentang jam: ${xMin.toFixed(1)} – ${xMax.toFixed(1)}`,
                  "Waktu transaksi hanya 1 fitur (sederhana)",
                  "Tambahkan fitur lain untuk meningkatkan R²",
                ],
              },
            ].map(({ title, color, Icon, items }) => (
              <div key={title} style={{ background: C.pageBg, borderRadius: 12, padding: "16px", border: `1px solid ${color}22` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color, fontSize: 13, marginBottom: 12 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: color + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon size={13} color={color} />
                  </div>
                  {title}
                </div>
                {items.map((item, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#334155", marginBottom: 5, display: "flex", gap: 6 }}>
                    <ArrowRight size={11} color={color} style={{ marginTop: 1, flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      {/* ── TABLE ── */}
      <div style={{ ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 700, color: C.darkBlue, fontSize: 15 }}>
              <BarChart2 size={15} color={C.blue} />
              Detail Transaksi + Nilai Prediksi
            </div>
            <div style={{ fontSize: 11, color: C.mutedText, marginTop: 3 }}>
              Perbandingan nilai aktual vs prediksi model {mode === "linear" ? "linear" : "polinomial"}
            </div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, background: C.badgeBg, color: C.blue }}>
            {scatterData.length} baris
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.pageBg }}>
                {["#", "NO", "Jam", "Tipe", "Aktual", "Prediksi", "Residual", "Error %"].map(h => (
                  <th key={h} style={{
                    textAlign: ["Aktual", "Prediksi", "Residual", "Error %"].includes(h) ? "right" : "left",
                    padding: "9px 12px", fontSize: 10, fontWeight: 700, color: C.mutedText,
                    textTransform: "uppercase", letterSpacing: "0.10em",
                    borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((r, i) => {
                const errPct = r.y ? Math.abs(r.residual / r.y * 100) : 0;
                return (
                  <tr key={r.NO + "-" + i}
                    style={{ borderBottom: `1px solid ${C.border}`, transition: "background .15s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.pageBg}
                    onMouseLeave={e => e.currentTarget.style.background = ""}
                  >
                    <td style={{ padding: "8px 12px", color: "#cbd5e1", fontSize: 11 }}>{(tablePage - 1) * PER_PAGE + i + 1}</td>
                    <td style={{ padding: "8px 12px", color: "#334155" }}>{r.NO}</td>
                    <td style={{ padding: "8px 12px", color: "#334155" }}>{r.timeLabel}</td>
                    <td style={{ padding: "8px 12px" }}>
                      <span style={{
                        padding: "2px 9px", borderRadius: 999, fontSize: 10, fontWeight: 700,
                        background: r.TYPE === "CR" ? C.greenBg : C.redBg,
                        color: r.TYPE === "CR" ? C.greenText : C.redText,
                      }}>{r.TYPE}</span>
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: C.darkBlue, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{fmtFull(r.amount)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: C.bodyText, fontVariantNumeric: "tabular-nums" }}>{fmtIDR(r.yhat * 1e6)}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", color: r.residual >= 0 ? C.green : C.red, fontWeight: 700 }}>
                      {r.residual >= 0 ? "+" : ""}{r.residual.toFixed(2)} jt
                    </td>
                    <td style={{ padding: "8px 12px", textAlign: "right" }}>
                      <span style={{
                        padding: "2px 8px", borderRadius: 999, fontSize: 10, fontWeight: 600,
                        background: errPct < 20 ? C.greenBg : errPct < 50 ? C.amberBg : C.redBg,
                        color: errPct < 20 ? C.greenText : errPct < 50 ? C.amberText : C.redText,
                      }}>{errPct.toFixed(1)}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 16, flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, color: C.mutedText }}>
            Hal {tablePage}/{totalPages} — {(tablePage - 1) * PER_PAGE + 1}–{Math.min(tablePage * PER_PAGE, scatterData.length)} dari {scatterData.length}
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

      <p style={{ textAlign: "center", fontSize: 11, color: C.mutedText, marginTop: 28 }}>
        © 2025 BNI Life Insurance — Dashboard Regresi Linear &amp; Polinomial
      </p>
    </div>
  );
}