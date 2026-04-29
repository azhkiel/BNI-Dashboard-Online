import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, ReferenceLine,
  AreaChart, Area, Legend,
} from "recharts";

/* ─── Design tokens ─────────────────────────────────────────── */
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const RED        = "#dc2626";
const GREEN      = "#16a34a";
const PURPLE     = "#7c3aed";
const TEAL       = "#0d9488";
const GRAY       = "#94a3b8";
const BG         = "#F0F4FA";

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
  const mn = Math.min(...arr);
  const mx = Math.max(...arr);
  const rng = mx - mn || 1;
  return {
    norm: arr.map((v) => (v - mn) / rng),
    min: mn, max: mx,
    denorm: (v) => v * rng + mn,
  };
}

/* ─── Build sequences (sliding window) ──────────────────────── */
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
  model.add(tf.layers.lstm({
    units: lstmUnits,
    inputShape: [windowSize, 1],
    returnSequences: false,
  }));
  model.add(tf.layers.dropout({ rate: 0.1 }));
  model.add(tf.layers.dense({ units: 16, activation: "relu" }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: tf.train.adam(0.001), loss: "meanSquaredError" });
  return model;
}

/* ─── Card ───────────────────────────────────────────────────── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
      padding: "20px 24px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function KPICard({ label, value, sub, color = BNI_BLUE }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
      padding: "18px 20px",
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── Custom tooltip ─────────────────────────────────────────── */
function ForecastTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
      padding: "10px 14px", fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6, color: BNI_BLUE }}>{label}</div>
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

  /* cleanup */
  useEffect(() => () => { modelRef.current?.dispose(); }, []);

  /* ── Training ────────────────────────────────────────────────── */
  const trainModel = useCallback(async () => {
    if (!data || data.length < 5) return;
    setStatus("training");
    setEpoch(0);
    setLossHistory([]);
    setResults(null);

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

      /* ── In-sample predictions ── */
      const predNorm = await model.predict(xs).array();
      const inSamplePreds = predNorm.map(([v]) => denorm(v));

      /* ── Forecast next N hours ── */
      let forecastSeq = [...norm.slice(-windowSize)];
      const forecastNorm = [];
      for (let i = 0; i < forecastSteps; i++) {
        const inp = tf.tensor3d([forecastSeq.map((v) => [v])]);
        const out = model.predict(inp);
        const val = (await out.array())[0][0];
        forecastNorm.push(val);
        forecastSeq = [...forecastSeq.slice(1), val];
        out.dispose();
        inp.dispose();
      }
      const forecastDenorm = forecastNorm.map(denorm);

      /* ── Metrics ── */
      const actuals = rawSeries.slice(windowSize);
      const mae  = actuals.reduce((s, a, i) => s + Math.abs(a - inSamplePreds[i]), 0) / actuals.length;
      const rmse = Math.sqrt(actuals.reduce((s, a, i) => s + (a - inSamplePreds[i]) ** 2, 0) / actuals.length);
      const mape = actuals.reduce((s, a, i) => s + (a > 0 ? Math.abs((a - inSamplePreds[i]) / a) : 0), 0) / actuals.length * 100;

      /* ── Chart data: actual + predicted overlay ── */
      const chartActual = hourly.map((h, i) => ({
        label: h.label,
        hour: h.hour,
        aktual: h.value,
        prediksi: i >= windowSize ? inSamplePreds[i - windowSize] : null,
      }));

      /* ── Forecast chart (continue from hour 23) ── */
      const lastHour = 23;
      const forecastChart = forecastDenorm.map((v, i) => ({
        label: `+${i + 1}h`,
        hour: lastHour + i + 1,
        forecast: Math.max(0, v),
      }));

      /* ── Residuals ── */
      const residuals = actuals.map((a, i) => ({
        label: hourly[i + windowSize].label,
        residual: a - inSamplePreds[i],
        pct: a > 0 ? ((a - inSamplePreds[i]) / a) * 100 : 0,
      }));

      xs.dispose();
      ys.dispose();

      setResults({
        hourly, rawSeries, inSamplePreds, forecastDenorm,
        chartActual, forecastChart, residuals,
        mae, rmse, mape, losses,
        min, max, norm,
        peakHour: hourly.reduce((a, b) => b.value > a.value ? b : a),
        lowHour: hourly.filter((h) => h.value > 0).reduce((a, b) => b.value < a.value ? b : a),
      });
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [data, totalEpochs, windowSize, lstmUnits, forecastSteps, metric]);

  /* ── render helper: tab button ── */
  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      style={{
        padding: "8px 18px", borderRadius: 8, fontWeight: 600, fontSize: 13,
        border: "none", cursor: "pointer",
        background: activeTab === id ? BNI_BLUE : "transparent",
        color: activeTab === id ? "#fff" : "#64748b",
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );

  /* ──────────────────────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${BNI_BLUE}, ${BNI_BLUE2})`,
        padding: "24px 32px",
        color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.7, marginBottom: 4 }}>
              BNI LIFE INSURANCE · TIME SERIES FORECASTING
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
              LSTM Forecasting Transaksi
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.75 }}>
              Prediksi pola transaksi per jam menggunakan Long Short-Term Memory · TensorFlow.js
            </p>
          </div>
          <button
            onClick={() => setShowTheory((v) => !v)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff", borderRadius: 8, padding: "8px 16px",
              cursor: "pointer", fontSize: 13,
            }}
          >
            {showTheory ? "Tutup Teori" : "📖 Teori"}
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ── Theory Panel ── */}
        {showTheory && (
          <Card style={{ marginBottom: 24, borderLeft: `4px solid ${BNI_ORANGE}` }}>
            <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 16 }}>📚 Teori: LSTM untuk Time Series Forecasting</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {[
                {
                  title: "Apa itu LSTM?",
                  body: "Long Short-Term Memory (LSTM) adalah jenis Recurrent Neural Network (RNN) yang mampu mempelajari dependensi jangka panjang dalam data sekuensial, mengatasi masalah vanishing gradient pada RNN biasa.",
                },
                {
                  title: "Gate Mechanism",
                  body: "LSTM memiliki 3 gate: Forget Gate (lupakan info lama), Input Gate (simpan info baru), Output Gate (keluarkan prediksi). Setiap gate menggunakan fungsi sigmoid untuk mengatur aliran informasi.",
                },
                {
                  title: "Sliding Window",
                  body: "Data deret waktu dikonversi ke supervised learning: [t-n, ..., t-1] → t. Window size menentukan berapa jam historis yang digunakan untuk prediksi satu jam ke depan.",
                },
                {
                  title: "Forecasting Multi-Step",
                  body: "Prediksi multi-step menggunakan recursive strategy: output prediksi t+1 dimasukkan kembali sebagai input untuk prediksi t+2, dan seterusnya. Error bisa akumulatif.",
                },
                {
                  title: "Metrik Evaluasi",
                  body: "MAE: rata-rata error absolut. RMSE: root mean squared error (sensitif terhadap outlier). MAPE: mean absolute percentage error (interpretasi sebagai % kesalahan).",
                },
                {
                  title: "Normalisasi",
                  body: "LSTM membutuhkan input ternormalisasi [0,1] (min-max scaling). Prediksi dikonversi kembali ke nilai asli (denormalisasi) sebelum ditampilkan.",
                },
              ].map((item) => (
                <div key={item.title} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{item.body}</div>
                </div>
              ))}
            </div>

            {/* LSTM Cell Diagram */}
            <div style={{ marginTop: 20, padding: "20px 24px", background: BNI_BLUE, borderRadius: 12 }}>
              <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
                LSTM CELL — ALUR INFORMASI
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                {[
                  { label: "Input Sekuens", sub: "[t-n … t-1]", color: "#3b82f6" },
                  { label: "→" },
                  { label: "Forget Gate", sub: "σ(Wf·[h,x]+b)", color: "#ef4444" },
                  { label: "+" },
                  { label: "Input Gate", sub: "σ(Wi) ⊙ tanh(Wc)", color: "#f59e0b" },
                  { label: "+" },
                  { label: "Output Gate", sub: "σ(Wo) ⊙ tanh(C)", color: "#10b981" },
                  { label: "→" },
                  { label: "Prediksi", sub: "ŷ(t+1)", color: BNI_ORANGE },
                ].map((n, i) =>
                  n.label === "→" || n.label === "+" ? (
                    <span key={i} style={{ color: "rgba(255,255,255,0.4)", fontSize: 20 }}>{n.label}</span>
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
          <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 15 }}>⚙ Konfigurasi Model</h3>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 20, marginBottom: 20 }}>
            {/* Metric */}
            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500, display: "block", marginBottom: 6 }}>
                Target Prediksi
              </label>
              <select
                value={metric}
                onChange={(e) => setMetric(e.target.value)}
                disabled={status === "training"}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 13 }}
              >
                <option value="total_amount">Total Amount per Jam</option>
                <option value="count">Jumlah Transaksi per Jam</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                Window Size: <b style={{ color: BNI_BLUE }}>{windowSize}</b>
              </label>
              <input type="range" min="2" max="8" step="1"
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                style={{ width: "100%", marginTop: 6 }}
                disabled={status === "training"}
              />
              <div style={{ fontSize: 10, color: "#94a3b8" }}>Jam historis sebagai input</div>
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                LSTM Units: <b style={{ color: BNI_BLUE }}>{lstmUnits}</b>
              </label>
              <input type="range" min="8" max="64" step="8"
                value={lstmUnits}
                onChange={(e) => setLstmUnits(Number(e.target.value))}
                style={{ width: "100%", marginTop: 6 }}
                disabled={status === "training"}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                Epoch: <b style={{ color: BNI_BLUE }}>{totalEpochs}</b>
              </label>
              <input type="range" min="20" max="200" step="20"
                value={totalEpochs}
                onChange={(e) => setTotalEpochs(Number(e.target.value))}
                style={{ width: "100%", marginTop: 6 }}
                disabled={status === "training"}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                Forecast Steps: <b style={{ color: BNI_BLUE }}>{forecastSteps} jam</b>
              </label>
              <input type="range" min="1" max="12" step="1"
                value={forecastSteps}
                onChange={(e) => setForecastSteps(Number(e.target.value))}
                style={{ width: "100%", marginTop: 6 }}
                disabled={status === "training"}
              />
            </div>
          </div>

          {/* Arsitektur summary */}
          <div style={{
            background: "#f8fafc", borderRadius: 10, padding: "12px 16px",
            marginBottom: 16, fontSize: 12, color: "#475569",
            display: "flex", gap: 24, flexWrap: "wrap",
          }}>
            <span>Input: <b style={{ color: BNI_BLUE }}>[{windowSize}, 1]</b></span>
            <span>LSTM: <b style={{ color: PURPLE }}>{lstmUnits} units</b></span>
            <span>Dropout: <b>0.1</b></span>
            <span>Dense: <b>16 → 1</b></span>
            <span>Loss: <b>MSE</b></span>
            <span>Optimizer: <b>Adam(lr=0.001)</b></span>
          </div>

          {/* Progress bar */}
          {status === "training" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%",
                  width: `${(epoch / totalEpochs) * 100}%`,
                  background: `linear-gradient(90deg, ${BNI_BLUE}, ${PURPLE})`,
                  borderRadius: 99, transition: "width 0.2s",
                }} />
              </div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                Training: Epoch {epoch}/{totalEpochs}
                {lossHistory.length > 0 && ` · Loss: ${lossHistory[lossHistory.length - 1].loss.toFixed(6)}`}
              </div>
            </div>
          )}

          <button
            onClick={trainModel}
            disabled={status === "training" || loading || !data?.length}
            style={{
              background: status === "training" ? "#e2e8f0" : BNI_BLUE,
              color: status === "training" ? "#94a3b8" : "#fff",
              border: "none", borderRadius: 10, padding: "12px 28px",
              fontWeight: 600, fontSize: 14, cursor: status === "training" ? "not-allowed" : "pointer",
            }}
          >
            {status === "training"
              ? `⏳ Melatih... (${epoch}/${totalEpochs})`
              : status === "done" ? "🔄 Latih Ulang" : "🚀 Mulai Training"}
          </button>

          {status === "error" && (
            <div style={{ marginTop: 12, color: RED, fontSize: 13 }}>
              ❌ Error saat training. Coba kurangi window size atau tambah data.
            </div>
          )}
        </Card>

        {/* ── Loss Curve ── */}
        {lossHistory.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>📉 Training Loss</h3>
            {status === "done" && (
              <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                Loss awal: <b>{lossHistory[0]?.loss.toFixed(6)}</b>
                {" · "}Loss akhir: <b style={{ color: GREEN }}>{lossHistory[lossHistory.length - 1]?.loss.toFixed(6)}</b>
                {" · "}Penurunan: <b style={{ color: GREEN }}>
                  {(((lossHistory[0]?.loss - lossHistory[lossHistory.length - 1]?.loss) / lossHistory[0]?.loss) * 100).toFixed(1)}%
                </b>
              </div>
            )}
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={lossHistory} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                <defs>
                  <linearGradient id="lossGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={PURPLE} stopOpacity={0.15} />
                    <stop offset="95%" stopColor={PURPLE} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="epoch" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => v.toFixed(5)} />
                <Tooltip formatter={(v) => [v.toFixed(6), "MSE Loss"]} labelFormatter={(l) => `Epoch ${l}`} />
                <Area type="monotone" dataKey="loss" stroke={PURPLE} fill="url(#lossGrad)" strokeWidth={2} dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── Results ── */}
        {status === "done" && results && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
              <KPICard
                label="MAE"
                value={fmtK(results.mae)}
                sub="Mean Absolute Error"
                color={BNI_BLUE}
              />
              <KPICard
                label="RMSE"
                value={fmtK(results.rmse)}
                sub="Root Mean Squared Error"
                color={PURPLE}
              />
              <KPICard
                label="MAPE"
                value={`${results.mape.toFixed(1)}%`}
                sub="Mean Abs. Percentage Error"
                color={results.mape < 15 ? GREEN : results.mape < 30 ? AMBER : RED}
              />
              <KPICard
                label="Jam Puncak (Aktual)"
                value={results.peakHour.label}
                sub={fmtK(results.peakHour.value)}
                color={BNI_ORANGE}
              />
              <KPICard
                label="Jam Sepi (Aktual)"
                value={results.lowHour.label}
                sub={fmtK(results.lowHour.value)}
                color={TEAL}
              />
              <KPICard
               label={`Forecast +${forecastSteps}j`}
                value={fmtK(results.forecastDenorm[forecastSteps - 1])}
                sub={`Jam ke-${forecastSteps} berikutnya`}
                color={GREEN}
              />
            </div>

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4, marginBottom: 24, width: "fit-content" }}>
              <TabBtn id="forecast"  label="📈 Forecast"      />
              <TabBtn id="actual"    label="📊 Aktual vs Pred" />
              <TabBtn id="residual"  label="📉 Residual"       />
              <TabBtn id="heatmap"   label="🕐 Pola Jam"       />
            </div>

            {/* ── Tab: Forecast ── */}
            {activeTab === "forecast" && (
              <Card style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>
                  Prediksi {forecastSteps} Jam ke Depan
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                  Garis biru = data aktual hari ini · Garis oranye putus-putus = forecast LSTM
                </p>

                {/* Combined chart: actual (all 24h) + forecast */}
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart
                    data={[
                      ...results.chartActual.map((d) => ({ label: d.label, aktual: d.aktual })),
                      ...results.forecastChart.map((d) => ({ label: d.label, forecast: d.forecast })),
                    ]}
                    margin={{ top: 8, right: 24, bottom: 8, left: 16 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={11} angle={-30} textAnchor="end" height={44} />
                    <YAxis fontSize={11} tickFormatter={fmtK} />
                    <Tooltip content={<ForecastTip />} />
                    <Legend />
                    <Line
                      type="monotone" dataKey="aktual" name="Aktual"
                      stroke={BNI_BLUE} strokeWidth={2.5} dot={{ r: 3, fill: BNI_BLUE }}
                      connectNulls={false} isAnimationActive={false}
                    />
                    <Line
                      type="monotone" dataKey="forecast" name="Forecast LSTM"
                      stroke={BNI_ORANGE} strokeWidth={2.5} strokeDasharray="6 3"
                      dot={{ r: 4, fill: BNI_ORANGE }} connectNulls={false}
                      isAnimationActive={false}
                    />
                    <ReferenceLine x="00:00" stroke="#e2e8f0" strokeWidth={1} />
                  </LineChart>
                </ResponsiveContainer>

                {/* Forecast table */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 13, marginBottom: 10 }}>
                    Detail Forecast
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10 }}>
                    {results.forecastDenorm.map((v, i) => {
                      const prev = i === 0
                        ? results.rawSeries[results.rawSeries.length - 1]
                        : results.forecastDenorm[i - 1];
                      const delta = prev > 0 ? ((v - prev) / prev) * 100 : 0;
                      return (
                        <div key={i} style={{
                          background: "#f8fafc", borderRadius: 10, padding: "12px 14px",
                          borderTop: `3px solid ${v > prev ? GREEN : RED}`,
                        }}>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>+{i + 1} jam</div>
                          <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 15 }}>{fmtK(v)}</div>
                          <div style={{ fontSize: 11, color: delta >= 0 ? GREEN : RED, marginTop: 2 }}>
                            {delta >= 0 ? "▲" : "▼"} {Math.abs(delta).toFixed(1)}%
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
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>
                  Aktual vs Prediksi In-Sample
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                  Seberapa baik model merekonstruksi data training (window awal tidak ada prediksi)
                </p>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={results.chartActual} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={11} angle={-30} textAnchor="end" height={44} />
                    <YAxis fontSize={11} tickFormatter={fmtK} />
                    <Tooltip content={<ForecastTip />} />
                    <Legend />
                    <Line type="monotone" dataKey="aktual"   name="Aktual"   stroke={BNI_BLUE}   strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    <Line type="monotone" dataKey="prediksi" name="Prediksi" stroke={BNI_ORANGE} strokeWidth={2} strokeDasharray="5 3" dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  {[
                    { label: "MAE", val: fmtK(results.mae), desc: "Rata-rata selisih absolut", color: BNI_BLUE },
                    { label: "RMSE", val: fmtK(results.rmse), desc: "Sensitif terhadap outlier", color: PURPLE },
                    { label: "MAPE", val: `${results.mape.toFixed(1)}%`, desc: results.mape < 15 ? "Sangat baik (<15%)" : results.mape < 30 ? "Cukup baik (15–30%)" : "Kurang baik (>30%)", color: results.mape < 15 ? GREEN : results.mape < 30 ? AMBER : RED },
                  ].map((m) => (
                    <div key={m.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 16px" }}>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{m.label}</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: m.color }}>{m.val}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{m.desc}</div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* ── Tab: Residual ── */}
            {activeTab === "residual" && (
              <Card style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>Plot Residual</h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                  Residual = Aktual − Prediksi. Idealnya tersebar acak di sekitar nol (tanpa pola sistematis).
                </p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={results.residuals} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={11} angle={-30} textAnchor="end" height={44} />
                    <YAxis fontSize={11} tickFormatter={fmtK} />
                    <Tooltip
                      formatter={(v, n) => [n === "residual" ? fmtK(v) : v.toFixed(1) + "%", n === "residual" ? "Residual" : "Error %"]}
                      labelFormatter={(l) => `Jam ${l}`}
                    />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1.5} />
                    <Bar dataKey="residual" radius={[3, 3, 0, 0]}>
                      {results.residuals.map((r, i) => (
                        <Cell key={i} fill={r.residual >= 0 ? GREEN : RED} opacity={0.75} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div style={{ marginTop: 12, display: "flex", gap: 24, fontSize: 12, color: "#64748b", flexWrap: "wrap" }}>
                  <span>
                    Overestimate (prediksi &gt; aktual):
                    <b style={{ color: RED, marginLeft: 4 }}>
                      {results.residuals.filter((r) => r.residual < 0).length} jam
                    </b>
                  </span>
                  <span>
                    Underestimate (prediksi &lt; aktual):
                    <b style={{ color: GREEN, marginLeft: 4 }}>
                      {results.residuals.filter((r) => r.residual > 0).length} jam
                    </b>
                  </span>
                  <span>
                    Error terbesar:
                    <b style={{ color: BNI_BLUE, marginLeft: 4 }}>
                      {results.residuals.reduce((a, b) => Math.abs(b.residual) > Math.abs(a.residual) ? b : a).label}
                    </b>
                  </span>
                </div>
              </Card>
            )}

            {/* ── Tab: Pola Jam (heatmap-style bar) ── */}
            {activeTab === "heatmap" && (
              <Card style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>Pola Aktivitas per Jam</h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                  Distribusi total amount & jumlah transaksi per jam — dasar data untuk LSTM
                </p>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={results.hourly} margin={{ top: 8, right: 24, bottom: 8, left: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" fontSize={10} angle={-45} textAnchor="end" height={50} />
                    <YAxis yAxisId="amount" orientation="left" fontSize={10} tickFormatter={fmtK} />
                    <YAxis yAxisId="count" orientation="right" fontSize={10} />
                    <Tooltip content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0]?.payload;
                      return (
                        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 12 }}>
                          <b>{label}</b>
                          <div>Total: {fmtRupiah(d.totalAmount)}</div>
                          <div>Transaksi: {d.count}</div>
                          <div>CR: {fmtK(d.crAmount)} · DR: {fmtK(d.drAmount)}</div>
                        </div>
                      );
                    }} />
                    <Legend />
                    <Bar yAxisId="amount" dataKey="totalAmount" name="Total Amount" radius={[4, 4, 0, 0]}>
                      {results.hourly.map((h, i) => (
                        <Cell key={i}
                          fill={h.value === results.peakHour.value ? BNI_ORANGE : BNI_BLUE}
                          opacity={0.4 + 0.6 * (h.value / (results.peakHour.value || 1))}
                        />
                      ))}
                    </Bar>
                    <Bar yAxisId="count" dataKey="count" name="Jml Transaksi" fill={TEAL} opacity={0.6} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>

                {/* Session breakdown */}
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 13, marginBottom: 12 }}>Segmentasi Sesi Kerja</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {[
                      { label: "Pagi (07–11)", hours: [7, 8, 9, 10] },
                      { label: "Siang (11–14)", hours: [11, 12, 13] },
                      { label: "Sore (14–17)", hours: [14, 15, 16] },
                      { label: "Malam (17–21)", hours: [17, 18, 19, 20] },
                      { label: "Off-Hours", hours: [0,1,2,3,4,5,6,21,22,23] },
                    ].map((seg) => {
                      const total = results.hourly
                        .filter((h) => seg.hours.includes(h.hour))
                        .reduce((s, h) => s + h.value, 0);
                      const cnt = results.hourly
                        .filter((h) => seg.hours.includes(h.hour))
                        .reduce((s, h) => s + h.count, 0);
                      return (
                        <div key={seg.label} style={{ background: "#f8fafc", borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{seg.label}</div>
                          <div style={{ fontWeight: 700, color: BNI_BLUE, fontSize: 15 }}>{fmtK(total)}</div>
                          <div style={{ fontSize: 11, color: "#64748b" }}>{cnt} transaksi</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Card>
            )}

            {/* ── Academic Summary ── */}
            <Card style={{ borderLeft: `4px solid ${GREEN}` }}>
              <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 15 }}>📊 Interpretasi Model (Akademik)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {[
                  {
                    title: "Arsitektur yang Digunakan",
                    body: `LSTM(${lstmUnits}) → Dropout(0.1) → Dense(16, ReLU) → Dense(1). Input shape: [${windowSize}, 1]. Loss: MSE. Optimizer: Adam(lr=0.001). Epoch: ${totalEpochs}.`,
                  },
                  {
                    title: "Preprocessing",
                    body: `Data diagregasi per jam (24 titik). Min-Max normalization [0,1]. Sliding window size=${windowSize} menghasilkan ${24 - windowSize} sampel training.`,
                  },
                  {
                    title: "Evaluasi Model",
                    body: `MAPE ${results.mape.toFixed(1)}% — ${results.mape < 15 ? "sangat baik, model layak digunakan untuk prediksi." : results.mape < 30 ? "cukup baik, masih ada ruang perbaikan." : "model perlu perbaikan: tambah epoch atau sesuaikan arsitektur."}`,
                  },
                  {
                    title: "Forecast Rekursif",
                    body: `${forecastSteps} langkah ke depan menggunakan recursive multi-step. Prediksi ${forecastSteps === 1 ? "1 langkah" : `${forecastSteps} langkah`} memberikan estimasi aktivitas transaksi jam berikutnya.`,
                  },
                  {
                    title: "Jam Puncak & Sepi",
                    body: `Jam puncak: ${results.peakHour.label} (${fmtK(results.peakHour.value)}). Jam sepi: ${results.lowHour.label}. LSTM memanfaatkan pola temporal ini untuk prediksi.`,
                  },
                  {
                    title: "Saran Pengembangan",
                    body: "Tambah fitur eksternal (hari kerja, tanggal gajian) sebagai multivariate LSTM. Coba Seq2Seq atau Temporal Fusion Transformer untuk akurasi lebih tinggi.",
                  },
                ].map((item) => (
                  <div key={item.title} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 12, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{item.body}</div>
                  </div>
                ))}
              </div>

              {/* Comparison table */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 13, marginBottom: 12 }}>
                  Perbandingan Metode Time Series
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f1f5f9" }}>
                        {["Metode", "Jenis", "Kompleksitas", "Tangani Non-linear", "Multi-step", "Cocok Untuk"].map((h) => (
                          <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: "#475569", borderBottom: "2px solid #e2e8f0", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["ARIMA", "Statistik", "Rendah", "✗", "Terbatas", "Data stasioner"],
                        ["Holt-Winters", "Statistik", "Rendah", "Sebagian", "✓", "Data musiman"],
                        ["Random Forest", "ML", "Menengah", "✓", "✓", "Fitur banyak"],
                        ["LSTM ★", "Deep Learning", "Tinggi", "✓", "✓", "Pola kompleks, temporal"],
                        ["Transformer", "Deep Learning", "Sangat Tinggi", "✓", "✓", "Data sangat panjang"],
                      ].map((row, i) => (
                        <tr key={i} style={{ background: row[0].includes("★") ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#fafbfc", borderBottom: "1px solid #f1f5f9" }}>
                          {row.map((cell, j) => (
                            <td key={j} style={{ padding: "8px 12px", color: row[0].includes("★") && j === 0 ? BNI_BLUE : "#475569", fontWeight: row[0].includes("★") && j === 0 ? 700 : 400 }}>
                              {cell}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </>
        )}

        {/* ── Idle state ── */}
        {status === "idle" && (
          <Card style={{ textAlign: "center", padding: "48px 32px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
            <h3 style={{ margin: "0 0 8px", color: BNI_BLUE }}>Siap Melatih Model LSTM</h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>
              {data?.length
                ? `${data.length} transaksi terdeteksi. Model akan mempelajari pola transaksi per jam dan memprediksi ${forecastSteps} jam ke depan.`
                : "Belum ada data. Pastikan prop data sudah terisi."}
            </p>
            {data?.length > 0 && (
              <button
                onClick={trainModel}
                style={{
                  background: BNI_BLUE, color: "#fff", border: "none",
                  borderRadius: 10, padding: "12px 32px", fontWeight: 600, fontSize: 14, cursor: "pointer",
                }}
              >
                🚀 Mulai Training
              </button>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}