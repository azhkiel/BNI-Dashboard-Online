import { useState, useEffect, useRef, useCallback } from "react";
import * as tf from "@tensorflow/tfjs";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, LineChart, Line,
  ReferenceLine,
} from "recharts";
import {
  Brain, RefreshCw, Play, BookOpen, X, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, TrendingDown, Settings, BarChart2,
  Users, DollarSign, Activity, Layers, Info, ArrowUpDown,
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
  const encType = (r) => r.TYPE === "CR" ? 1 : 0;
  const logAmounts = amounts.map((a) => Math.log1p(a));
  const minLA = Math.min(...logAmounts), maxLA = Math.max(...logAmounts);
  const normLA = (v) => maxLA === minLA ? 0 : (Math.log1p(v) - minLA) / (maxLA - minLA);
  const points = data.map((r, i) => ({
    idx: i, raw: r,
    features: [normA(amounts[i]), normH(hours[i]), encType(r), normLA(amounts[i])],
    amount: amounts[i],
    hour: hours[i],
  }));
  return { points, minA, maxA };
}

/* ─── Build Autoencoder Model ────────────────────────────────── */
function buildAutoencoder(inputDim, latentDim) {
  const input = tf.input({ shape: [inputDim] });
  const enc1   = tf.layers.dense({ units: 8, activation: "relu" }).apply(input);
  const enc2   = tf.layers.dense({ units: latentDim, activation: "relu" }).apply(enc1);
  const dec1   = tf.layers.dense({ units: 8, activation: "relu" }).apply(enc2);
  const output = tf.layers.dense({ units: inputDim, activation: "sigmoid" }).apply(dec1);
  const model  = tf.model({ inputs: input, outputs: output });
  model.compile({ optimizer: "adam", loss: "meanSquaredError" });
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
    <div style={{
      ...cardStyle,
      position: "relative",
      overflow: "hidden",
      paddingTop: 28,
    }}>
      {/* Accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 4, borderRadius: "18px 18px 0 0",
        background: color,
      }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.mutedText,
            textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 8,
          }}>
            {label}
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: C.darkBlue, lineHeight: 1.1, fontFamily: "'DM Sans', sans-serif" }}>
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 12, color: C.mutedText, marginTop: 4 }}>{sub}</div>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: `${color}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
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

/* ─── Badge ──────────────────────────────────────────────────── */
function Badge({ children, color = C.blue }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: C.badgeBg, borderRadius: 99,
      padding: "2px 10px", display: "inline-block",
    }}>
      {children}
    </span>
  );
}

/* ─── Custom Scatter Tooltip ─────────────────────────────────── */
function ScatterTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div style={{
      background: C.cardBg, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: "12px 16px", fontSize: 12,
      boxShadow: "0 8px 32px rgba(0,63,135,0.11)",
    }}>
      <div style={{
        fontWeight: 700, marginBottom: 6, color: d.isAnomaly ? C.red : C.blue,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        {d.isAnomaly
          ? <AlertTriangle size={13} /> 
          : <CheckCircle size={13} />
        }
        {d.isAnomaly ? "Anomali" : "Normal"}
      </div>
      <div style={{ color: C.bodyText }}>Teller: <b style={{ color: C.darkBlue }}>{d.raw?.TELLER}</b></div>
      <div style={{ color: C.bodyText }}>Amount: <b style={{ color: C.darkBlue }}>{fmtRupiah(d.amount)}</b></div>
      <div style={{ color: C.bodyText }}>Jam: <b style={{ color: C.darkBlue }}>{d.hour}:00</b></div>
      <div style={{ color: C.bodyText }}>Error: <b style={{ color: C.red }}>{d.error?.toFixed(5)}</b></div>
      <div style={{ color: C.bodyText }}>Kode: {d.raw?.TRAN_CODE} · {d.raw?.TYPE}</div>
    </div>
  );
}

/* ─── Range Slider ───────────────────────────────────────────── */
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

