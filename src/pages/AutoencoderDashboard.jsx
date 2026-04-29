import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  ReferenceLine, Legend,
} from "recharts";

/* ─── Design tokens ─────────────────────────────────────────── */
const BNI_BLUE   = "#002960";
const BNI_BLUE2  = "#003F87";
const BNI_ORANGE = "#F37021";
const RED        = "#dc2626";
const GREEN      = "#16a34a";
const AMBER      = "#d97706";
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
  return String(v);
}

/* ─── Normalization ──────────────────────────────────────────── */
function normalizeFeatures(data) {
  const amounts = data.map((r) => Number(r.AMOUNT));
  const hours   = data.map((r) => parseTimeToHour(r.TIME));

  const minA = Math.min(...amounts), maxA = Math.max(...amounts);
  const minH = Math.min(...hours),   maxH = Math.max(...hours);

  const normA = (v) => maxA === minA ? 0 : (v - minA) / (maxA - minA);
  const normH = (v) => maxH === minH ? 0 : (v - minH) / (maxH - minH);

  // Encode TYPE: CR=1 DR=0
  const encType = (r) => r.TYPE === "CR" ? 1 : 0;

  // Log transform amount for better distribution
  const logAmounts = amounts.map((a) => Math.log1p(a));
  const minLA = Math.min(...logAmounts), maxLA = Math.max(...logAmounts);
  const normLA = (v) => maxLA === minLA ? 0 : (Math.log1p(v) - minLA) / (maxLA - minLA);

  const points = data.map((r, i) => ({
    idx: i,
    raw: r,
    features: [
      normA(amounts[i]),
      normH(hours[i]),
      encType(r),
      normLA(amounts[i]),
    ],
    amount: amounts[i],
    hour:   hours[i],
  }));

  return { points, minA, maxA };
}

/* ─── Build Autoencoder Model ────────────────────────────────── */
function buildAutoencoder(inputDim, latentDim) {
  const input = tf.input({ shape: [inputDim] });

  // Encoder
  const enc1 = tf.layers.dense({ units: 8, activation: "relu" }).apply(input);
  const enc2 = tf.layers.dense({ units: latentDim, activation: "relu" }).apply(enc1);

  // Decoder
  const dec1 = tf.layers.dense({ units: 8, activation: "relu" }).apply(enc2);
  const output = tf.layers.dense({ units: inputDim, activation: "sigmoid" }).apply(dec1);

  const model = tf.model({ inputs: input, outputs: output });
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });
  return model;
}

/* ─── Card component ─────────────────────────────────────────── */
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

function KPICard({ label, value, sub, color = BNI_BLUE, icon }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
      padding: "18px 20px",
      borderLeft: `4px solid ${color}`,
    }}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 4, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

