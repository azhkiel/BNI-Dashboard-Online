import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine,
  AreaChart, Area, Legend,
} from "recharts";
import {
  TrendingUp, Settings, BookOpen, X, Play, RefreshCw, Activity,
  AlertTriangle, CheckCircle, Info, Clock, BarChart2, TrendingDown,
  ArrowUp, ArrowDown, Layers, ChevronRight,
} from "lucide-react";

/* ─── Google Fonts ──────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800&family=DM+Sans:wght@400;500;600;700&display=swap";
document.head.appendChild(fontLink);

/* ─── Design tokens (BNI Style Guide) ──────────────────────── */
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
  red       : "#dc2626",
  green     : "#16a34a",
  amber     : "#d97706",
  purple    : "#7c3aed",
};

const cardStyle = {
  background   : C.cardBg,
  borderRadius : 18,
  border       : `1px solid ${C.border}`,
  boxShadow    : "0 2px 20px rgba(0,63,135,0.07)",
  padding      : 24,
  transition   : "all 200ms",
};

/* ─── Helpers ────────────────────────────────────────────────── */
function parseTimeToHour(timeStr) {
  if (!timeStr) return 0;
  const str = String(timeStr).trim();
  const parts = str.includes(" ") ? str.split(" ")[1] : str;
  const [h] = parts.split(":").map(Number);
  return isNaN(h) ? 0 : h;
}
function fmtRupiah(v) {
  return "Rp " + Number(v).toLocaleString("id-ID");
}
function fmtK(v) {
  if (v >= 1e9) return (v / 1e9).toFixed(1) + " M";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + " jt";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + " rb";
  return String(Math.round(v));
}

/* ─── Aggregate data per jam ─────────────────────────────────── */
function aggregateByHour(data, metric = "total_amount") {
  const byHour = {};
  for (let h = 0; h < 24; h++) byHour[h] = { count: 0, totalAmount: 0, crAmount: 0, drAmount: 0 };
  data.forEach((r) => {
    const h = parseTimeToHour(r.TIME);
    const a = Number(r.AMOUNT) || 0;
    if (h >= 0 && h < 24) {
      byHour[h].count++;
      byHour[h].totalAmount += a;
      if (r.TYPE === "CR") byHour[h].crAmount += a;
      else byHour[h].drAmount += a;
    }
  });
  return Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    label: `${String(h).padStart(2, "0")}:00`,
    count: byHour[h].count,
    totalAmount: byHour[h].totalAmount,
    crAmount: byHour[h].crAmount,
    drAmount: byHour[h].drAmount,
    value: metric === "count" ? byHour[h].count : byHour[h].totalAmount,
  }));
}

/* ─── Normalize / denormalize ────────────────────────────────── */
function minMaxNorm(arr) {
  const mn = Math.min(...arr), mx = Math.max(...arr), rng = mx - mn || 1;
  return { norm: arr.map((v) => (v - mn) / rng), min: mn, max: mx, denorm: (v) => v * rng + mn };
}

/* ─── Build sequences ────────────────────────────────────────── */
function buildSequences(series, windowSize) {
  const X = [], Y = [];
  for (let i = 0; i + windowSize < series.length; i++) {
    X.push(series.slice(i, i + windowSize));
    Y.push(series[i + windowSize]);
  }
  return { X, Y };
}

