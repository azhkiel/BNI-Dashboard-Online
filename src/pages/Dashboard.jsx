import { useRef, useState } from "react";
import useChart from "../hooks/useChart";
import { formatIDR, groupSum, exportToCSV, exportToPDF, BNI_COLORS } from "../utils";

const makeOptions = (base) => ({
  ...base,
  animation: false,
  responsive: true,
});

const CHART_OPTIONS = {
  monthly: makeOptions({
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { callback: (v) => formatIDR(v) }, grid: { color: "rgba(0,0,0,0.05)" } },
      x: { grid: { display: false } },
    },
  }),
  product: makeOptions({
    cutout: "60%",
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
            return ` ${ctx.label}: ${pct}% (${formatIDR(ctx.raw)})`;
          },
        },
      },
      datalabels: {
        color: "white",
        font: { weight: "bold", size: 11 },
        formatter: (value, ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          return pct + "%";
        },
        display: (ctx) => {
          const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
          return total > 0 ? (ctx.dataset.data[ctx.dataIndex] / total) > 0.05 : false;
        },
      },
    },
  }),
  horizontal: makeOptions({
    indexAxis: "y",
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { callback: (v) => formatIDR(v) }, grid: { color: "rgba(0,0,0,0.05)" } },
      y: { grid: { display: false } },
    },
  }),
  fee: makeOptions({
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { callback: (v) => formatIDR(v) }, grid: { color: "rgba(0,0,0,0.05)" } },
      x: { grid: { display: false } },
    },
  }),
};

