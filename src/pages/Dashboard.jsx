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

// ── Lucide Icons ──
import {
  DollarSign,
  TrendingUp,
  ClipboardList,
  Landmark,
  Download,
  ArrowUp,
  Loader2,
} from "lucide-react";

// ── KPI Card ──
function KpiCard({ label, value, icon: Icon, iconColor, accentColor, iconBg, loading }) {
  return (
    <div className="relative bg-white rounded-[18px] shadow-[0_2px_20px_rgba(0,63,135,0.07)] border border-[rgba(0,63,135,0.07)] overflow-hidden px-6 py-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(0,63,135,0.13)]">
      {/* Top accent bar */}
      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[18px]" style={{ background: accentColor }} />

      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
            {label}
          </p>
          {loading ? (
            <div className="h-7 w-32 rounded-lg bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 bg-[length:400px_100%] animate-[shimmer_1.4s_infinite]" />
          ) : (
            <div className="text-2xl font-extrabold text-[#002960]">{value}</div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-[14px] flex items-center justify-center shrink-0"
          style={{ background: iconBg }}
        >
          <Icon size={22} style={{ color: iconColor }} />
        </div>
      </div>
    </div>
  );
}

// ── Chart Card ──
function ChartCard({ title, subtitle, badge, children }) {
  return (
    <div className="bg-white rounded-[18px] shadow-[0_2px_20px_rgba(0,63,135,0.07)] border border-[rgba(0,63,135,0.06)] p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,63,135,0.11)] min-w-0">
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="font-bold text-[#002960] text-[15px]">{title}</div>
          <div className="text-xs text-slate-400 mt-0.5">{subtitle}</div>
        </div>
        <span className="inline-flex items-center gap-1 bg-[#EEF4FF] text-[#003F87] text-[11px] font-bold px-3 py-1 rounded-full whitespace-nowrap shrink-0">
          {badge}
        </span>
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

  async function handleExportPDF() {
    if (!chartData || loading) return;
    setExporting(true);
    try {
      await exportToPDF(
        null,
        "Dashboard_Produksi_BNI_Life",
        chartData,
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
    <div className="px-8 py-6 max-w-full overflow-x-hidden">

      {/* ── Action Buttons ── */}
      <div className="flex gap-2.5 mb-5 flex-wrap">
        <button
          onClick={handleExportPDF}
          disabled={exporting || loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white
            bg-gradient-to-br from-emerald-500 to-emerald-700
            shadow-[0_4px_14px_rgba(5,150,105,0.25)]
            transition-all duration-200
            hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_6px_20px_rgba(5,150,105,0.35)]
            disabled:opacity-65 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <><Loader2 size={14} className="animate-spin" /> Membuat PDF...</>
          ) : (
            <><Download size={14} /> Download PDF</>
          )}
        </button>

        <button
          onClick={() => exportToCSV(data)}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white
            bg-gradient-to-br from-sky-600 to-sky-800
            shadow-[0_4px_14px_rgba(3,105,161,0.25)]
            transition-all duration-200
            hover:not-disabled:-translate-y-0.5 hover:not-disabled:shadow-[0_6px_20px_rgba(3,105,161,0.35)]
            disabled:opacity-65 disabled:cursor-not-allowed"
        >
          <Download size={14} /> Download CSV
        </button>
      </div>

      {/* ── Dashboard Content ── */}
      <div className="bg-[#F0F4FA] p-1 rounded-2xl">

        {/* ── Header ── */}
        <div
          className="rounded-2xl px-6 py-5 mb-5 flex items-center justify-between relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, #002960 0%, #003F87 100%)" }}
        >
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/[0.04]" />
          <div className="absolute right-16 -bottom-14 w-36 h-36 rounded-full bg-white/[0.03]" />

          <div className="flex items-center gap-3.5 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/15 flex items-center justify-center shrink-0">
              <Landmark size={26} color="white" strokeWidth={1.8} />
            </div>
            <div>
              <div className="text-white font-extrabold text-xl">BNI Life Insurance</div>
              <div className="text-white/65 text-[13px] mt-0.5 font-normal">
                Laporan Dashboard Produksi 2025
              </div>
            </div>
          </div>

          <div className="text-right relative z-10">
            <div className="text-white/50 text-[11px] uppercase tracking-widest font-semibold">Dicetak pada</div>
            <div className="text-white font-bold text-sm mt-0.5">{dateStr}</div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-3 gap-5 mb-5">
          <KpiCard
            label="Total Premium"
            value={formatIDR(totalPremium)}
            icon={DollarSign}
            iconColor="#F37021"
            iconBg="rgba(243,112,33,0.1)"
            accentColor="#F37021"
            loading={loading}
          />
          <KpiCard
            label="Total Fee Based"
            value={formatIDR(totalFee)}
            icon={TrendingUp}
            iconColor="#003F87"
            iconBg="rgba(0,63,135,0.1)"
            accentColor="#003F87"
            loading={loading}
          />
          <KpiCard
            label="Jumlah Polis"
            value={totalPolicy}
            icon={ClipboardList}
            iconColor="#00A99D"
            iconBg="rgba(0,169,157,0.1)"
            accentColor="#00A99D"
            loading={loading}
          />
        </div>

        {/* ── Charts Row 1: Monthly + Product ── */}
        <div className="grid grid-cols-[2fr_1fr] gap-5 mb-5">
          <ChartCard title="Premium per Bulan" subtitle="Tren premi bulanan tahun 2025" badge="2025">
            <canvas ref={monthlyRef} height={140} />
          </ChartCard>
          <ChartCard title="Komposisi Produk" subtitle="Distribusi per jenis produk" badge="Produk">
            <div className="max-w-[260px] mx-auto">
              <canvas ref={productRef} />
            </div>
          </ChartCard>
        </div>

        {/* ── Fee Based Chart ── */}
        <div className="mb-5">
          <ChartCard title="Fee Based per Bulan" subtitle="Tren fee based bulanan tahun 2025" badge="Fee">
            <canvas ref={feeRef} height={100} />
          </ChartCard>
        </div>

        {/* ── Charts Row 2: BAS + LSR ── */}
        <div className="grid grid-cols-2 gap-5 mb-2">
          <ChartCard title="Top 5 BAS" subtitle="BAS dengan premi tertinggi" badge="Ranking">
            <canvas ref={basRef} height={180} />
          </ChartCard>
          <ChartCard title="Top 5 Kontribusi LG" subtitle="LSR dengan premi tertinggi" badge="Ranking">
            <canvas ref={lsrRef} height={180} />
          </ChartCard>
        </div>

      </div>

      {/* ── Footer ── */}
      <p className="text-center text-xs text-slate-400 pt-5 pb-2">
        © 2025 BNI Life Insurance — Dashboard Produksi Internal
      </p>
    </div>
  );
}