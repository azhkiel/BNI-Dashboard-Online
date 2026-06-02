import { useState } from "react";
import {
  Cpu, GitBranch, TrendingUp, AlertTriangle,
  Activity, Waves, Crosshair, ArrowRight,
  Layers, Zap, Brain, BarChart2, ChevronRight,
  BookOpen, Target, Shield,
} from "lucide-react";

/* ─── Google Fonts ─────────────────────────────────────────── */
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,800;1,700&family=DM+Sans:wght@400;500;600;700;800&display=swap";
if (!document.head.querySelector('link[href*="Playfair"]')) {
  document.head.appendChild(fontLink);
}

/* ─── Design tokens (BNI Style Guide) ─────────────────────── */
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

/* ─── ML Methods Config ─────────────────────────────────────── */
const ML_METHODS = [
  {
    id       : "kmeans",
    label    : "K-Means Clustering",
    icon     : Crosshair,
    color    : C.blue,
    gradient : `linear-gradient(135deg, ${C.blue} 0%, #005bb5 100%)`,
    category : "Clustering",
    badge    : "Unsupervised",
    badgeColor: C.teal,
    desc     : "Mengelompokkan transaksi ke dalam K cluster berdasarkan kemiripan fitur. Cocok untuk segmentasi perilaku teller.",
    usecases : ["Segmentasi teller", "Profiling transaksi", "Deteksi pola"],
    metrics  : ["Inertia", "Silhouette Score", "K optimal"],
    complexity: "Rendah",
    speed    : "Sangat Cepat",
  },
  {
    id       : "dbscan",
    label    : "DBSCAN",
    icon     : GitBranch,
    color    : "#7c3aed",
    gradient : `linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)`,
    category : "Clustering",
    badge    : "Noise-Aware",
    badgeColor: "#7c3aed",
    desc     : "Density-Based Spatial Clustering — menemukan cluster dengan bentuk arbitrer dan secara otomatis mendeteksi noise/outlier.",
    usecases : ["Deteksi anomali", "Cluster non-linear", "Outlier detection"],
    metrics  : ["Jumlah cluster", "Noise rate", "ε & minPts"],
    complexity: "Menengah",
    speed    : "Cepat",
  },
  {
    id       : "regresi",
    label    : "Regresi",
    icon     : TrendingUp,
    color    : C.orange,
    gradient : `linear-gradient(135deg, ${C.orange} 0%, #c2500a 100%)`,
    category : "Supervised",
    badge    : "Predictive",
    badgeColor: C.orange,
    desc     : "Regresi Linear & Polinomial untuk memprediksi nilai transaksi berdasarkan waktu. Dilengkapi plot residual dan metrik R².",
    usecases : ["Prediksi nilai txn", "Analisis tren", "Korelasi waktu"],
    metrics  : ["R² Score", "MAE", "RMSE"],
    complexity: "Rendah",
    speed    : "Instan",
  },
  {
    id       : "if",
    label    : "Isolation Forest",
    icon     : AlertTriangle,
    color    : C.red,
    gradient : `linear-gradient(135deg, ${C.red} 0%, #991b1b 100%)`,
    category : "Anomaly Detection",
    badge    : "Fraud Detection",
    badgeColor: C.red,
    desc     : "Deteksi transaksi mencurigakan menggunakan pohon isolasi acak. Berbasis path length — anomali lebih mudah diisolasi.",
    usecases : ["Deteksi fraud", "Outlier scoring", "Risk assessment"],
    metrics  : ["Anomaly Score", "Threshold", "High Risk %"],
    complexity: "Menengah",
    speed    : "Cepat",
  },
  {
    id       : "auto",
    label    : "Autoencoder",
    icon     : Brain,
    color    : C.teal,
    gradient : `linear-gradient(135deg, ${C.teal} 0%, #007a72 100%)`,
    category : "Deep Learning",
    badge    : "Neural Net",
    badgeColor: C.teal,
    desc     : "Neural network encoder-decoder yang mendeteksi anomali via reconstruction error. Lebih baik untuk pola non-linear kompleks.",
    usecases : ["Anomali kompleks", "Feature learning", "Dimensi tinggi"],
    metrics  : ["Reconstruction Error", "Threshold μ+2σ", "Loss"],
    complexity: "Tinggi",
    speed    : "Sedang",
  },
  {
    id       : "lstm",
    label    : "LSTM Forecasting",
    icon     : Waves,
    color    : "#0891b2",
    gradient : `linear-gradient(135deg, #0891b2 0%, #0e7490 100%)`,
    category : "Deep Learning",
    badge    : "Time Series",
    badgeColor: "#0891b2",
    desc     : "Long Short-Term Memory untuk prediksi pola transaksi per jam ke depan. Menggunakan TensorFlow.js secara real-time di browser.",
    usecases : ["Forecasting jam", "Pola temporal", "Prediksi volume"],
    metrics  : ["MAE", "RMSE", "MAPE"],
    complexity: "Tinggi",
    speed    : "Perlu Training",
  },
];