/* ─── Custom tooltip ──────────────────────────────────────────── */
function ScatterTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "10px 14px",
      fontSize: 12,
      boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    }}>
      <div style={{ fontWeight: 600, marginBottom: 4, color: d.isAnomaly ? RED : BNI_BLUE }}>
        {d.isAnomaly ? "⚠ Anomali" : "✓ Normal"}
      </div>
      <div>Teller: <b>{d.raw?.TELLER}</b></div>
      <div>Amount: <b>{fmtRupiah(d.amount)}</b></div>
      <div>Jam: <b>{d.hour}:00</b></div>
      <div>Error: <b>{d.error?.toFixed(5)}</b></div>
      <div>Kode: {d.raw?.TRAN_CODE} · {d.raw?.TYPE}</div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function AutoencoderDashboard({ data = [], loading = false }) {
  const [status,      setStatus]      = useState("idle"); // idle | training | done | error
  const [epoch,       setEpoch]       = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(50);
  const [lossHistory, setLossHistory] = useState([]);
  const [results,     setResults]     = useState(null);
  const [threshold,   setThreshold]   = useState(0.02);
  const [latentDim,   setLatentDim]   = useState(2);
  const [showTheory,  setShowTheory]  = useState(false);
  const [sortBy,      setSortBy]      = useState("error");
  const [page,        setPage]        = useState(0);
  const modelRef = useRef(null);
  const PAGE_SIZE = 10;

  /* ── Cleanup on unmount ── */
  useEffect(() => () => { modelRef.current?.dispose(); }, []);

  /* ── Training ────────────────────────────────────────────────── */
  const trainModel = useCallback(async () => {
    if (!data || data.length < 5) return;
    setStatus("training");
    setEpoch(0);
    setLossHistory([]);
    setResults(null);

    try {
      const { points } = normalizeFeatures(data);
      const xs = tf.tensor2d(points.map((p) => p.features));
      const inputDim = points[0].features.length;

      // Dispose old model
      modelRef.current?.dispose();
      const model = buildAutoencoder(inputDim, latentDim);
      modelRef.current = model;

      const losses = [];

      await model.fit(xs, xs, {
        epochs: totalEpochs,
        batchSize: Math.min(32, Math.floor(points.length / 2)),
        shuffle: true,
        callbacks: {
          onEpochEnd: async (ep, logs) => {
            const loss = logs.loss;
            losses.push({ epoch: ep + 1, loss: parseFloat(loss.toFixed(6)) });
            setEpoch(ep + 1);
            setLossHistory([...losses]);
            await tf.nextFrame();
          },
        },
      });

      /* ── Compute reconstruction errors ── */
      const reconstructed = model.predict(xs);
      const errors = tf.mean(tf.square(tf.sub(reconstructed, xs)), 1);
      const errArr = await errors.array();

      reconstructed.dispose();
      errors.dispose();
      xs.dispose();

      const enriched = points.map((p, i) => ({ ...p, error: errArr[i] }));

      // Auto threshold: mean + 2*std
      const mean = errArr.reduce((a, b) => a + b, 0) / errArr.length;
      const std  = Math.sqrt(errArr.map((e) => (e - mean) ** 2).reduce((a, b) => a + b, 0) / errArr.length);
      const autoThresh = parseFloat((mean + 2 * std).toFixed(5));

      setThreshold(autoThresh);
      setResults({ points: enriched, mean, std, autoThresh, losses });
      setStatus("done");
    } catch (e) {
      console.error(e);
      setStatus("error");
    }
  }, [data, totalEpochs, latentDim]);

  /* ── Derived state ───────────────────────────────────────────── */
  const enrichedPoints = results
    ? results.points.map((p) => ({ ...p, isAnomaly: p.error > threshold }))
    : [];

  const anomalies = enrichedPoints.filter((p) => p.isAnomaly);
  const normals   = enrichedPoints.filter((p) => !p.isAnomaly);

  const scatterNormal  = normals.map((p)   => ({ x: p.hour, y: p.amount, ...p }));
  const scatterAnomaly = anomalies.map((p) => ({ x: p.hour, y: p.amount, ...p }));

  /* Error distribution bins */
  const errorBins = (() => {
    if (!results) return [];
    const errs = results.points.map((p) => p.error);
    const min  = Math.min(...errs), max = Math.max(...errs);
    const bins = 15;
    const step = (max - min) / bins || 0.001;
    const counts = Array(bins).fill(0);
    errs.forEach((e) => {
      const b = Math.min(bins - 1, Math.floor((e - min) / step));
      counts[b]++;
    });
    return counts.map((c, i) => ({
      bin: (min + i * step).toFixed(4),
      count: c,
      isAnomaly: (min + (i + 0.5) * step) > threshold,
    }));
  })();

  /* Anomaly table */
  const tableData = [...enrichedPoints]
    .sort((a, b) => sortBy === "error" ? b.error - a.error : b.amount - a.amount)
    .filter((p) => p.isAnomaly);
  const totalPages = Math.ceil(tableData.length / PAGE_SIZE);
  const pageData   = tableData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  /* Teller anomaly summary */
  const tellerSummary = (() => {
    const map = {};
    anomalies.forEach((p) => {
      const t = p.raw?.TELLER || "?";
      if (!map[t]) map[t] = { teller: t, count: 0, totalAmount: 0 };
      map[t].count++;
      map[t].totalAmount += p.amount;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
  })();

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${BNI_BLUE}, ${BNI_BLUE2})`,
        padding: "24px 32px",
        color: "#fff",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, opacity: 0.7, marginBottom: 4 }}>
              BNI LIFE INSURANCE · ANOMALY DETECTION
            </div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, lineHeight: 1.2 }}>
              Autoencoder Neural Network
            </h1>
            <p style={{ margin: "6px 0 0", fontSize: 13, opacity: 0.75 }}>
              Deteksi transaksi anomali via rekonstruksi error · TensorFlow.js
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={() => setShowTheory((v) => !v)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                borderRadius: 8,
                padding: "8px 16px",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              {showTheory ? "Tutup Teori" : "📖 Teori"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* ── Theory Panel ── */}
        {showTheory && (
          <Card style={{ marginBottom: 24, borderLeft: `4px solid ${BNI_ORANGE}` }}>
            <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 16 }}>📚 Teori: Autoencoder untuk Anomaly Detection</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
              {[
                {
                  title: "Arsitektur Autoencoder",
                  body: "Autoencoder terdiri dari Encoder (kompres input → representasi laten) dan Decoder (rekonstruksi kembali ke dimensi asal). Dilatih dengan loss = MSE(input, output).",
                },
                {
                  title: "Prinsip Anomaly Detection",
                  body: "Model dilatih hanya pada data normal. Data anomali memiliki representasi laten yang buruk → reconstruction error tinggi. Threshold memisahkan normal vs anomali.",
                },
                {
                  title: "Reconstruction Error",
                  body: "RE = MSE(x, x̂) = (1/n) Σ (xᵢ - x̂ᵢ)². Nilai RE tinggi menandakan input tidak mirip pola yang dipelajari model → kemungkinan anomali.",
                },
                {
                  title: "Bottleneck / Latent Space",
                  body: "Dimensi laten (bottleneck) memaksa model belajar representasi esensial. Semakin kecil dimensi laten, semakin ketat filtrasi pola yang dipelajari.",
                },
                {
                  title: "Threshold Otomatis",
                  body: "Threshold = μ + 2σ dari distribusi RE data training. Sekitar 95% data normal berada di bawah threshold (asumsi distribusi normal).",
                },
                {
                  title: "Kelebihan vs Isolation Forest",
                  body: "Autoencoder belajar representasi non-linear → lebih baik menangkap pola kompleks. Cocok untuk data high-dimensional. Isolation Forest lebih cepat dan tidak perlu training.",
                },
              ].map((item) => (
                <div key={item.title} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{item.body}</div>
                </div>
              ))}
            </div>
            {/* Architecture Diagram */}
            <div style={{ marginTop: 20, padding: "16px 20px", background: BNI_BLUE, borderRadius: 12 }}>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 600, marginBottom: 12, opacity: 0.8 }}>
                ARSITEKTUR MODEL
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  { label: "Input", val: "4D", color: "#3b82f6" },
                  { label: "→", val: null },
                  { label: "Enc Layer 1", val: "8D", color: "#8b5cf6" },
                  { label: "→", val: null },
                  { label: "Latent", val: `${latentDim}D`, color: BNI_ORANGE },
                  { label: "→", val: null },
                  { label: "Dec Layer 1", val: "8D", color: "#8b5cf6" },
                  { label: "→", val: null },
                  { label: "Output", val: "4D", color: "#10b981" },
                ].map((n, i) =>
                  n.val === null ? (
                    <span key={i} style={{ color: "rgba(255,255,255,0.5)", fontSize: 18 }}>→</span>
                  ) : (
                    <div key={i} style={{
                      background: n.color,
                      borderRadius: 8,
                      padding: "8px 14px",
                      textAlign: "center",
                      minWidth: 70,
                    }}>
                      <div style={{ color: "#fff", fontSize: 10, opacity: 0.85 }}>{n.label}</div>
                      <div style={{ color: "#fff", fontWeight: 700, fontSize: 16 }}>{n.val}</div>
                    </div>
                  )
                )}
              </div>
            </div>
          </Card>
        )}

        {/* ── Config & Training ── */}
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 15 }}>⚙ Konfigurasi & Training</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                Epoch: <b style={{ color: BNI_BLUE }}>{totalEpochs}</b>
              </label>
              <input
                type="range" min="10" max="200" step="10"
                value={totalEpochs}
                onChange={(e) => setTotalEpochs(Number(e.target.value))}
                style={{ width: "100%", marginTop: 6 }}
                disabled={status === "training"}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                Latent Dimension: <b style={{ color: BNI_BLUE }}>{latentDim}</b>
              </label>
              <input
                type="range" min="1" max="4" step="1"
                value={latentDim}
                onChange={(e) => setLatentDim(Number(e.target.value))}
                style={{ width: "100%", marginTop: 6 }}
                disabled={status === "training"}
              />
            </div>
            {results && (
              <div>
                <label style={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                  Threshold: <b style={{ color: RED }}>{threshold.toFixed(5)}</b>
                </label>
                <input
                  type="range"
                  min={results.autoThresh * 0.3}
                  max={results.autoThresh * 3}
                  step={(results.autoThresh * 0.01).toFixed(6)}
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  style={{ width: "100%", marginTop: 6 }}
                />
                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                  Auto (μ+2σ): {results.autoThresh.toFixed(5)}
                </div>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {status === "training" && (
            <div style={{ marginBottom: 16 }}>
              <div style={{
                background: "#e2e8f0",
                borderRadius: 99,
                height: 8,
                overflow: "hidden",
                marginBottom: 6,
              }}>
                <div style={{
                  height: "100%",
                  width: `${(epoch / totalEpochs) * 100}%`,
                  background: `linear-gradient(90deg, ${BNI_BLUE}, ${BNI_ORANGE})`,
                  borderRadius: 99,
                  transition: "width 0.2s",
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
              border: "none",
              borderRadius: 10,
              padding: "12px 28px",
              fontWeight: 600,
              fontSize: 14,
              cursor: status === "training" ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {status === "training"
              ? `⏳ Melatih... (${epoch}/${totalEpochs})`
              : status === "done"
              ? "🔄 Latih Ulang"
              : "🚀 Mulai Training"}
          </button>

          {status === "error" && (
            <div style={{ marginTop: 12, color: RED, fontSize: 13 }}>
              ❌ Terjadi error saat training. Cek data dan coba lagi.
            </div>
          )}
        </Card>

        {/* ── Loss Curve (shown during/after training) ── */}
        {lossHistory.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 15 }}>
              📉 Loss Curve (Training Progress)
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lossHistory} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="epoch" fontSize={11} label={{ value: "Epoch", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis fontSize={11} tickFormatter={(v) => v.toFixed(5)} />
                <Tooltip formatter={(v) => [v.toFixed(6), "MSE Loss"]} labelFormatter={(l) => `Epoch ${l}`} />
                <Line
                  type="monotone" dataKey="loss" stroke={BNI_ORANGE}
                  strokeWidth={2} dot={false} isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
            {status === "done" && (
              <div style={{ marginTop: 8, fontSize: 12, color: "#64748b" }}>
                Loss akhir: <b style={{ color: BNI_BLUE }}>
                  {lossHistory[lossHistory.length - 1]?.loss.toFixed(6)}
                </b>
                {" · "}Loss awal: <b>{lossHistory[0]?.loss.toFixed(6)}</b>
                {" · "}Penurunan: <b style={{ color: GREEN }}>
                  {(((lossHistory[0]?.loss - lossHistory[lossHistory.length - 1]?.loss) / lossHistory[0]?.loss) * 100).toFixed(1)}%
                </b>
              </div>
            )}
          </Card>
        )}

        {/* ── Results ── */}
        {status === "done" && results && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
              <KPICard label="Total Transaksi" value={data.length} color={BNI_BLUE} />
              <KPICard
                label="Anomali Terdeteksi"
                value={anomalies.length}
                sub={`${((anomalies.length / data.length) * 100).toFixed(1)}% dari total`}
                color={RED}
              />
              <KPICard
                label="Transaksi Normal"
                value={normals.length}
                sub={`${((normals.length / data.length) * 100).toFixed(1)}% dari total`}
                color={GREEN}
              />
              <KPICard
                label="Threshold (RE)"
                value={threshold.toFixed(5)}
                sub={`μ=${results.mean.toFixed(5)} σ=${results.std.toFixed(5)}`}
                color={AMBER}
              />
              <KPICard
                label="Total Amount Anomali"
                value={fmtK(anomalies.reduce((s, p) => s + p.amount, 0))}
                sub="akumulasi nilai anomali"
                color={RED}
              />
              <KPICard
                label="Teller Terdampak"
                value={new Set(anomalies.map((p) => p.raw?.TELLER)).size}
                sub="teller unik dengan anomali"
                color={BNI_ORANGE}
              />
            </div>

            {/* Scatter + Error Dist */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              {/* Scatter */}
              <Card>
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>
                  Distribusi Transaksi (Jam vs Amount)
                </h3>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                  <span><span style={{ color: BNI_BLUE }}>●</span> Normal ({normals.length})</span>
                  <span><span style={{ color: RED }}>●</span> Anomali ({anomalies.length})</span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="x" name="Jam" type="number" domain={[0, 23]} label={{ value: "Jam", position: "insideBottom", offset: -4, fontSize: 11 }} fontSize={11} />
                    <YAxis dataKey="y" name="Amount" tickFormatter={fmtK} fontSize={10} />
                    <Tooltip content={<ScatterTip />} />
                    <Scatter name="Normal" data={scatterNormal} fill={BNI_BLUE} opacity={0.5} r={4} />
                    <Scatter name="Anomali" data={scatterAnomaly} fill={RED} opacity={0.85} r={5} />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>

              {/* Error Distribution */}
              <Card>
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>
                  Distribusi Reconstruction Error
                </h3>
                <div style={{ fontSize: 12, color: "#64748b", marginBottom: 12 }}>
                  Garis merah = threshold ({threshold.toFixed(5)})
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={errorBins} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="bin" fontSize={9} angle={-30} textAnchor="end" height={40} />
                    <YAxis fontSize={11} />
                    <Tooltip
                      formatter={(v, _, props) => [v, "Transaksi"]}
                      labelFormatter={(l) => `RE ~ ${l}`}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {errorBins.map((b, i) => (
                        <Cell key={i} fill={b.isAnomaly ? RED : BNI_BLUE} opacity={b.isAnomaly ? 0.85 : 0.6} />
                      ))}
                    </Bar>
                    <ReferenceLine x={threshold.toFixed(4)} stroke={RED} strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Teller Anomaly Bar */}
            {tellerSummary.length > 0 && (
              <Card style={{ marginBottom: 24 }}>
                <h3 style={{ margin: "0 0 4px", color: BNI_BLUE, fontSize: 15 }}>
                  Frekuensi Anomali per Teller
                </h3>
                <p style={{ margin: "0 0 16px", fontSize: 12, color: "#64748b" }}>
                  Teller dengan jumlah transaksi anomali terbanyak
                </p>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tellerSummary} layout="vertical" margin={{ left: 16, right: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="teller" fontSize={12} width={50} />
                    <Tooltip
                      formatter={(v) => [v, "Anomali"]}
                      labelFormatter={(l) => `Teller: ${l}`}
                    />
                    <Bar dataKey="count" fill={RED} radius={[0, 6, 6, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Anomaly Detail Table */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                <h3 style={{ margin: 0, color: BNI_BLUE, fontSize: 15 }}>
                  ⚠ Daftar Transaksi Anomali ({anomalies.length})
                </h3>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#64748b" }}>Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
                    style={{ fontSize: 12, borderRadius: 6, padding: "4px 8px", border: "1px solid #e2e8f0" }}
                  >
                    <option value="error">Reconstruction Error ↓</option>
                    <option value="amount">Amount ↓</option>
                  </select>
                </div>
              </div>

              {anomalies.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px", color: "#94a3b8", fontSize: 14 }}>
                  ✓ Tidak ada transaksi anomali pada threshold ini. Coba turunkan threshold.
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "#f8fafc" }}>
                          {["No", "Teller", "Kode", "Jam", "Amount", "TYPE", "SYS", "Rec. Error", "Skor Risiko"].map((h) => (
                            <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#475569", fontSize: 12, borderBottom: "2px solid #e2e8f0" }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageData.map((p, i) => {
                          const riskScore = Math.min(100, Math.round((p.error / (results.autoThresh * 3)) * 100));
                          const riskColor = riskScore > 70 ? RED : riskScore > 40 ? AMBER : BNI_ORANGE;
                          return (
                            <tr key={i} style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafbfc" }}>
                              <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{p.raw?.NO}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600, color: BNI_BLUE }}>{p.raw?.TELLER}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{ background: "#f1f5f9", borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                                  {p.raw?.TRAN_CODE}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px" }}>{p.hour}:00</td>
                              <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmtRupiah(p.amount)}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  background: p.raw?.TYPE === "CR" ? "#dcfce7" : "#fee2e2",
                                  color: p.raw?.TYPE === "CR" ? GREEN : RED,
                                  borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
                                }}>
                                  {p.raw?.TYPE}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px", fontSize: 11, color: "#64748b" }}>{p.raw?.SYS}</td>
                              <td style={{ padding: "10px 12px", fontFamily: "monospace", color: RED, fontWeight: 600 }}>
                                {p.error.toFixed(5)}
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 99, height: 6 }}>
                                    <div style={{ height: "100%", width: `${riskScore}%`, background: riskColor, borderRadius: 99 }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: riskColor, minWidth: 30 }}>{riskScore}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 16 }}>
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        style={{
                          padding: "6px 14px", borderRadius: 6,
                          border: "1px solid #e2e8f0", cursor: page === 0 ? "not-allowed" : "pointer",
                          background: "#fff", color: page === 0 ? "#94a3b8" : BNI_BLUE, fontSize: 13,
                        }}
                      >← Prev</button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          style={{
                            padding: "6px 12px", borderRadius: 6, fontSize: 13,
                            background: i === page ? BNI_BLUE : "#fff",
                            color: i === page ? "#fff" : "#475569",
                            border: `1px solid ${i === page ? BNI_BLUE : "#e2e8f0"}`,
                            cursor: "pointer",
                          }}
                        >{i + 1}</button>
                      ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page === totalPages - 1}
                        style={{
                          padding: "6px 14px", borderRadius: 6,
                          border: "1px solid #e2e8f0", cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
                          background: "#fff", color: page === totalPages - 1 ? "#94a3b8" : BNI_BLUE, fontSize: 13,
                        }}
                      >Next →</button>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Academic Summary */}
            <Card style={{ borderLeft: `4px solid ${GREEN}` }}>
              <h3 style={{ margin: "0 0 16px", color: BNI_BLUE, fontSize: 15 }}>📊 Interpretasi Model (Akademik)</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
                {[
                  {
                    title: "Arsitektur yang Digunakan",
                    body: `Input 4D → Dense(8, ReLU) → Latent(${latentDim}D) → Dense(8, ReLU) → Output 4D. Loss: MSE. Optimizer: Adam. Epoch: ${totalEpochs}.`,
                  },
                  {
                    title: "Fitur Input (4 dimensi)",
                    body: "1) Normalized Amount · 2) Normalized Hour · 3) CR/DR encoding (0/1) · 4) Log-normalized Amount untuk menangkap distribusi skewed.",
                  },
                  {
                    title: "Interpretasi Threshold",
                    body: `Threshold = ${threshold.toFixed(5)} (μ + 2σ). Ditemukan ${anomalies.length} anomali (${((anomalies.length / data.length) * 100).toFixed(1)}% data). ${anomalies.length > data.length * 0.1 ? "Threshold mungkin terlalu rendah." : "Proporsi anomali wajar (<10%)."}`,
                  },
                  {
                    title: "Kualitas Model",
                    body: `Final loss: ${lossHistory[lossHistory.length - 1]?.loss.toFixed(6)}. ${lossHistory[lossHistory.length - 1]?.loss < 0.01 ? "Model konvergen dengan baik." : "Model masih bisa ditingkatkan dengan lebih banyak epoch."} σ = ${results.std.toFixed(5)}.`,
                  },
                  {
                    title: "Keterbatasan",
                    body: "Autoencoder sensitif terhadap distribusi training data. Jika data mengandung banyak anomali, threshold bisa terdistorsi. Idealnya train dengan data clean.",
                  },
                  {
                    title: "Saran Pengembangan",
                    body: "Gunakan Variational Autoencoder (VAE) untuk latent space yang lebih terstruktur. Kombinasikan dengan Isolation Forest untuk ensemble anomaly detection.",
                  },
                ].map((item) => (
                  <div key={item.title} style={{ background: "#f8fafc", borderRadius: 10, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: BNI_BLUE, fontSize: 12, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.6 }}>{item.body}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* Empty / Loading state */}
        {status === "idle" && (
          <Card style={{ textAlign: "center", padding: "48px 32px" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
            <h3 style={{ margin: "0 0 8px", color: BNI_BLUE }}>Siap Melatih Autoencoder</h3>
            <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 24px" }}>
              {data?.length
                ? `${data.length} transaksi terdeteksi. Konfigurasikan parameter di atas lalu klik "Mulai Training".`
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