/* ════════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════════ */
export default function AutoencoderDashboard({ data = [], loading = false }) {
  const [status,      setStatus]      = useState("idle");
  const [epoch,       setEpoch]       = useState(0);
  const [totalEpochs, setTotalEpochs] = useState(50);
  const [lossHistory, setLossHistory] = useState([]);
  const [results,     setResults]     = useState(null);
  const [threshold,   setThreshold]   = useState(0.02);
  const [latentDim,   setLatentDim]   = useState(2);
  const [showTheory,  setShowTheory]  = useState(false);
  const [sortBy,      setSortBy]      = useState("error");
  const [page,        setPage]        = useState(0);
  const modelRef  = useRef(null);
  const PAGE_SIZE = 10;

  useEffect(() => () => { modelRef.current?.dispose(); }, []);

  /* ── Training ── */
  const trainModel = useCallback(async () => {
    if (!data || data.length < 5) return;
    setStatus("training"); setEpoch(0); setLossHistory([]); setResults(null);
    try {
      const { points } = normalizeFeatures(data);
      const xs = tf.tensor2d(points.map((p) => p.features));
      const inputDim = points[0].features.length;
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
      const reconstructed = model.predict(xs);
      const errors = tf.mean(tf.square(tf.sub(reconstructed, xs)), 1);
      const errArr = await errors.array();
      reconstructed.dispose(); errors.dispose(); xs.dispose();
      const enriched = points.map((p, i) => ({ ...p, error: errArr[i] }));
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

  /* ── Derived state ── */
  const enrichedPoints = results
    ? results.points.map((p) => ({ ...p, isAnomaly: p.error > threshold }))
    : [];
  const anomalies     = enrichedPoints.filter((p) => p.isAnomaly);
  const normals       = enrichedPoints.filter((p) => !p.isAnomaly);
  const scatterNormal = normals.map((p)   => ({ x: p.hour, y: p.amount, ...p }));
  const scatterAnomaly = anomalies.map((p) => ({ x: p.hour, y: p.amount, ...p }));

  const errorBins = (() => {
    if (!results) return [];
    const errs = results.points.map((p) => p.error);
    const min = Math.min(...errs), max = Math.max(...errs);
    const bins = 15, step = (max - min) / bins || 0.001;
    const counts = Array(bins).fill(0);
    errs.forEach((e) => { const b = Math.min(bins - 1, Math.floor((e - min) / step)); counts[b]++; });
    return counts.map((c, i) => ({
      bin: (min + i * step).toFixed(4), count: c,
      isAnomaly: (min + (i + 0.5) * step) > threshold,
    }));
  })();

  const tableData  = [...enrichedPoints].sort((a, b) => sortBy === "error" ? b.error - a.error : b.amount - a.amount).filter((p) => p.isAnomaly);
  const totalPages = Math.ceil(tableData.length / PAGE_SIZE);
  const pageData   = tableData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
        {/* Decorative circles */}
        <div style={{ position: "absolute", right: -40, top: -40, width: 176, height: 176, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
        <div style={{ position: "absolute", right: 64, bottom: -56, width: 144, height: 144, borderRadius: "50%", background: "rgba(255,255,255,0.03)" }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Brain size={22} color="#fff" strokeWidth={1.8} />
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)", marginBottom: 4, textTransform: "uppercase" }}>
                BNI Life Insurance · Anomaly Detection
              </div>
              <h1 style={{
                margin: 0, fontSize: 22, fontWeight: 800, color: "#fff", lineHeight: 1.2,
                fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px",
              }}>
                Autoencoder Neural Network
              </h1>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(255,255,255,0.7)" }}>
                Deteksi transaksi anomali via reconstruction error · TensorFlow.js
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowTheory((v) => !v)}
            style={{
              background: "rgba(255,255,255,0.15)",
              border: "1px solid rgba(255,255,255,0.25)",
              color: "#fff", borderRadius: 10,
              padding: "9px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
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
            <SectionTitle>Teori: Autoencoder untuk Anomaly Detection</SectionTitle>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 20 }}>
              {[
                { title: "Arsitektur Autoencoder", body: "Autoencoder terdiri dari Encoder (kompres input ke representasi laten) dan Decoder (rekonstruksi kembali ke dimensi asal). Dilatih dengan loss = MSE(input, output)." },
                { title: "Prinsip Anomaly Detection", body: "Model dilatih hanya pada data normal. Data anomali memiliki representasi laten yang buruk sehingga reconstruction error tinggi. Threshold memisahkan normal vs anomali." },
                { title: "Reconstruction Error", body: "RE = MSE(x, x̂) = (1/n) Σ (xᵢ − x̂ᵢ)². Nilai RE tinggi menandakan input tidak mirip pola yang dipelajari model, mengindikasikan kemungkinan anomali." },
                { title: "Bottleneck / Latent Space", body: "Dimensi laten (bottleneck) memaksa model belajar representasi esensial. Semakin kecil dimensi laten, semakin ketat filtrasi pola yang dipelajari." },
                { title: "Threshold Otomatis", body: "Threshold = μ + 2σ dari distribusi RE data training. Sekitar 95% data normal berada di bawah threshold (asumsi distribusi normal)." },
                { title: "Kelebihan vs Isolation Forest", body: "Autoencoder belajar representasi non-linear sehingga lebih baik menangkap pola kompleks. Cocok untuk data high-dimensional. Isolation Forest lebih cepat dan tidak memerlukan training." },
              ].map((item) => (
                <div key={item.title} style={{ background: C.pageBg, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 13, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: C.bodyText, lineHeight: 1.65 }}>{item.body}</div>
                </div>
              ))}
            </div>

            {/* Architecture Diagram */}
            <div style={{ background: C.darkBlue, borderRadius: 12, padding: "16px 20px" }}>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 14 }}>
                Arsitektur Model
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                {[
                  { label: "Input", val: "4D", color: "#3b82f6" },
                  { arrow: true },
                  { label: "Enc Layer 1", val: "8D", color: "#8b5cf6" },
                  { arrow: true },
                  { label: "Latent", val: `${latentDim}D`, color: C.orange },
                  { arrow: true },
                  { label: "Dec Layer 1", val: "8D", color: "#8b5cf6" },
                  { arrow: true },
                  { label: "Output", val: "4D", color: "#10b981" },
                ].map((n, i) =>
                  n.arrow ? (
                    <span key={i} style={{ color: "rgba(255,255,255,0.35)", fontSize: 18 }}>→</span>
                  ) : (
                    <div key={i} style={{
                      background: n.color, borderRadius: 8,
                      padding: "8px 14px", textAlign: "center", minWidth: 72,
                    }}>
                      <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 10 }}>{n.label}</div>
                      <div style={{ color: "#fff", fontWeight: 800, fontSize: 16 }}>{n.val}</div>
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
            <SectionTitle>Konfigurasi & Training</SectionTitle>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24, marginBottom: 24 }}>
            <SliderField
              label="Epoch" value={totalEpochs} min="10" max="200" step="10"
              onChange={(e) => setTotalEpochs(Number(e.target.value))}
              disabled={status === "training"}
            />
            <SliderField
              label="Latent Dimension" value={latentDim} min="1" max="4" step="1"
              onChange={(e) => setLatentDim(Number(e.target.value))}
              disabled={status === "training"}
            />
            {results && (
              <SliderField
                label="Threshold"
                value={threshold.toFixed(5)}
                min={results.autoThresh * 0.3}
                max={results.autoThresh * 3}
                step={(results.autoThresh * 0.01).toFixed(6)}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                hint={`Auto (μ+2σ): ${results.autoThresh.toFixed(5)}`}
              />
            )}
          </div>

          {/* Progress bar */}
          {status === "training" && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, overflow: "hidden", marginBottom: 6 }}>
                <div style={{
                  height: "100%",
                  width: `${(epoch / totalEpochs) * 100}%`,
                  background: `linear-gradient(90deg, ${C.blue}, ${C.orange})`,
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
              <AlertTriangle size={14} /> Terjadi error saat training. Periksa data dan coba lagi.
            </div>
          )}
        </Card>

        {/* ── Loss Curve ── */}
        {lossHistory.length > 0 && (
          <Card style={{ marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <TrendingDown size={17} color={C.orange} strokeWidth={1.8} />
              <SectionTitle>Loss Curve (Training Progress)</SectionTitle>
            </div>
            {status === "done" && (
              <div style={{ fontSize: 12, color: C.bodyText, marginBottom: 16 }}>
                Loss akhir:{" "}
                <b style={{ color: C.darkBlue }}>{lossHistory[lossHistory.length - 1]?.loss.toFixed(6)}</b>
                {" · "}Loss awal: <b>{lossHistory[0]?.loss.toFixed(6)}</b>
                {" · "}Penurunan:{" "}
                <b style={{ color: C.green }}>
                  {(((lossHistory[0]?.loss - lossHistory[lossHistory.length - 1]?.loss) / lossHistory[0]?.loss) * 100).toFixed(1)}%
                </b>
              </div>
            )}
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lossHistory} margin={{ top: 4, right: 16, bottom: 4, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                <XAxis dataKey="epoch" fontSize={11} label={{ value: "Epoch", position: "insideBottom", offset: -4, fontSize: 11 }} />
                <YAxis fontSize={11} tickFormatter={(v) => v.toFixed(5)} />
                <Tooltip formatter={(v) => [v.toFixed(6), "MSE Loss"]} labelFormatter={(l) => `Epoch ${l}`} />
                <Line type="monotone" dataKey="loss" stroke={C.orange} strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* ── Results ── */}
        {status === "done" && results && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 20, marginBottom: 24 }}>
              <KPICard label="Total Transaksi"      value={data.length}      color={C.blue}   icon={BarChart2} />
              <KPICard label="Anomali Terdeteksi"   value={anomalies.length} color={C.red}    icon={AlertTriangle}
                sub={`${((anomalies.length / data.length) * 100).toFixed(1)}% dari total`} />
              <KPICard label="Transaksi Normal"     value={normals.length}   color={C.green}  icon={CheckCircle}
                sub={`${((normals.length / data.length) * 100).toFixed(1)}% dari total`} />
              <KPICard label="Threshold (RE)"       value={threshold.toFixed(5)} color={C.amber} icon={Activity}
                sub={`μ=${results.mean.toFixed(5)} σ=${results.std.toFixed(5)}`} />
              <KPICard label="Total Amount Anomali" value={fmtK(anomalies.reduce((s, p) => s + p.amount, 0))} color={C.red} icon={DollarSign}
                sub="akumulasi nilai anomali" />
              <KPICard label="Teller Terdampak"     value={new Set(anomalies.map((p) => p.raw?.TELLER)).size} color={C.orange} icon={Users}
                sub="teller unik dengan anomali" />
            </div>

            {/* Scatter + Error Dist */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
              <Card>
                <SectionTitle sub="Sebaran transaksi berdasarkan waktu dan nilai">
                  Distribusi Transaksi (Jam vs Amount)
                </SectionTitle>
                <div style={{ display: "flex", gap: 16, fontSize: 12, color: C.bodyText, marginBottom: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.blue }} />
                    Normal ({normals.length})
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: C.red }} />
                    Anomali ({anomalies.length})
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                    <XAxis dataKey="x" name="Jam" type="number" domain={[0, 23]}
                      label={{ value: "Jam", position: "insideBottom", offset: -4, fontSize: 11 }} fontSize={11} />
                    <YAxis dataKey="y" name="Amount" tickFormatter={fmtK} fontSize={10} />
                    <Tooltip content={<ScatterTip />} />
                    <Scatter name="Normal"  data={scatterNormal}  fill={C.blue} opacity={0.5} r={4} />
                    <Scatter name="Anomali" data={scatterAnomaly} fill={C.red}  opacity={0.85} r={5} />
                  </ScatterChart>
                </ResponsiveContainer>
              </Card>

              <Card>
                <SectionTitle sub={`Garis merah = threshold (${threshold.toFixed(5)})`}>
                  Distribusi Reconstruction Error
                </SectionTitle>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={errorBins} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                    <XAxis dataKey="bin" fontSize={9} angle={-30} textAnchor="end" height={40} />
                    <YAxis fontSize={11} />
                    <Tooltip formatter={(v) => [v, "Transaksi"]} labelFormatter={(l) => `RE ~ ${l}`} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {errorBins.map((b, i) => (
                        <Cell key={i} fill={b.isAnomaly ? C.red : C.blue} opacity={b.isAnomaly ? 0.85 : 0.6} />
                      ))}
                    </Bar>
                    <ReferenceLine x={threshold.toFixed(4)} stroke={C.red} strokeWidth={2} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Teller Anomaly Bar */}
            {tellerSummary.length > 0 && (
              <Card style={{ marginBottom: 24 }}>
                <SectionTitle sub="Teller dengan jumlah transaksi anomali terbanyak">
                  Frekuensi Anomali per Teller
                </SectionTitle>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={tellerSummary} layout="vertical" margin={{ left: 16, right: 32 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
                    <XAxis type="number" fontSize={11} />
                    <YAxis type="category" dataKey="teller" fontSize={12} width={50} />
                    <Tooltip formatter={(v) => [v, "Anomali"]} labelFormatter={(l) => `Teller: ${l}`} />
                    <Bar dataKey="count" fill={C.red} radius={[0, 6, 6, 0]} opacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Anomaly Detail Table */}
            <Card style={{ marginBottom: 24 }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: 20, flexWrap: "wrap", gap: 10,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <AlertTriangle size={17} color={C.red} strokeWidth={1.8} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.darkBlue }}>
                    Daftar Transaksi Anomali
                  </div>
                  <Badge>{anomalies.length}</Badge>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <ArrowUpDown size={13} color={C.mutedText} />
                  <span style={{ fontSize: 12, color: C.bodyText }}>Urutkan:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
                    style={{
                      fontSize: 12, borderRadius: 8, padding: "5px 10px",
                      border: `1px solid ${C.border}`, background: C.inputBg,
                      color: C.darkBlue, fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    <option value="error">Reconstruction Error</option>
                    <option value="amount">Amount</option>
                  </select>
                </div>
              </div>

              {anomalies.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 32px", color: C.mutedText }}>
                  <CheckCircle size={32} color={C.green} style={{ marginBottom: 12 }} />
                  <div style={{ fontSize: 14, color: C.bodyText }}>
                    Tidak ada transaksi anomali pada threshold ini. Turunkan threshold untuk mendeteksi lebih banyak.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                      <thead>
                        <tr style={{ background: C.pageBg }}>
                          {["No", "Teller", "Kode", "Jam", "Amount", "Type", "SYS", "Rec. Error", "Skor Risiko"].map((h) => (
                            <th key={h} style={{
                              padding: "10px 12px", textAlign: "left", fontWeight: 700,
                              color: C.mutedText, fontSize: 10, letterSpacing: "0.1em",
                              textTransform: "uppercase", borderBottom: `2px solid ${C.border}`,
                            }}>
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pageData.map((p, i) => {
                          const riskScore = Math.min(100, Math.round((p.error / (results.autoThresh * 3)) * 100));
                          const riskColor = riskScore > 70 ? C.red : riskScore > 40 ? C.amber : C.orange;
                          return (
                            <tr key={i} style={{
                              borderBottom: `1px solid ${C.border}`,
                              background: i % 2 === 0 ? C.cardBg : C.pageBg,
                            }}>
                              <td style={{ padding: "10px 12px", color: C.mutedText }}>{p.raw?.NO}</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700, color: C.darkBlue }}>{p.raw?.TELLER}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  background: C.badgeBg, borderRadius: 6,
                                  padding: "3px 8px", fontSize: 11, fontWeight: 700, color: C.blue,
                                }}>
                                  {p.raw?.TRAN_CODE}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px", color: C.bodyText }}>{p.hour}:00</td>
                              <td style={{ padding: "10px 12px", fontWeight: 700, color: C.darkBlue }}>{fmtRupiah(p.amount)}</td>
                              <td style={{ padding: "10px 12px" }}>
                                <span style={{
                                  background: p.raw?.TYPE === "CR" ? "#dcfce7" : "#fee2e2",
                                  color: p.raw?.TYPE === "CR" ? C.green : C.red,
                                  borderRadius: 6, padding: "3px 8px", fontSize: 11, fontWeight: 700,
                                }}>
                                  {p.raw?.TYPE}
                                </span>
                              </td>
                              <td style={{ padding: "10px 12px", fontSize: 11, color: C.bodyText }}>{p.raw?.SYS}</td>
                              <td style={{ padding: "10px 12px", fontFamily: "monospace", color: C.red, fontWeight: 700 }}>
                                {p.error.toFixed(5)}
                              </td>
                              <td style={{ padding: "10px 12px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <div style={{ flex: 1, background: "#f1f5f9", borderRadius: 99, height: 6 }}>
                                    <div style={{ height: "100%", width: `${riskScore}%`, background: riskColor, borderRadius: 99 }} />
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: riskColor, minWidth: 30 }}>
                                    {riskScore}%
                                  </span>
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
                    <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 20, alignItems: "center" }}>
                      <button
                        onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                          cursor: page === 0 ? "not-allowed" : "pointer",
                          background: C.cardBg, color: page === 0 ? C.mutedText : C.blue, fontSize: 13,
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        <ChevronLeft size={14} /> Prev
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => (
                        <button key={i} onClick={() => setPage(i)} style={{
                          padding: "6px 12px", borderRadius: 8, fontSize: 13,
                          background: i === page ? C.blue : C.cardBg,
                          color: i === page ? "#fff" : C.bodyText,
                          border: `1px solid ${i === page ? C.blue : C.border}`,
                          cursor: "pointer", fontWeight: i === page ? 700 : 400,
                        }}>
                          {i + 1}
                        </button>
                      ))}
                      <button
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                        style={{
                          padding: "6px 12px", borderRadius: 8, border: `1px solid ${C.border}`,
                          cursor: page === totalPages - 1 ? "not-allowed" : "pointer",
                          background: C.cardBg, color: page === totalPages - 1 ? C.mutedText : C.blue, fontSize: 13,
                          display: "flex", alignItems: "center", gap: 4,
                        }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </Card>

            {/* Academic Summary */}
            <Card accentColor={C.green}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Info size={17} color={C.green} strokeWidth={1.8} />
                <SectionTitle>Interpretasi Model (Akademik)</SectionTitle>
              </div>
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
                    body: "Autoencoder sensitif terhadap distribusi training data. Jika data mengandung banyak anomali, threshold bisa terdistorsi. Idealnya train dengan data yang sudah bersih.",
                  },
                  {
                    title: "Saran Pengembangan",
                    body: "Gunakan Variational Autoencoder (VAE) untuk latent space yang lebih terstruktur. Kombinasikan dengan Isolation Forest untuk ensemble anomaly detection.",
                  },
                ].map((item) => (
                  <div key={item.title} style={{ background: C.pageBg, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, color: C.darkBlue, fontSize: 12, marginBottom: 6 }}>{item.title}</div>
                    <div style={{ fontSize: 12, color: C.bodyText, lineHeight: 1.65 }}>{item.body}</div>
                  </div>
                ))}
              </div>
            </Card>
          </>
        )}

        {/* ── Idle State ── */}
        {status === "idle" && (
          <Card style={{ textAlign: "center", padding: "56px 32px" }}>
            <div style={{
              width: 64, height: 64, borderRadius: 18, background: C.badgeBg,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 20px",
            }}>
              <Brain size={30} color={C.blue} strokeWidth={1.6} />
            </div>
            <h3 style={{ margin: "0 0 8px", color: C.darkBlue, fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 800 }}>
              Siap Melatih Autoencoder
            </h3>
            <p style={{ color: C.bodyText, fontSize: 14, margin: "0 0 28px", maxWidth: 400, marginInline: "auto" }}>
              {data?.length
                ? `${data.length} transaksi terdeteksi. Konfigurasikan parameter di atas lalu mulai training.`
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