/* ─── Build LSTM model ───────────────────────────────────────── */
function buildLSTM(windowSize, lstmUnits) {
  const model = tf.sequential();
  model.add(tf.layers.lstm({ units: lstmUnits, inputShape: [windowSize, 1], returnSequences: false }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
  return model;
}

/* ─── Card ───────────────────────────────────────────────────── */
function Card({ children, style = {}, accentColor }) {
  return (
    <div style={{
      ...cardStyle,
      position: "relative",
      overflow: "hidden",
      ...(accentColor ? { borderLeft: `4px solid ${accentColor}` } : {}),
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── KPI Card ───────────────────────────────────────────────── */
function KPICard({ label, value, sub, color = C.blue, icon: Icon }) {
  return (
    <div style={{ ...cardStyle, position: "relative", overflow: "hidden", paddingTop: 28 }}>
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 4, borderRadius: "18px 18px 0 0", background: color,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.mutedText,
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
          }}>
            {label}
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.darkBlue, lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>
            {value}
          </div>
          {sub && <div style={{ fontSize: 12, color: C.mutedText, marginTop: 4 }}>{sub}</div>}
        </div>
        {Icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${color}18`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={22} color={color} strokeWidth={1.8} />
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Section Title ──────────────────────────────────────────── */
function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom: sub ? 4 : 16 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.darkBlue }}>{children}</div>
      {sub && <div style={{ fontSize: 12, color: C.bodyText, marginTop: 4, marginBottom: 16 }}>{sub}</div>}
    </div>
  );
}

/* ─── Slider Field ───────────────────────────────────────────── */
function SliderField({ label, value, min, max, step, onChange, disabled, hint }) {
  return (
    <div>
      <label style={{ fontSize: 12, color: C.bodyText, fontWeight: 500, display: "block", marginBottom: 6 }}>
        {label}: <b style={{ color: C.darkBlue }}>{value}</b>
      </label>
      <input
        type="range" min={min} max={max} step={step}
        value={value} onChange={onChange} disabled={disabled}
        style={{ width: "100%", accentColor: C.blue }}
      />
      {hint && <div style={{ fontSize: 10, color: C.mutedText, marginTop: 2 }}>{hint}</div>}
    </div>
  );
}

/* ─── Custom Tooltip ─────────────────────────────────────────── */
function ForecastTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "12px 16px", fontSize: 12, boxShadow: "0 8px 32px rgba(0,63,135,0.11)",
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: C.darkBlue }}>{label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <b>{typeof p.value === "number" ? fmtK(p.value) : p.value}</b>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function LSTMDashboard({ data = [], loading = false }) {
  const [status,        setStatus]        = useState("idle");
  const [epoch,         setEpoch]         = useState(0);
  const [totalEpochs,   setTotalEpochs]   = useState(80);
  const [windowSize,    setWindowSize]    = useState(4);
  const [lstmUnits,     setLstmUnits]     = useState(32);
  const [forecastSteps, setForecastSteps] = useState(6);
  const [metric,        setMetric]        = useState("total_amount");
  const [lossHistory,   setLossHistory]   = useState([]);
  const [results,       setResults]       = useState(null);
  const [showTheory,    setShowTheory]    = useState(false);
  const [activeTab,     setActiveTab]     = useState("forecast");
  const modelRef = useRef(null);

  useEffect(() => () => { modelRef.current?.dispose(); }, []);

  /* ── Training ── */
  const trainModel = useCallback(async () => {
    if (!data || data.length < 5) return;
    setStatus("training"); setEpoch(0); setLossHistory([]); setResults(null);
    try {
      const hourly = aggregateByHour(data, metric);
      const rawSeries = hourly.map((h) => h.value);
      const { norm, min, max, denorm } = minMaxNorm(rawSeries);
      const { X, Y } = buildSequences(norm, windowSize);
      if (X.length < 2) throw new Error("Data terlalu sedikit untuk window size ini.");
      const xs = tf.tensor3d(X.map((seq) => seq.map((v) => [v])));
      const ys = tf.tensor2d(Y.map((v) => [v]));
      modelRef.current?.dispose();
      const model = buildLSTM(windowSize, lstmUnits);
      modelRef.current = model;
      const losses = [];
      await model.fit(xs, ys, {
        epochs: totalEpochs,
        batchSize: Math.min(8, Math.floor(X.length / 2)),
        shuffle: true,
        callbacks: {
          onEpochEnd: async (ep, logs) => {
            losses.push({ epoch: ep + 1, loss: parseFloat(logs.loss.toFixed(6)) });
            setEpoch(ep + 1);
            setLossHistory([...losses]);
            await tf.nextFrame();
          },
        },
      });
      const predNorm = await model.predict(xs).array();
      const inSamplePreds = predNorm.map(([v]) => denorm(v));
      let forecastSeq = [...norm.slice(-windowSize)];
      const forecastNorm = [];
      for (let i = 0; i < forecastSteps; i++) {
        const inp = tf.tensor3d([forecastSeq.map((v) => [v])]);
        const out = model.predict(inp);
        const val = (await out.array())[0][0];
        forecastNorm.push(val);
        forecastSeq = [...forecastSeq.slice(1), val];
        out.dispose(); inp.dispose();
      }
      const forecastDenorm = forecastNorm.map(denorm);
      const actuals = rawSeries.slice(windowSize);
      const mae  = actuals.reduce((s, a, i) => s + Math.abs(a - inSamplePreds[i]), 0) / actuals.length;
      const rmse = Math.sqrt(actuals.reduce((s, a, i) => s + (a - inSamplePreds[i]) ** 2, 0) / actuals.length);
      const mape = actuals.reduce((s, a, i) => s + (a > 0 ? Math.abs((a - inSamplePreds[i]) / a) : 0), 0) / actuals.length * 100;
      const chartActual = hourly.map((h, i) => ({
        label: h.label, hour: h.hour, aktual: h.value,
        prediksi: i >= windowSize ? inSamplePreds[i - windowSize] : null,
      }));
      const lastHour = 23;
      const forecastChart = forecastDenorm.map((v, i) => ({
        label: `+${i + 1}h`, hour: lastHour + i + 1, forecast: Math.max(0, v),
      }));
      const residuals = actuals.map((a, i) => ({
        label: hourly[i + windowSize].label,
        residual: a - inSamplePreds[i],
        pct: a > 0 ? ((a - inSamplePreds[i]) / a) * 100 : 0,
      }));
      xs.dispose(); ys.dispose();
      setResults({
        hourly, rawSeries, inSamplePreds, forecastDenorm,
        chartActual, forecastChart, residuals,
        mae, rmse, mape, losses, min, max, norm,
        peakHour: hourly.reduce((a, b) => b.value > a.value ? b : a),
        lowHour: hourly.filter((h) => h.value > 0).reduce((a, b) => b.value < a.value ? b : a),
      });
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [data, totalEpochs, windowSize, lstmUnits, forecastSteps, metric]);

  /* ── Tab Button ── */
  const TabBtn = ({ id, label, icon: Icon }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "8px 16px", borderRadius: 10, fontWeight: 600, fontSize: 13,
        border: "none", cursor: "pointer",
        background: activeTab === id ? C.blue : "transparent",
        color: activeTab === id ? "#fff" : C.bodyText,
        transition: "all 0.15s", display: "flex", alignItems: "center", gap: 6,
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {Icon && <Icon size={14} strokeWidth={2} />}
      {label}
    </button>
  );

  /* ── Render ── */
  return (
    <div style={{ background: C.pageBg, minHeight: "100vh", fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Header Banner ── */}
      <div style={{
        background: "linear-gradient(135deg, #002960 0%, #003F87 100%)",
        borderRadius: 16, margin: "20px 32px 0",
        padding: "20px 24px",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", right: -40, top: -40, width: 176, height: 176, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", right: 64, bottom: -56, width: 144, height: 144, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TrendingUp size={22} color="#fff" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)", marginBottom: 4, textTransform: "uppercase" }}>
                BNI Life Insurance · Time Series Forecasting
              </div>
              <h1 style={{
                margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2,
                fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px",
              }}>
                LSTM Forecasting Transaksi
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                Prediksi pola transaksi per jam menggunakan Long Short-Term Memory · TensorFlow.js
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTheory((v) => !v)}
            style={{
              background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff", borderRadius: 10, padding: "9px 16px",
              cursor: "pointer", fontSize: 13, fontWeight: 600,
              display: "flex", alignItems: "center", gap: 7,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {showTheory ? <X size={15} /> : <BookOpen size={15} />}
            {showTheory ? "Tutup Teori" : "Teori"}
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ── Theory Panel ── */}
        {showTheory && (
          <Card accentColor={C.orange} style={{ marginBottom: 24 }}>
            <SectionTitle>Teori: LSTM untuk Time Series Forecasting</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[
                { title: "Apa itu LSTM?", body: "Long Short-Term Memory (LSTM) adalah jenis Recurrent Neural Network yang mampu mempelajari dependensi jangka panjang dalam data sekuensial, mengatasi masalah vanishing gradient pada RNN biasa." },
                { title: "Gate Mechanism", body: "LSTM memiliki 3 gate: Forget Gate (lupakan info lama), Input Gate (simpan info baru), Output Gate (keluarkan prediksi). Setiap gate menggunakan fungsi sigmoid untuk mengatur aliran informasi." },
                { title: "Sliding Window", body: "Data deret waktu dikonversi ke supervised learning: [t-n, ..., t-1] → t. Window size menentukan berapa jam historis yang digunakan untuk prediksi satu jam ke depan." },
                { title: "Forecasting Multi-Step", body: "Prediksi multi-step menggunakan recursive strategy: output prediksi t+1 dimasukkan kembali sebagai input untuk prediksi t+2, dan seterusnya. Error bisa bersifat akumulatif." },
                { title: "Metrik Evaluasi", body: "MAE: rata-rata error absolut. RMSE: root mean squared error (sensitif terhadap outlier). MAPE: mean absolute percentage error (interpretasi sebagai % kesalahan)." },
                { title: "Normalisasi", body: "LSTM membutuhkan input ternormalisasi [0,1] (min-max scaling). Prediksi dikonversi kembali ke nilai asli (denormalisasi) sebelum ditampilkan." },
              ].map((item) => (
                <div key={item.title} style={{ background: C.pageBg, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.bodyText, lineHeight: 1.65 }}>{item.body}</div>
                </div>
              ))}
            </div>

            {/* LSTM Cell Diagram */}
            <div style={{ background: C.darkBlue, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                LSTM Cell — Alur Informasi
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { label: "Input Sekuens", sub: "[t-n … t-1]", color: "#3b82f6" },
                  { arrow: "→" },
                  { label: "Forget Gate", sub: "σ(Wf·[h,x]+b)", color: "#ef4444" },
                  { arrow: "+" },
                  { label: "Input Gate", sub: "σ(Wi) ⊙ tanh(Wc)", color: "#f59e0b" },
                  { arrow: "+" },
                  { label: "Output Gate", sub: "σ(Wo) ⊙ tanh(C)", color: "#10b981" },
                  { arrow: "→" },
                  { label: "Prediksi", sub: "ŷ(t+1)", color: C.orange },
                ].map((n, i) =>
                  n.arrow ? (
                    <span key={i} style={{ color: "rgba(255,255,255,0.35)", fontSize: 20 }}>{n.arrow}</span>
                  ) : (
                    <div key={i} style={{ background: n.color, borderRadius: 8, padding: "8px 14px", textAlign: "center", minWidth: 90 }}>
                      <div style={{ color: "#fff", fontSize: 10, opacity: 0.85, marginBottom: 2 }}>{n.label}</div>
                      <div style={{ color: "#fff", fontSize: 9, opacity: 0.7 }}>{n.sub}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── Config & Training ── */}
        <Card style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Settings size={17} color={C.blue} strokeWidth={1.8} />
            <SectionTitle>Konfigurasi Model</SectionTitle>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: C.bodyText, fontWeight: 500, display: "block", marginBottom: 6 }}>
                Target Prediksi
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                disabled={status === "training"}
                style={{
                  width: "100%", padding: "9px 10px", borderRadius: 10,
                  border: `1.5px solid #e2e8f0`, fontSize: 13,
                  background: C.inputBg, color: C.darkBlue,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <option value="total_amount">Total Amount per Jam</option>
                <option value="count">Jumlah Transaksi per Jam</option>
              </select>
            </div>
            <SliderField label="Window Size" value={windowSize} min="2" max="8" step="1"
              onChange={(e) => setWindowSize(Number(e.target.value))} disabled={status === "training"}
              hint="Jam historis sebagai input" />
            <SliderField label="LSTM Units" value={lstmUnits} min="8" max="64" step="8"
              onChange={(e) => setLstmUnits(Number(e.target.value))} disabled={status === "training"} />
            <SliderField label="Epoch" value={totalEpochs} min="20" max="200" step="20"
              onChange={(e) => setTotalEpochs(Number(e.target.value))} disabled={status === "training"} />
            <SliderField label="Forecast Steps" value={`${forecastSteps} jam`} min="1" max="12" step="1"
              onChange={(e) => setForecastSteps(Number(e.target.value))} disabled={status === "training"} />
          </div>

          {/* Arsitektur summary */}
          <div style={{
            background: C.pageBg, borderRadius: 12, padding: "12px 16px",
            marginBottom: 20, fontSize: 12, color: C.bodyText,
            display: "flex", gap: 20, flexWrap: "wrap",
            border: `1px solid ${C.border}`,
          }}>
            <span>Input: <b style={{ color: C.darkBlue }}>[{windowSize}, 1]</b></span>
            <span>LSTM: <b style={{ color: C.purple }}>{lstmUnits} units</b></span>
            <span>Dropout: <b>0.1</b></span>
            <span>Dense: <b>16 → 1</b></span>
            <span>Loss: <b>MSE</b></span>
            <span>Optimizer: <b>Adam(lr=0.001)</b></span>
          </div>

          {/* Progress bar */}
          {status === "training" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%", width: `${(epoch / totalEpochs) * 100}%`,
                  background: `linear-gradient(90deg, ${C.blue}, ${C.purple})`,
                  borderRadius: 99, transition: "width 0.2s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: C.bodyText }}>
                Training: Epoch {epoch}/{totalEpochs}
                {lossHistory.length > 0 && ` · Loss: ${lossHistory[lossHistory.length - 1].loss.toFixed(6)}`}
              </div>
            </div>
          )}

          <button
            onClick={trainModel}
            disabled={status === "training" || loading || !data?.length}
            style={{
              background: status === "training"
                ? "#e2e8f0"
                : `linear-gradient(135deg, ${C.orange} 0%, #e05800 100%)`,
              color: status === "training" ? C.mutedText : "#fff",
              border: "none", borderRadius: 12,
              padding: "14px 28px", fontWeight: 700, fontSize: 14,
              cursor: status === "training" ? "not-allowed" : "pointer",
              boxShadow: status === "training" ? "none" : "0 6px 22px rgba(243,112,33,0.3)",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 200ms", fontFamily: "'DM Sans', sans-serif",
              opacity: (!data?.length || loading) ? 0.65 : 1,
            }}
          >
            {status === "training"
              ? <><Activity size={16} /> Melatih... ({epoch}/{totalEpochs})</>
              : status === "done"
              ? <><RefreshCw size={16} /> Latih Ulang</>
              : <><Play size={16} /> Mulai Training</>
            }
          </button>

          {status === "error" && (
            <div style={{ marginTop: 12, color: C.red, fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
              <AlertTriangle size={14} /> Error saat training. Coba kurangi window size atau tambah data.
            </div>
          )}
        </Card>

        {/* ── Loss Curve ── */}
        {lossHistory.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <TrendingDown size={17} color={C.purple} strokeWidth={1.8} />
              <SectionTitle>Training Loss</SectionTitle>
            </div>
            {status === "done" && (
              <div style={{ fontSize: 12, color: C.bodyText, marginBottom: 16 }}>
                Loss awal: <b>{lossHistory[0]?.loss.toFixed(6)}</b>
                {" · "}Loss akhir: <b style={{ color: C.green }}>{lossHistory[lossHistory.length - 1]?.loss.toFixed(6)}</b>
                {" · "}Penurunan:{" "}
                <b style={{ color: C.green }}>
                  {(((lossHistory[0]?.loss - lossHistory[lossHistory.length - 1]?.loss) / lossHistory[0]?.loss) * 100).toFixed(1)}%
                </b>
              </div>
            )}
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={lossHistory} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.purple} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={C.purple} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="epoch" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => v.toFixed(5)} />
                <Tooltip formatter={(v) => [v.toFixed(6), "MSE Loss"]} labelFormatter={(l) => `Epoch ${l}`} />
                <Area type="monotone" dataKey="loss" stroke={C.purple} fill="url(#lossGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── Results ── */}
        {status === "done" && results && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 20, marginBottom: 24 }}>
              <KPICard label="MAE"               value={fmtK(results.mae)}   sub="Mean Absolute Error"          color={C.blue}   icon={Activity} />
              <KPICard label="RMSE"              value={fmtK(results.rmse)}  sub="Root Mean Squared Error"      color={C.purple} icon={BarChart2} />
              <KPICard label="MAPE"              value={`${results.mape.toFixed(1)}%`} sub="Mean Abs. Percentage Error"
                color={results.mape < 15 ? C.green : results.mape < 30 ? C.amber : C.red} icon={CheckCircle} />
              <KPICard label="Jam Puncak (Aktual)" value={results.peakHour.label} sub={fmtK(results.peakHour.value)} color={C.orange} icon={ArrowUp} />
              <KPICard label="Jam Sepi (Aktual)"   value={results.lowHour.label}  sub={fmtK(results.lowHour.value)}  color={C.teal}   icon={ArrowDown} />
              <KPICard label={`Forecast +${forecastSteps}j`} value={fmtK(results.forecastDenorm[forecastSteps - 1])}
                sub={`Jam ke-${forecastSteps} berikutnya`} color={C.green} icon={ChevronRight} />
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: "flex", gap: 4, background: "#e8edf5",
              borderRadius: 12, padding: 4, marginBottom: 24, width: "fit-content",
            }}>
              <TabBtn id="forecast" label="Forecast"       icon={TrendingUp}  />
              <TabBtn id="actual"   label="Aktual vs Pred" icon={BarChart2}   />
              <TabBtn id="residual" label="Residual"       icon={TrendingDown}/>
              <TabBtn id="heatmap"  label="Pola Jam"       icon={Clock}       />
            </div>

            {/* ── Tab: Forecast ── */}
            {activeTab === "forecast" && (
              <Card style={{ marginBottom: 24 }}>
                <SectionTitle sub={`Garis biru = data aktual · Garis oranye putus-putus = forecast LSTM`}>
                  Prediksi {forecastSteps} Jam ke Depan
                </SectionTitle>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={[
                      ...results.chartActual.map((d) => ({ label: d.label, aktual: d.aktual })),
                      ...results.forecastChart.map((d) => ({ label: d.label, forecast: d.forecast })),
                    ]}
                    margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} angle={-30} textAnchor="end" height={44} />
                    <YAxis fontSize={11} tickFormatter={fmtK} />
                    <Tooltip content={<ForecastTip />} />
                    <Legend />
                    <Line type="monotone" dataKey="aktual"   name="Aktual"        stroke={C.blue}   strokeWidth={2.5} dot={{ r: 3, fill: C.blue }}   connectNulls={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="forecast" name="Forecast LSTM" stroke={C.orange} strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 4, fill: C.orange }} connectNulls={false} isAnimationActive={false} />
                    <ReferenceLine x="00:00" stroke="#e2e8f0" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>

                {/* Forecast table */}
                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, marginBottom: 12 }}>Detail Forecast</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                    {results.forecastDenorm.map((v, i) => {
                      const prev = i === 0 ? results.rawSeries[results.rawSeries.length - 1] : results.forecastDenorm[i - 1];
                      const delta = prev > 0 ? ((v - prev) / prev) * 100 : 0;
                      return (
                        <div key={i} style={{
                          background: C.pageBg, borderRadius: 12, padding: "12px 14px",
                          borderTop: `3px solid ${v > prev ? C.green : C.red}`,
                          border: `1px solid ${C.border}`,
                        }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.mutedText, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4 }}>+{i + 1} jam</div>
                          <div style={{ fontWeight: 800, color: C.darkBlue, fontSize: 15 }}>{fmtK(v)}</div>
                          <div style={{ fontSize: 11, color: delta >= 0 ? C.green : C.red, marginTop: 4, display: "flex", alignItems: "center", gap: 3 }}>
                            {delta >= 0 ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                            {Math.abs(delta).toFixed(1)}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* ── Tab: Aktual vs Prediksi ── */}
            {activeTab === "actual" && (
              <Card style={{ marginBottom: 24 }}>
                <SectionTitle sub="Seberapa baik model merekonstruksi data training (window awal tidak ada prediksi)">
                  Aktual vs Prediksi In-Sample
                </SectionTitle>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={results.chartActual} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} angle={-30} textAnchor="end" height={44} />
                    <YAxis fontSize={11} tickFormatter={fmtK} />
                    <Tooltip content={<ForecastTip />} />
                    <Legend />
                    <Line type="monotone" dataKey="aktual"   name="Aktual"   stroke={C.blue}   strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="prediksi" name="Prediksi" stroke={C.orange} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {[
                    { label: "MAE",  val: fmtK(results.mae),  desc: "Rata-rata selisih absolut",  color: C.blue },
                    { label: "RMSE", val: fmtK(results.rmse), desc: "Sensitif terhadap outlier",  color: C.purple },
                    { label: "MAPE", val: `${results.mape.toFixed(1)}%`,
                      desc: results.mape < 15 ? "Sangat baik (<15%)" : results.mape < 30 ? "Cukup baik (15–30%)" : "Kurang baik (>30%)",
                      color: results.mape < 15 ? C.green : results.mape < 30 ? C.amber : C.red },
                  ].map((m) => (
                    <div key={m.label} style={{ background: C.pageBg, borderRadius: 12, padding: "14px 16px", border: `1px solid ${C.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: C.mutedText, textTransform: "uppercase", letterSpacing: "0.1em" }}>{m.label}</div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: m.color, marginTop: 4 }}>{m.val}</div>
                      <div style={{ fontSize: 11, color: C.bodyText, marginTop: 2 }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Tab: Residual ── */}
            {activeTab === "residual" && (
              <Card style={{ marginBottom: 24 }}>
                <SectionTitle sub="Residual = Aktual − Prediksi. Idealnya tersebar acak di sekitar nol tanpa pola sistematis.">
                  Plot Residual
                </SectionTitle>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={results.residuals} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} angle={-30} textAnchor="end" height={44} />
                    <YAxis fontSize={11} tickFormatter={fmtK} />
                    <Tooltip
                      formatter={(v, n) => [n === "residual" ? fmtK(v) : v.toFixed(1) + "%", n === "residual" ? "Residual" : "Error %"]}
                      labelFormatter={(l) => `Jam ${l}`}
                    />
                    <ReferenceLine y={0} stroke={C.mutedText} strokeWidth={1.5} />
                    <Bar dataKey="residual" radius={[4, 4, 0, 0]}>
                      {results.residuals.map((r, i) => (
                        <Cell key={i} fill={r.residual >= 0 ? C.green : C.red} opacity={0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 12, display: "flex", gap: 24, fontSize: 12, color: C.bodyText, flexWrap: "wrap" }}>
                  <span>
                    Overestimate (prediksi &gt; aktual):{" "}
                    <b style={{ color: C.red }}>
                      {results.residuals.filter((r) => r.residual < 0).length} jam
                    </b>
                  </span>
                  <span>
                    Underestimate (prediksi &lt; aktual):{" "}
                    <b style={{ color: C.green }}>
                      {results.residuals.filter((r) => r.residual > 0).length} jam
                    </b>
                  </span>
                  <span>
                    Error terbesar:{" "}
                    <b style={{ color: C.darkBlue }}>
                      {results.residuals.reduce((a, b) => Math.abs(b.residual) > Math.abs(a.residual) ? b : a).label}
                    </b>
                  </span>
                </div>
              </Card>
            )}

            {/* ── Tab: Pola Jam ── */}
            {activeTab === "heatmap" && (
              <Card style={{ marginBottom: 24 }}>
                <SectionTitle sub="Distribusi total amount dan jumlah transaksi per jam — dasar data untuk LSTM">
                  Pola Aktivitas per Jam
                </SectionTitle>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={results.hourly} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="label" fontSize={10} angle={-45} textAnchor="end" height={50} />
                    <YAxis yAxisId="amount" orientation="left"  fontSize={10} tickFormatter={fmtK} />
                    <YAxis yAxisId="count"  orientation="right" fontSize={10} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: C.cardBg, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", fontSize: 12, boxShadow: "0 8px 32px rgba(0,63,135,0.11)" }}>
                          <b style={{ color: C.darkBlue }}>{label}</b>
                          <div style={{ color: C.bodyText, marginTop: 4 }}>Total: {fmtRupiah(d.totalAmount)}</div>
                          <div style={{ color: C.bodyText }}>Transaksi: {d.count}</div>
                          <div style={{ color: C.bodyText }}>CR: {fmtK(d.crAmount)} · DR: {fmtK(d.drAmount)}</div>
                        </div>
                      );
                    }} />
                    <Legend />
                    <Bar yAxisId="amount" dataKey="totalAmount" name="Total Amount" radius={[4, 4, 0, 0]}>
                      {results.hourly.map((h, i) => (
                        <Cell key={i}
                          fill={h.value === results.peakHour.value ? C.orange : C.blue}
                          opacity={0.4 + 0.6 * (h.value / (results.peakHour.value || 1))}
                        />
                      ))}
                    </Bar>
                    <Bar yAxisId="count" dataKey="count" name="Jml Transaksi" fill={C.teal} opacity={0.6} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, marginBottom: 12 }}>Segmentasi Sesi Kerja</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {[
                      { label: "Pagi (07–11)",   hours: [7, 8, 9, 10] },
                      { label: "Siang (11–14)",  hours: [11, 12, 13] },
                      { label: "Sore (14–17)",   hours: [14, 15, 16] },
                      { label: "Malam (17–21)",  hours: [17, 18, 19, 20] },
                      { label: "Off-Hours",       hours: [0,1,2,3,4,5,6,21,22,23] },
                    ].map((seg) => {
                      const total = results.hourly.filter((h) => seg.hours.includes(h.hour)).reduce((s, h) => s + h.value, 0);
                      const cnt   = results.hourly.filter((h) => seg.hours.includes(h.hour)).reduce((s, h) => s + h.count, 0);
                      return (
                        <div key={seg.label} style={{ background: C.pageBg, borderRadius: 12, padding: "12px 14px", border: `1px solid ${C.border}` }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: C.mutedText, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{seg.label}</div>
                          <div style={{ fontWeight: 800, color: C.darkBlue, fontSize: 15 }}>{fmtK(total)}</div>
                          <div style={{ fontSize: 11, color: C.bodyText, marginTop: 2 }}>{cnt} transaksi</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* ── Academic Summary ── */}
            <Card accentColor={C.green}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Info size={17} color={C.green} strokeWidth={1.8} />
                <SectionTitle>Interpretasi Model (Akademik)</SectionTitle>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
                {[
                  { title: "Arsitektur yang Digunakan", body: `LSTM(${lstmUnits}) → Dropout(0.1) → Dense(16, ReLU) → Dense(1). Input shape: [${windowSize}, 1]. Loss: MSE. Optimizer: Adam(lr=0.001). Epoch: ${totalEpochs}.` },
                  { title: "Preprocessing", body: `Data diagregasi per jam (24 titik). Min-Max normalization [0,1]. Sliding window size=${windowSize} menghasilkan ${24 - windowSize} sampel training.` },
                  { title: "Evaluasi Model", body: `MAPE ${results.mape.toFixed(1)}% — ${results.mape < 15 ? "sangat baik, model layak digunakan untuk prediksi." : results.mape < 30 ? "cukup baik, masih ada ruang perbaikan." : "model perlu perbaikan: tambah epoch atau sesuaikan arsitektur."}` },
                  { title: "Forecast Rekursif", body: `${forecastSteps} langkah ke depan menggunakan recursive multi-step. Prediksi ${forecastSteps === 1 ? "1 langkah" : `${forecastSteps} langkah`} memberikan estimasi aktivitas transaksi jam berikutnya.` },
                  { title: "Jam Puncak & Sepi", body: `Jam puncak: ${results.peakHour.label} (${fmtK(results.peakHour.value)}). Jam sepi: ${results.lowHour.label}. LSTM memanfaatkan pola temporal ini untuk prediksi.` },
                  { title: "Saran Pengembangan", body: "Tambah fitur eksternal (hari kerja, tanggal gajian) sebagai multivariate LSTM. Coba Seq2Seq atau Temporal Fusion Transformer untuk akurasi lebih tinggi." },
                ].map((item) => (
                  <div key={item.title} style={{ background: C.pageBg, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 12, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: C.bodyText, lineHeight: 1.65 }}>{item.body}</div>
                  </div>
                ))}
              </div>

              {/* Comparison table */}
              <div style={{ fontSize: 13, fontWeight: 700, color: C.darkBlue, marginBottom: 12 }}>
                Perbandingan Metode Time Series
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'DM Sans', sans-serif" }}>
                  <thead>
                    <tr style={{ background: C.pageBg }}>
                      {["Metode", "Jenis", "Kompleksitas", "Tangani Non-linear", "Multi-step", "Cocok Untuk"].map((h) => (
                        <th key={h} style={{
                          padding: "10px 12px", textAlign: "left", fontWeight: 700,
                          color: C.mutedText, fontSize: 10, letterSpacing: "0.1em",
                          textTransform: "uppercase", borderBottom: `2px solid ${C.border}`,
                          whiteSpace: "nowrap",
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ["ARIMA",         "Statistik",     "Rendah",        "✗",        "Terbatas", "Data stasioner"],
                      ["Holt-Winters",  "Statistik",     "Rendah",        "Sebagian", "✓",        "Data musiman"],
                      ["Random Forest", "ML",            "Menengah",      "✓",        "✓",        "Fitur banyak"],
                      ["LSTM ★",        "Deep Learning", "Tinggi",        "✓",        "✓",        "Pola kompleks, temporal"],
                      ["Transformer",   "Deep Learning", "Sangat Tinggi", "✓",        "✓",        "Data sangat panjang"],
                    ].map((row, i) => (
                      <tr key={i} style={{
                        background: row[0].includes("★") ? C.badgeBg : i % 2 === 0 ? C.cardBg : C.pageBg,
                        borderBottom: `1px solid ${C.border}`,
                      }}>
                        {row.map((cell, j) => (
                          <td key={j} style={{
                            padding: "10px 12px",
                            color: row[0].includes("★") && j === 0 ? C.blue : C.bodyText,
                            fontWeight: row[0].includes("★") && j === 0 ? 700 : 400,
                          }}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ── Idle state ── */}
        {status === "idle" && (
          <Card style={{ textAlign: "center", padding: "56px 32px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: C.badgeBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <TrendingUp size={30} color={C.blue} strokeWidth={1.6} />
            </div>
            <h3 style={{
              margin: "0 0 8px", color: C.darkBlue,
              fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800,
            }}>
              Siap Melatih Model LSTM
            </h3>
            <p style={{ color: C.bodyText, fontSize: 14, margin: "0 0 28px", maxWidth: 420, marginInline: "auto" }}>
              {data?.length
                ? `${data.length} transaksi terdeteksi. Model akan mempelajari pola transaksi per jam dan memprediksi ${forecastSteps} jam ke depan.`
                : "Belum ada data. Pastikan prop data sudah terisi."}
            </p>
            {data?.length > 0 && (
              <button
                onClick={trainModel}
                style={{
                  background: `linear-gradient(135deg, ${C.orange} 0%, #e05800 100%)`,
                  color: "#fff", border: "none", borderRadius: 12,
                  padding: "14px 32px", fontWeight: 700, fontSize: 14, cursor: "pointer",
                  boxShadow: "0 8px 28px rgba(243,112,33,0.35)",
                  display: "inline-flex", alignItems: "center", gap: 8,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                <Play size={16} /> Mulai Training
              </button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}