// ── SVG Icons ──
const IconMoney = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M12 6v2m0 8v2M9.5 9.5A2.5 2.5 0 0 1 12 8a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 0 0 5 2.5 2.5 0 0 0 2.5-1.5"/>
  </svg>
);
const IconTrend = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);
const IconClipboard = ({ color }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
    <line x1="9" y1="12" x2="15" y2="12"/>
    <line x1="9" y1="16" x2="13" y2="16"/>
  </svg>
);
const IconBank = ({ color = "white" }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="22" x2="21" y2="22"/>
    <line x1="6" y1="18" x2="6" y2="11"/>
    <line x1="10" y1="18" x2="10" y2="11"/>
    <line x1="14" y1="18" x2="14" y2="11"/>
    <line x1="18" y1="18" x2="18" y2="11"/>
    <polygon points="12 2 20 7 4 7"/>
  </svg>
);
const IconDownload = ({ color = "white" }) => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);
const IconArrowUp = ({ color = "#22c55e" }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="19" x2="12" y2="5"/>
    <polyline points="5 12 12 5 19 12"/>
  </svg>
);
// ── KPI Card ──
function KpiCard({ label, value, IconComponent, iconColor, cardClass, iconBg, pct, delay, loading }) {
  return (
    <div className={`kpi-card ${cardClass} fade-up ${delay}`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            {label}
          </p>
          {loading
            ? <div className="shimmer" />
            : <div style={{ fontSize: 24, fontWeight: 800, color: "#002960" }}>{value}</div>
          }
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", background: iconBg, flexShrink: 0 }}>
          <IconComponent color={iconColor} />
        </div>
      </div>
    </div>
  );
}
// ── Chart Card ──
function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="chart-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div style={{ fontWeight: 700, color: "#002960", fontSize: 15 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>
        </div>
        <span className="badge">{badge}</span>
      </div>
      {children}
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard({ data, loading }) {
  const monthlyRef   = useRef(null);
  const productRef   = useRef(null);
  const basRef       = useRef(null);
  const lsrRef       = useRef(null);
  const dashboardRef = useRef(null);
  const feeRef       = useRef(null);
  const [exporting, setExporting] = useState(false);

  const chartData = !loading && data ? (() => {
    const monthly = groupSum(data, "Periode", "Basic Premium Regular");
    const product = groupSum(data, "Product", "Basic Premium Regular");
    const fee     = groupSum(data, "Periode", "Fee Based");
    const bas     = Object.entries(groupSum(data, "BAS Name", "Basic Premium Regular"))
      .sort((a, b) => b[1] - a[1]).slice(0, 5);
    const lsr     = Object.entries(groupSum(data, "LSR Name", "Basic Premium Regular"))
      .sort((a, b) => b[1] - a[1]).slice(0, 5);
    return { monthly, product, fee, bas, lsr };
  })() : null;

  useChart(monthlyRef, "bar", chartData && {
    labels: Object.keys(chartData.monthly),
    datasets: [{ label: "Premium", data: Object.values(chartData.monthly), backgroundColor: "#003F87", borderRadius: 6, borderSkipped: false }],
  }, CHART_OPTIONS.monthly);

  useChart(productRef, "doughnut", chartData && {
    labels: Object.keys(chartData.product),
    datasets: [{ data: Object.values(chartData.product), backgroundColor: BNI_COLORS, borderWidth: 2, borderColor: "white" }],
  }, CHART_OPTIONS.product);

  useChart(basRef, "bar", chartData && {
    labels: chartData.bas.map((b) => b[0]),
    datasets: [{ label: "Premium", data: chartData.bas.map((b) => b[1]), backgroundColor: "#F37021", borderRadius: 6, borderSkipped: false }],
  }, CHART_OPTIONS.horizontal);

  useChart(lsrRef, "bar", chartData && {
    labels: chartData.lsr.map((b) => b[0]),
    datasets: [{ label: "Premium", data: chartData.lsr.map((b) => b[1]), backgroundColor: "#00A99D", borderRadius: 6, borderSkipped: false }],
  }, CHART_OPTIONS.horizontal);

  useChart(feeRef, "bar", chartData && {
    labels: Object.keys(chartData.fee),
    datasets: [{
      label: "Fee Based",
      data: Object.values(chartData.fee),
      backgroundColor: "#00A99D",
      borderRadius: 6,
      borderSkipped: false,
    }],
  }, CHART_OPTIONS.fee);

  const totalPremium = data ? data.reduce((s, r) => s + Number(r["Basic Premium Regular"] || 0), 0) : 0;
  const totalFee     = data ? data.reduce((s, r) => s + Number(r["Fee Based"] || 0), 0) : 0;
  const totalPolicy  = data ? data.length : 0;

  const dateStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });

  // ── NEW: export PDF menggunakan jsPDF programatik (bukan screenshot) ──
  async function handleExportPDF() {
    if (!chartData || loading) return;
    setExporting(true);
    try {
      await exportToPDF(
        null,                          // element tidak dipakai lagi
        "Dashboard_Produksi_BNI_Life",
        chartData,                     // { monthly, product, fee, bas, lsr }
        { totalPremium, totalFee, totalPolicy },
        dateStr,
        BNI_COLORS,
        formatIDR
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ padding: "24px 32px" }} className="page-main">

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        <button
          className="btn-emerald"
          onClick={handleExportPDF}
          disabled={exporting || loading}
          style={{ opacity: (exporting || loading) ? 0.7 : 1, cursor: (exporting || loading) ? "not-allowed" : "pointer" }}
        >
          {exporting ? (
            <><span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⏳</span> Membuat PDF...</>
          ) : (
            <><IconDownload /> Download PDF</>
          )}
        </button>
        <button
          className="btn-emerald"
          onClick={() => exportToCSV(data)}
          disabled={loading}
          style={{ background: "linear-gradient(135deg, #0369a1 0%, #075985 100%)", opacity: loading ? 0.7 : 1 }}
        >
          <IconDownload /> Download CSV
        </button>
      </div>

      {/* Dashboard UI (tidak dipakai untuk PDF lagi) */}
      <div ref={dashboardRef} style={{ background: "#F0F4FA", padding: 4 }}>

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #002960 0%, #003F87 100%)",
          borderRadius: 16, padding: "20px 24px", marginBottom: 20,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: "rgba(255,255,255,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IconBank />
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 800, fontSize: 20 }}>BNI Life Insurance</div>
              <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 13, marginTop: 2 }}>
                Laporan Dashboard Produksi 2025
              </div>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Dicetak pada
            </div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 14, marginTop: 2 }}>{dateStr}</div>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 20 }}>
          <KpiCard label="Total Premium"   value={formatIDR(totalPremium)} IconComponent={IconMoney}     iconColor="#F37021" iconBg="rgba(243,112,33,0.1)"  cardClass="kpi-orange" pct="12.4%" delay="d1" loading={loading} />
          <KpiCard label="Total Fee Based" value={formatIDR(totalFee)}     IconComponent={IconTrend}     iconColor="#003F87" iconBg="rgba(0,63,135,0.1)"    cardClass="kpi-navy"   pct="8.1%"  delay="d2" loading={loading} />
          <KpiCard label="Jumlah Polis"    value={totalPolicy}              IconComponent={IconClipboard} iconColor="#00A99D" iconBg="rgba(0,169,157,0.1)"   cardClass="kpi-teal"   pct="5.7%"  delay="d3" loading={loading} />
        </div>

        {/* Charts Row 1 */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 20, marginBottom: 20 }}>
          <ChartCard title="Premium per Bulan" subtitle="Tren premi bulanan tahun 2025" badge="2025">
            <canvas ref={monthlyRef} height="140" />
          </ChartCard>
          <ChartCard title="Komposisi Produk" subtitle="Distribusi per jenis produk" badge="Produk">
            <div style={{ maxWidth: 260, margin: "0 auto" }}>
              <canvas ref={productRef} />
            </div>
          </ChartCard>
        </div>

        {/* Fee Based Chart */}
        <div style={{ marginBottom: 20 }}>
          <ChartCard title="Fee Based per Bulan" subtitle="Tren fee based bulanan tahun 2025" badge="Fee">
            <canvas ref={feeRef} height="100" />
          </ChartCard>
        </div>

        {/* Charts Row 2 */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 8 }}>
          <ChartCard title="Top 5 BAS" subtitle="BAS dengan premi tertinggi" badge="Ranking">
            <canvas ref={basRef} height="180" />
          </ChartCard>
          <ChartCard title="Top 5 Kontribusi LG" subtitle="LSR dengan premi tertinggi" badge="Ranking">
            <canvas ref={lsrRef} height="180" />
          </ChartCard>
        </div>

      </div>

      <div style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", paddingTop: 20, paddingBottom: 8 }}>
        © 2025 BNI Life Insurance — Dashboard Produksi Internal
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}