const CATEGORIES = ["Semua", "Clustering", "Supervised", "Anomaly Detection", "Deep Learning"];

/* ─── Shared Styles ─────────────────────────────────────────── */
const card = {
  background   : C.cardBg,
  borderRadius : 20,
  border       : `1px solid ${C.border}`,
  boxShadow    : "0 2px 24px rgba(0,63,135,0.07)",
  transition   : "all 240ms cubic-bezier(0.4,0,0.2,1)",
};

/* ─── Method Card ───────────────────────────────────────────── */
function MethodCard({ method, onNavigate }) {
  const [hov, setHov] = useState(false);
  const Icon = method.icon;

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onNavigate(method.id)}
      style={{
        ...card,
        cursor: "pointer",
        transform: hov ? "translateY(-4px)" : "none",
        boxShadow: hov
          ? `0 16px 48px rgba(0,63,135,0.13), 0 0 0 2px ${method.color}22`
          : card.boxShadow,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Gradient Header */}
      <div style={{
        background: method.gradient,
        padding: "22px 22px 18px",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Deco circles */}
        <div style={{ position:"absolute", right:-24, top:-24, width:100, height:100, borderRadius:"50%", background:"rgba(255,255,255,0.07)" }} />
        <div style={{ position:"absolute", right:20, bottom:-32, width:72, height:72, borderRadius:"50%", background:"rgba(255,255,255,0.05)" }} />

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", position:"relative" }}>
          <div style={{ width:46, height:46, borderRadius:13, background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Icon size={22} color="white" strokeWidth={1.8} />
          </div>
          <span style={{
            fontSize:10, fontWeight:800, padding:"3px 10px", borderRadius:999,
            background:"rgba(255,255,255,0.2)", color:"rgba(255,255,255,0.95)",
            letterSpacing:"0.06em", textTransform:"uppercase",
          }}>
            {method.category}
          </span>
        </div>

        <div style={{ marginTop:14 }}>
          <div style={{ fontSize:17, fontWeight:800, color:"white", lineHeight:1.2, fontFamily:"'Playfair Display', serif" }}>
            {method.label}
          </div>
          <span style={{
            display:"inline-block", marginTop:6, fontSize:10, fontWeight:700,
            padding:"2px 10px", borderRadius:999, letterSpacing:"0.06em",
            background:"rgba(255,255,255,0.15)", color:"rgba(255,255,255,0.9)",
          }}>
            {method.badge}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding:"18px 22px 20px", flex:1, display:"flex", flexDirection:"column" }}>
        <p style={{ fontSize:13, color:C.bodyText, lineHeight:1.7, margin:"0 0 16px", flex:1 }}>
          {method.desc}
        </p>

        {/* Use cases */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.mutedText, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:7 }}>
            Kasus Penggunaan
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
            {method.usecases.map(u => (
              <span key={u} style={{
                fontSize:11, padding:"3px 10px", borderRadius:999,
                background: method.color + "12",
                color: method.color, fontWeight:600,
                border: `1px solid ${method.color}22`,
              }}>{u}</span>
            ))}
          </div>
        </div>

        {/* Metrics */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:C.mutedText, textTransform:"uppercase", letterSpacing:"0.10em", marginBottom:7 }}>
            Metrik Utama
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
            {method.metrics.map(m => (
              <span key={m} style={{
                fontSize:11, padding:"3px 10px", borderRadius:999,
                background:C.inputBg, color:C.bodyText, fontWeight:600,
                border:`1px solid ${C.border}`,
              }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Footer row */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", paddingTop:14, borderTop:`1px solid ${C.border}` }}>
          <div style={{ display:"flex", gap:16 }}>
            {[["Kompleksitas", method.complexity], ["Kecepatan", method.speed]].map(([lbl, val]) => (
              <div key={lbl}>
                <div style={{ fontSize:9, fontWeight:700, color:C.mutedText, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:2 }}>{lbl}</div>
                <div style={{ fontSize:11, fontWeight:700, color:C.darkBlue }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{
            display:"flex", alignItems:"center", gap:5,
            fontSize:12, fontWeight:700, color: hov ? method.color : C.mutedText,
            transition:"color 0.2s",
          }}>
            Buka <ChevronRight size={14} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Stats Bar ─────────────────────────────────────────────── */
function StatBadge({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      display:"flex", alignItems:"center", gap:10,
      background:C.cardBg, borderRadius:14,
      padding:"14px 20px", border:`1px solid ${C.border}`,
      boxShadow:"0 2px 12px rgba(0,63,135,0.05)",
    }}>
      <div style={{ width:36, height:36, borderRadius:10, background:color+"15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
        <Icon size={17} color={color} />
      </div>
      <div>
        <div style={{ fontSize:10, fontWeight:700, color:C.mutedText, textTransform:"uppercase", letterSpacing:"0.10em" }}>{label}</div>
        <div style={{ fontSize:16, fontWeight:800, color:C.darkBlue, marginTop:1 }}>{value}</div>
      </div>
    </div>
  );
}

/* ─── Comparison Table ──────────────────────────────────────── */
function ComparisonTable() {
  const rows = [
    { method:"K-Means",         type:"Clustering",   supervised:"✗", anomaly:"✗", timeseries:"✗", realtime:"✓", complexity:"O(nkt)" },
    { method:"DBSCAN",          type:"Clustering",   supervised:"✗", anomaly:"✓", timeseries:"✗", realtime:"✓", complexity:"O(n²)" },
    { method:"Regresi",         type:"Regression",   supervised:"✓", anomaly:"✗", timeseries:"Sebagian", realtime:"✓", complexity:"O(n)" },
    { method:"Isolation Forest",type:"Anomaly Det.", supervised:"✗", anomaly:"✓", timeseries:"✗", realtime:"✓", complexity:"O(n log n)" },
    { method:"Autoencoder",     type:"Deep Learning",supervised:"✗", anomaly:"✓", timeseries:"✗", realtime:"Perlu train", complexity:"O(epoch·n)" },
    { method:"LSTM",            type:"Deep Learning",supervised:"✓", anomaly:"✗", timeseries:"✓", realtime:"Perlu train", complexity:"O(epoch·n)" },
  ];
  const cols = ["Metode","Tipe","Supervised","Anomaly","Time Series","Realtime","Kompleksitas"];

  return (
    <div style={{ ...card, padding:"24px", overflowX:"auto" }}>
      <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:18 }}>
        <BarChart2 size={16} color={C.blue} />
        <div style={{ fontSize:15, fontWeight:700, color:C.darkBlue }}>Perbandingan Semua Metode</div>
        <span style={{ marginLeft:"auto", fontSize:11, fontWeight:700, padding:"3px 12px", borderRadius:999, background:C.badgeBg, color:C.blue }}>Referensi</span>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:600 }}>
        <thead>
          <tr style={{ background:C.inputBg }}>
            {cols.map(c => (
              <th key={c} style={{ padding:"10px 14px", textAlign:"left", fontSize:10, fontWeight:700, color:C.mutedText, textTransform:"uppercase", letterSpacing:"0.08em", borderBottom:`2px solid ${C.border}`, whiteSpace:"nowrap" }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.method} style={{ borderBottom:`1px solid ${C.border}`, background: i%2===0 ? C.cardBg : C.inputBg }}>
              <td style={{ padding:"10px 14px", fontWeight:700, color:C.darkBlue }}>{r.method}</td>
              <td style={{ padding:"10px 14px", color:C.bodyText }}>{r.type}</td>
              {[r.supervised, r.anomaly, r.timeseries, r.realtime].map((v, j) => (
                <td key={j} style={{ padding:"10px 14px" }}>
                  <span style={{
                    fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:999,
                    background: v==="✓" ? "#dcfce7" : v==="✗" ? "#fee2e2" : "#fef3c7",
                    color: v==="✓" ? "#166534" : v==="✗" ? "#991b1b" : "#92400e",
                  }}>{v}</span>
                </td>
              ))}
              <td style={{ padding:"10px 14px", fontFamily:"monospace", fontSize:11, color:C.bodyText }}>{r.complexity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── When to Use Guide ─────────────────────────────────────── */
function GuideCard({ icon: Icon, color, title, items }) {
  return (
    <div style={{ ...card, padding:"20px 22px" }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:color+"15", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
          <Icon size={16} color={color} />
        </div>
        <div style={{ fontSize:13, fontWeight:700, color:C.darkBlue }}>{title}</div>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start" }}>
            <ArrowRight size={12} color={color} style={{ marginTop:2, flexShrink:0 }} />
            <span style={{ fontSize:12, color:C.bodyText, lineHeight:1.6 }}>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
export default function MachineLearningPage({ onNavigate }) {
  const [activeCategory, setActiveCategory] = useState("Semua");

  const filtered = activeCategory === "Semua"
    ? ML_METHODS
    : ML_METHODS.filter(m => m.category === activeCategory);

  const handleNavigate = (id) => {
    if (onNavigate) onNavigate(id);
  };

  return (
    <div style={{ background:C.pageBg, minHeight:"100vh", fontFamily:"'DM Sans', sans-serif" }}>

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div style={{
        background:`linear-gradient(135deg, ${C.darkBlue} 0%, ${C.blue} 55%, #005299 100%)`,
        margin:"20px 28px 0",
        borderRadius:20,
        padding:"32px 36px 28px",
        position:"relative", overflow:"hidden",
      }}>
        {/* Decorative */}
        <div style={{ position:"absolute", right:-60, top:-60, width:280, height:280, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ position:"absolute", right:80, bottom:-80, width:200, height:200, borderRadius:"50%", background:"rgba(255,255,255,0.03)" }} />
        <div style={{ position:"absolute", left:"30%", top:-30, width:160, height:160, borderRadius:"50%", background:`rgba(243,112,33,0.08)` }} />
        <div style={{ position:"absolute", left:"55%", bottom:-20, width:100, height:100, borderRadius:"50%", background:`rgba(0,169,157,0.08)` }} />

        <div style={{ position:"relative", zIndex:1 }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:24, flexWrap:"wrap" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <div style={{ width:52, height:52, borderRadius:14, background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <Cpu size={24} color="white" strokeWidth={1.6} />
                </div>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>
                    BNI Life Insurance
                  </div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:"0.14em", color:"rgba(255,255,255,0.5)", textTransform:"uppercase" }}>
                    Analytics Platform
                  </div>
                </div>
              </div>

              <h1 style={{ margin:"0 0 10px", fontSize:28, fontWeight:800, color:"white", lineHeight:1.15, fontFamily:"'Playfair Display', serif", letterSpacing:"-0.5px" }}>
                Machine Learning<br />
                <span style={{ fontStyle:"italic", color:"rgba(255,255,255,0.75)" }}>Dashboard Hub</span>
              </h1>
              <p style={{ margin:0, fontSize:14, color:"rgba(255,255,255,0.65)", lineHeight:1.7, maxWidth:520 }}>
                Pusat seluruh metode analitik dan machine learning untuk deteksi anomali, clustering, regresi, dan forecasting transaksi BNI Life.
              </p>
            </div>

            {/* Quick stats */}
            <div style={{ display:"flex", flexDirection:"column", gap:10, flexShrink:0 }}>
              {[
                { label:"Metode ML", value:"6",  icon: Layers,  color:C.orange },
                { label:"Deep Learning", value:"2", icon: Brain,   color:C.teal },
                { label:"Anomaly Methods", value:"3", icon: Shield, color:C.red },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} style={{ display:"flex", alignItems:"center", gap:10, background:"rgba(255,255,255,0.1)", borderRadius:12, padding:"10px 16px", border:"1px solid rgba(255,255,255,0.1)" }}>
                  <Icon size={15} color={color} />
                  <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)" }}>{label}:</span>
                  <span style={{ fontSize:14, fontWeight:800, color:"white" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding:"24px 28px 48px" }}>

        {/* ── Stats Row ──────────────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14, marginBottom:28 }}>
          <StatBadge icon={Zap}        label="Unsupervised"  value="K-Means, DBSCAN" color={C.blue}   />
          <StatBadge icon={Target}     label="Supervised"    value="Regresi, LSTM"    color={C.orange} />
          <StatBadge icon={AlertTriangle} label="Anomaly Detection" value="IF, Autoencoder, DBSCAN" color={C.red} />
          <StatBadge icon={BookOpen}   label="Total Metode"  value="6 Dashboard"     color={C.teal}   />
        </div>

        {/* ── Category Filter ────────────────────────────────────── */}
        <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding:"8px 18px", borderRadius:999, fontSize:12, fontWeight:700,
                cursor:"pointer", transition:"all 0.15s", border:"none",
                background: activeCategory===cat ? C.blue : C.cardBg,
                color: activeCategory===cat ? "white" : C.bodyText,
                boxShadow: activeCategory===cat ? `0 4px 16px ${C.blue}30` : "0 1px 4px rgba(0,0,0,0.06)",
                border: `1px solid ${activeCategory===cat ? C.blue : C.border}`,
              }}
            >
              {cat}
              <span style={{ marginLeft:6, fontSize:10, opacity:0.75 }}>
                ({cat==="Semua" ? ML_METHODS.length : ML_METHODS.filter(m=>m.category===cat).length})
              </span>
            </button>
          ))}
        </div>

        {/* ── Section Label ──────────────────────────────────────── */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:C.darkBlue, fontFamily:"'Playfair Display', serif" }}>
              {activeCategory === "Semua" ? "Semua Metode" : activeCategory}
            </div>
            <div style={{ fontSize:12, color:C.mutedText, marginTop:3 }}>
              Klik kartu untuk membuka dashboard metode tersebut
            </div>
          </div>
          <span style={{ fontSize:12, color:C.mutedText }}>
            {filtered.length} metode
          </span>
        </div>

        {/* ── Method Cards Grid ──────────────────────────────────── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:20, marginBottom:32 }}>
          {filtered.map(method => (
            <MethodCard key={method.id} method={method} onNavigate={handleNavigate} />
          ))}
        </div>

        {/* ── When to Use Guide ──────────────────────────────────── */}
        <div style={{ marginBottom:28 }}>
          <div style={{ fontSize:18, fontWeight:800, color:C.darkBlue, fontFamily:"'Playfair Display', serif", marginBottom:5 }}>
            Panduan Pemilihan Metode
          </div>
          <div style={{ fontSize:12, color:C.mutedText, marginBottom:18 }}>Gunakan referensi ini untuk memilih metode yang tepat sesuai kebutuhan analisis</div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            <GuideCard icon={Crosshair} color={C.blue} title="Gunakan Clustering (K-Means / DBSCAN) jika…"
              items={["Ingin mengelompokkan teller berdasarkan pola perilaku", "Belum ada label atau target prediksi", "Ingin menemukan pola tersembunyi dalam data", "DBSCAN jika tidak tahu jumlah cluster / ada noise"]} />
            <GuideCard icon={AlertTriangle} color={C.red} title="Gunakan Anomaly Detection (IF / Autoencoder) jika…"
              items={["Ingin mendeteksi transaksi mencurigakan / fraud", "Data normal jauh lebih banyak dari anomali", "Butuh skor risiko numerik per transaksi", "Autoencoder jika pola anomali sangat kompleks"]} />
            <GuideCard icon={Waves} color="#0891b2" title="Gunakan Time Series (Regresi / LSTM) jika…"
              items={["Ingin memprediksi nilai atau volume transaksi", "Data memiliki urutan waktu (per jam, hari)", "Regresi untuk tren linear, LSTM untuk pola non-linear", "LSTM jika ada dependensi jangka panjang"]} />
          </div>
        </div>

        {/* ── Comparison Table ───────────────────────────────────── */}
        <ComparisonTable />

        {/* Footer */}
        <p style={{ textAlign:"center", fontSize:11, color:C.mutedText, marginTop:32 }}>
          © 2025 BNI Life Insurance — Machine Learning Analytics Hub
        </p>
      </div>
    </div>
  );
}