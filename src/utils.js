export const BNI_COLORS = [
  "#003F87", "#F37021", "#00A99D", "#6C5CE7", "#E17055",
  "#0984E3", "#FDCB6E", "#00B894", "#D63031", "#A29BFE",
];

// ─────────────────────────────────────────────────────────────
//  PARSE PERIODE
// ─────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function _parsePeriode(str) {
  if (!str) return null;
  const s = String(str).trim();
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (s.startsWith(MONTH_NAMES[i])) {
      const yearMatch = s.match(/(\d{4})/);
      const year = yearMatch ? parseInt(yearMatch[1]) : new Date().getFullYear();
      return new Date(year, i, 1);
    }
  }
  const parts = s.split("/");
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, 1);
  }
  const d = new Date(s);
  return isNaN(d) ? null : d;
}

function _periodeLabel(str) {
  const d = _parsePeriode(str);
  if (!d) return str;
  return MONTH_NAMES[d.getMonth()] + " " + d.getFullYear();
}

function _periodeSortKey(str) {
  const d = _parsePeriode(str);
  if (!d) return 0;
  return d.getFullYear() * 100 + d.getMonth();
}

export function groupSum(arr, key, sumKey) {
  if (!arr || !arr.length) return {};
  const isPeriode = key === "Periode";
  const map   = {};
  const order = {};

  arr.forEach((r) => {
    const raw = r[key] || "Lainnya";
    const k   = isPeriode ? _periodeLabel(raw) : raw;
    map[k]   = (map[k]   || 0) + Number(r[sumKey] || 0);
    if (isPeriode) order[k] = Math.min(order[k] ?? Infinity, _periodeSortKey(raw));
  });

  if (!isPeriode) return map;
  return Object.fromEntries(
    Object.entries(map).sort((a, b) => (order[a[0]] || 0) - (order[b[0]] || 0))
  );
}

export function formatIDR(n) {
  const num = Number(n || 0);
  if (num >= 1e9) return "Rp " + (num / 1e9).toFixed(2) + " M";
  if (num >= 1e6) return "Rp " + (num / 1e6).toFixed(2) + " Jt";
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(num);
}

export function exportToCSV(data) {
  if (!data || !data.length) { alert("Tidak ada data"); return; }
  const cols = Object.keys(data[0]);
  const rows = data.map((r) =>
    cols.map((c) => `"${String(r[c] || "").replace(/"/g, '""')}"`).join(",")
  );
  const csv = [cols.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "Dashboard_Produksi.csv"; a.click();
  URL.revokeObjectURL(url);
}

// ─────────────────────────────────────────────────────────────
//  PAGE SIZE — 16:9 landscape
// ─────────────────────────────────────────────────────────────
const PW = 297;
const PH = 167.0625;
const M  = 10;

// ─────────────────────────────────────────────────────────────
//  LOW-LEVEL HELPERS
// ─────────────────────────────────────────────────────────────
function rgb(h) {
  const s = h.replace("#", "");
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}
function F(pdf, c) { 
  const [r,g,b] = rgb(c); pdf.setFillColor(r,g,b); 
}
function S(pdf, c) { 
  const [r,g,b] = rgb(c); pdf.setDrawColor(r,g,b); 
}
function T(pdf, c) { 
  const [r,g,b] = rgb(c); pdf.setTextColor(r,g,b); 
}
function A(pdf, a) { 
  pdf.setGState(pdf.GState({ opacity: a })); 
}
function RR(pdf, x, y, w, h, r, m="F") { 
  pdf.roundedRect(x, y, w, h, r, r, m); 
}

// ─────────────────────────────────────────────────────────────
//  BACKGROUND — subtle gradient feel via layered shapes
// ─────────────────────────────────────────────────────────────
function drawBg(pdf) {
  // Base
  F(pdf, "#F0F4FB"); pdf.rect(0, 0, PW, PH, "F");
  // Top-left accent orb
  F(pdf, "#003F87"); A(pdf, 0.05); pdf.circle(0, 0, 55, "F"); A(pdf, 1);
  // Bottom-right accent orb
  F(pdf, "#F37021"); A(pdf, 0.05); pdf.circle(PW, PH, 65, "F"); A(pdf, 1);
  // Subtle dot grid
  F(pdf, "#003F87"); A(pdf, 0.022);
  for (let ry = 0; ry <= PH; ry += 8)
    for (let cx = 0; cx <= PW; cx += 8)
      pdf.circle(cx, ry, 0.45, "F");
  A(pdf, 1);
}

// ─────────────────────────────────────────────────────────────
//  HEADER STRIP — full-width top bar
// ─────────────────────────────────────────────────────────────
function drawHeader(pdf, title, subtitle, dateStr) {
  const HH = 22;
  // Dark bar
  F(pdf, "#002060"); pdf.rect(0, 0, PW, HH, "F");
  // Orange left accent stripe
  F(pdf, "#F37021"); pdf.rect(0, 0, 6, HH, "F");
  // Logo box
  F(pdf, "#003F87"); RR(pdf, 12, 4, 20, 14, 2.5);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); T(pdf, "#FFFFFF");
  pdf.text("BNI", 22, 10.5, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(5);
  pdf.text("LIFE", 22, 15.5, { align: "center" });

  // Title
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); T(pdf, "#FFFFFF");
  pdf.text(title, 38, 11);
  // Subtitle
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); T(pdf, "#8FB8E8");
  pdf.text(subtitle, 38, 18);

  // Date — right side
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); T(pdf, "#8FB8E8");
  pdf.text("Dicetak:", PW - M, 10, { align: "right" });
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); T(pdf, "#FFFFFF");
  pdf.text(dateStr, PW - M, 18, { align: "right" });
}

// ─────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────
function drawFooter(pdf, pg, tot) {
  const FY = PH - 7;
  F(pdf, "#002060"); pdf.rect(0, FY, PW, 7, "F");
  F(pdf, "#F37021"); pdf.rect(0, FY, 6, 7, "F");
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); T(pdf, "#8FB8E8");
  pdf.text("© 2025 BNI Life Insurance — Dashboard Produksi Internal  |  CONFIDENTIAL", 12, PH - 2.5);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); T(pdf, "#FFFFFF");
  pdf.text(`${pg} / ${tot}`, PW - M, PH - 2.5, { align: "right" });
}

// ─────────────────────────────────────────────────────────────
//  PANEL (card container)
// ─────────────────────────────────────────────────────────────
function drawPanel(pdf, x, y, w, h, title, sub, accent="#003F87") {
  // White card with shadow feel
  F(pdf, "#FFFFFF"); RR(pdf, x + 0.6, y + 0.8, w, h, 4);  // shadow layer
  F(pdf, "#FFFFFF"); RR(pdf, x, y, w, h, 4);
  S(pdf, "#DCE8F5"); pdf.setLineWidth(0.18); RR(pdf, x, y, w, h, 4, "S");
  // Top accent bar
  const [r,g,b] = rgb(accent);
  pdf.setFillColor(r,g,b); pdf.roundedRect(x, y, w, 3.5, 2, 2, "F");
  // Title
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); T(pdf, "#002060");
  pdf.text(title, x + 7, y + 13);
  // Sub
  if (sub) {
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); T(pdf, "#94A3B8");
    pdf.text(sub, x + 7, y + 20);
  }
}

// ─────────────────────────────────────────────────────────────
//  KPI CARD — clean, no percentage badge
// ─────────────────────────────────────────────────────────────
function drawKpi(pdf, x, y, w, h, label, value, accent) {
  const [r,g,b] = rgb(accent);

  // Card background
  F(pdf, "#FFFFFF"); RR(pdf, x + 0.5, y + 0.7, w, h, 5);
  F(pdf, "#FFFFFF"); RR(pdf, x, y, w, h, 5);
  S(pdf, "#DCE8F5"); pdf.setLineWidth(0.18); RR(pdf, x, y, w, h, 5, "S");

  // Left accent stripe
  pdf.setFillColor(r,g,b); pdf.roundedRect(x, y, 5, h, 2.5, 2.5, "F");

  // Decorative background circle
  A(pdf, 0.07); pdf.setFillColor(r,g,b); pdf.circle(x + w - 14, y + h / 2, 16, "F"); A(pdf, 1);

  // Label
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); T(pdf, "#94A3B8");
  pdf.text(label.toUpperCase(), x + 12, y + 13);

  // Divider
  S(pdf, "#E8F0FA"); pdf.setLineWidth(0.25); pdf.line(x + 12, y + 16, x + w - 8, y + 16);

  // Value — dynamic font size
  const vs = String(value);
  const fs = vs.length > 15 ? 12 : vs.length > 11 ? 15 : 20;
  pdf.setFontSize(fs); pdf.setFont("helvetica", "bold"); pdf.setTextColor(r,g,b);
  pdf.text(vs, x + 12, y + h * 0.62 + fs * 0.15);
}

// ─────────────────────────────────────────────────────────────
//  VERTICAL BAR CHART
// ─────────────────────────────────────────────────────────────
function drawBar(pdf, x, y, w, h, labels, values, color, fmt) {
  if (!values || !values.length) return;
  const max = Math.max(...values, 1), n = values.length;
  const bw  = Math.min((w / n) * 0.6, 18);
  const gap = (w - bw * n) / (n + 1);
  const [r,g,b] = rgb(color);

  // Horizontal grid lines
  S(pdf, "#E2EBF5"); pdf.setLineWidth(0.15);
  for (let i = 1; i <= 4; i++) {
    const gy = y + h - (i / 4) * h;
    pdf.line(x, gy, x + w, gy);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); T(pdf, "#AAC0DC");
    pdf.text(fmt ? fmt((i / 4) * max) : ((i / 4) * max).toFixed(0), x - 2, gy + 1.5, { align: "right" });
  }
  // Baseline
  S(pdf, "#BACDE5"); pdf.setLineWidth(0.3); pdf.line(x, y + h, x + w, y + h);

  values.forEach((val, i) => {
    const bh = (val / max) * h;
    const bx = x + gap + i * (bw + gap);
    const by = y + h - bh;

    // Bar fill
    pdf.setFillColor(r,g,b); pdf.roundedRect(bx, by, bw, bh, 2, 2, "F");
    // Gloss highlight
    A(pdf, 0.22); F(pdf, "#FFFFFF"); pdf.roundedRect(bx, by, bw, bh * 0.28, 2, 2, "F"); A(pdf, 1);

    // Value label on top
    if (bh > 7) {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.5); pdf.setTextColor(r,g,b);
      pdf.text(fmt ? fmt(val) : String(val), bx + bw / 2, by - 2, { align: "center" });
    }
    // Month label — abbreviated
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); T(pdf, "#7A90B5");
    pdf.text(String(labels[i] || "").slice(0, 3), bx + bw / 2, y + h + 5.5, { align: "center" });
  });
}

// ─────────────────────────────────────────────────────────────
//  HORIZONTAL BAR CHART (ranking)
// ─────────────────────────────────────────────────────────────
function drawHBar(pdf, x, y, w, h, labels, values, color, fmt) {
  if (!values || !values.length) return;
  const max = Math.max(...values, 1), n = values.length;
  const rowH  = h / n;
  const lblW  = 58;
  const barMax= w - lblW - 28;
  const [r,g,b] = rgb(color);

  values.forEach((val, i) => {
    const bw  = Math.max((val / max) * barMax, 1);
    const ry  = y + i * rowH;
    const bh  = rowH * 0.48;
    const bOff= rowH * 0.26;

    // Rank badge
    pdf.setFillColor(r,g,b); A(pdf, 0.15); RR(pdf, x, ry + bOff, 12, bh, 2.5); A(pdf, 1);
    pdf.setFillColor(r,g,b); A(pdf, 0.9);  RR(pdf, x, ry + bOff, 12, bh, 2.5); A(pdf, 1);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); T(pdf, "#FFFFFF");
    pdf.text(`#${i + 1}`, x + 6, ry + bOff + bh * 0.65, { align: "center" });

    // Label
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); T(pdf, "#142D5A");
    pdf.text(String(labels[i] || "").slice(0, 26), x + 15, ry + bOff + bh * 0.65);

    // Track
    F(pdf, "#D8E8F5"); RR(pdf, x + lblW, ry + bOff, barMax, bh, 2.5);
    // Fill
    pdf.setFillColor(r,g,b); RR(pdf, x + lblW, ry + bOff, bw, bh, 2.5);
    // Gloss
    A(pdf, 0.22); F(pdf, "#FFFFFF"); RR(pdf, x + lblW, ry + bOff, bw, bh * 0.35, 2.5); A(pdf, 1);

    // Value label
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(r,g,b);
    pdf.text(fmt ? fmt(val) : String(val), x + lblW + barMax + 4, ry + bOff + bh * 0.65);
  });
}

// ─────────────────────────────────────────────────────────────
//  DONUT CHART
// ─────────────────────────────────────────────────────────────
function drawDonut(pdf, cx, cy, OR, IR, values, colors, labels, fmt) {
  if (!values || !values.length) return;
  const total = values.reduce((a, b) => a + b, 0);
  if (!total) return;
  const STEPS = 80;
  let sa = -Math.PI / 2;

  values.forEach((val, i) => {
    const sl = (val / total) * Math.PI * 2;
    const [r,g,b] = rgb(colors[i % colors.length]);
    const pts = [];
    for (let s = 0; s <= STEPS; s++) { const a = sa + (sl/STEPS)*s; pts.push([cx+Math.cos(a)*OR, cy+Math.sin(a)*OR]); }
    for (let s = STEPS; s >= 0; s--) { const a = sa + (sl/STEPS)*s; pts.push([cx+Math.cos(a)*IR, cy+Math.sin(a)*IR]); }
    pdf.setFillColor(r,g,b);
    pdf.setDrawColor(255,255,255); pdf.setLineWidth(1.0);
    pdf.lines(pts.slice(1).map((p,idx) => [p[0]-pts[idx][0], p[1]-pts[idx][1]]), pts[0][0], pts[0][1], [1,1], "FD", true);
    if (val / total > 0.05) {
      const ma = sa + sl / 2, lr = (OR + IR) / 2;
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); T(pdf, "#FFFFFF");
      pdf.text(((val/total)*100).toFixed(1)+"%", cx+Math.cos(ma)*lr, cy+Math.sin(ma)*lr+2, { align: "center" });
    }
    sa += sl;
  });

  // Center hole
  F(pdf, "#FFFFFF"); pdf.circle(cx, cy, IR - 0.5, "F");
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); T(pdf, "#002060");
  pdf.text("Total", cx, cy - 2, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); T(pdf, "#6A82A8");
  pdf.text(fmt ? fmt(total) : String(total), cx, cy + 7, { align: "center" });

  // Legend — 2 columns below donut
  const legY = cy + OR + 7;
  const legW = OR * 2;
  const legX = cx - OR;
  values.forEach((v, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const lx  = legX + col * (legW / 2);
    const ly  = legY + row * 9;
    const [r,g,b] = rgb(colors[i % colors.length]);
    pdf.setFillColor(r,g,b); RR(pdf, lx, ly, 7, 5, 1.5);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); T(pdf, "#142D5A");
    pdf.text(String(labels[i] || "").slice(0, 18), lx + 10, ly + 4.5);
  });
}

// ─────────────────────────────────────────────────────────────
//  SECTION DIVIDER LABEL  (small pill-style chip)
// ─────────────────────────────────────────────────────────────
function drawChip(pdf, x, y, text, accent) {
  const [r,g,b] = rgb(accent);
  pdf.setFillColor(r,g,b); A(pdf, 0.12); RR(pdf, x, y, 28, 7, 3.5); A(pdf, 1);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.setTextColor(r,g,b);
  pdf.text(text, x + 14, y + 5, { align: "center" });
}

// ─────────────────────────────────────────────────────────────
//  MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export async function exportToPDF(
  _el, filename = "Dashboard_Produksi",
  chartData, totals, dateStr, BNI_COLORS_ARG, formatIDR_ARG
) {
  const COLORS = BNI_COLORS_ARG || BNI_COLORS;
  const fmt    = formatIDR_ARG  || formatIDR;
  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: [PW, PH] });

  const { totalPremium, totalFee, totalPolicy } = totals;
  const { monthly, product, fee, bas, lsr }     = chartData;

  const mL = Object.keys(monthly),  mV = Object.values(monthly);
  const pL = Object.keys(product),  pV = Object.values(product);
  const fL = Object.keys(fee),      fV = Object.values(fee);
  const bL = bas.map(b => b[0]),    bV = bas.map(b => b[1]);
  const lL = lsr.map(b => b[0]),    lV = lsr.map(b => b[1]);

  const PAGES = 3;

  // ══════════════════════════════════════════════════════════
  //  SLIDE 1 — Cover + KPI Summary
  // ══════════════════════════════════════════════════════════
  drawBg(pdf);

  // ── Left hero panel ──────────────────────────────────────
  const HERO_W = PW * 0.38;
  F(pdf, "#002060"); pdf.rect(0, 0, HERO_W, PH, "F");
  // Orange angled accent
  F(pdf, "#F37021"); pdf.triangle(HERO_W - 56, 0, HERO_W, 0, HERO_W, 68, "F");
  // Subtle radial glow
  F(pdf, "#1A3A7A"); A(pdf, 0.6); pdf.circle(HERO_W * 0.4, PH * 0.35, 55, "F"); A(pdf, 1);

  // Logo
  F(pdf, "#003F87"); RR(pdf, 14, 14, 26, 20, 4);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); T(pdf, "#FFFFFF");
  pdf.text("BNI", 27, 22.5, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6);
  pdf.text("LIFE", 27, 29.5, { align: "center" });

  // Title block
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); T(pdf, "#F37021");
  pdf.text("LAPORAN PRODUKSI 2025", 14, 62);

  S(pdf, "#F37021"); pdf.setLineWidth(0.6);
  pdf.line(14, 65, 55, 65);

  pdf.setFont("helvetica", "bold"); pdf.setFontSize(26); T(pdf, "#FFFFFF");
  pdf.text("Dashboard", 14, 84);
  pdf.text("Produksi", 14, 100);

  pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); T(pdf, "#8BAFD6");
  pdf.text("BNI Life Insurance", 14, 112);
  pdf.text("Internal Analytics Report", 14, 120);

  // Date pill
  F(pdf, "#F37021"); A(pdf, 0.2); RR(pdf, 14, 130, 55, 10, 5); A(pdf, 1);
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); T(pdf, "#F37021");
  pdf.text(`                              ${dateStr}`, 14, 136.5);

  // Confidential tag
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); T(pdf, "#E57373");
  pdf.text("⚠  INTERNAL — CONFIDENTIAL", 14, PH - 12);

  // ── Right KPI section ────────────────────────────────────
  const KX  = HERO_W + M + 2;
  const KW  = PW - KX - M;
  const KH  = 32;
  const KG  = 5;
  const KTot= KH * 3 + KG * 2;
  const KY0 = (PH - KTot) / 2 - 2;

  // Section heading
  pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); T(pdf, "#002060");
  pdf.text("Ringkasan Kinerja", KX, KY0 - 10);
  S(pdf, "#003F87"); pdf.setLineWidth(0.4); pdf.line(KX, KY0 - 7, KX + 58, KY0 - 7);
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(7); T(pdf, "#94A3B8");
  pdf.text("Overview produksi keseluruhan periode aktif", KX, KY0 - 2);

  [
    { label: "Total Premi",    value: fmt(totalPremium), accent: "#003F87" },
    { label: "Total Fee Based",value: fmt(totalFee),     accent: "#F37021" },
    { label: "Jumlah Polis",   value: String(totalPolicy),accent: "#00A99D" },
  ].forEach((k, i) => {
    drawKpi(pdf, KX, KY0 + i * (KH + KG), KW, KH, k.label, k.value, k.accent);
  });

  drawFooter(pdf, 1, PAGES);

  // ══════════════════════════════════════════════════════════
  //  SLIDE 2 — Premium & Fee Charts
  // ══════════════════════════════════════════════════════════
  pdf.addPage();
  drawBg(pdf);
  drawHeader(pdf, "Analisis Premium & Fee Based", "Tren bulanan dan komposisi produk — 2025", dateStr);

  // Content area
  const CY  = 26;             // top of content (below header)
  const CB  = PH - 10;        // bottom (above footer)
  const CH  = CB - CY;        // total content height

  // Layout: top row = 60% bar | 40% donut ; bottom row = full-width fee bar
  const ROW1H = CH * 0.53;
  const ROW2H = CH * 0.42;
  const ROWG  = CH * 0.05;

  const BAR_W  = (PW - M * 2) * 0.59;
  const DNT_W  = (PW - M * 2) * 0.38;
  const DNT_X  = M + BAR_W + (PW - M * 2) * 0.03;

  // Panel 1 — Monthly Premium bar
  drawPanel(pdf, M, CY, BAR_W, ROW1H, "Premi Bulanan", "Tren premi per bulan tahun 2025", "#003F87");
  drawChip(pdf, M + BAR_W - 32, CY + 7, "PREMIUM", "#003F87");
  drawBar(pdf, M + 11, CY + 24, BAR_W - 18, ROW1H - 31, mL, mV, "#003F87", fmt);

  // Panel 2 — Product donut
  drawPanel(pdf, DNT_X, CY, DNT_W, ROW1H, "Komposisi Produk", "Distribusi per jenis produk", "#F37021");
  drawChip(pdf, DNT_X + DNT_W - 32, CY + 7, "PRODUK", "#F37021");
  const dcx = DNT_X + DNT_W / 2;
  const dcy = CY + ROW1H * 0.4;
  const dOR = Math.min(DNT_W, ROW1H) * 0.22;
  const dIR = dOR * 0.46;
  drawDonut(pdf, dcx, dcy, dOR, dIR, pV, COLORS, pL, fmt);

  // Panel 3 — Fee Based bar (full width)
  const FY2 = CY + ROW1H + ROWG;
  drawPanel(pdf, M, FY2, PW - M * 2, ROW2H, "Fee Based Bulanan", "Tren fee based per bulan tahun 2025", "#00A99D");
  drawChip(pdf, PW - M - 34, FY2 + 7, "FEE BASED", "#00A99D");
  drawBar(pdf, M + 11, FY2 + 24, PW - M * 2 - 18, ROW2H - 31, fL, fV, "#00A99D", fmt);

  drawFooter(pdf, 2, PAGES);

  // ══════════════════════════════════════════════════════════
  //  SLIDE 3 — Rankings
  // ══════════════════════════════════════════════════════════
  pdf.addPage();
  drawBg(pdf);
  drawHeader(pdf, "Ranking Produksi", "Top 5 BAS & Top 5 Kontribusi LG — 2025", dateStr);

  const RY   = 26;
  const RB   = PH - 10;
  const RH   = RB - RY;
  const HALF = (PW - M * 2 - 8) / 2;

  // Panel — Top 5 BAS
  drawPanel(pdf, M, RY, HALF, RH, "Top 5 BAS", "BAS dengan total premi tertinggi", "#F37021");
  drawChip(pdf, M + HALF - 32, RY + 7, "RANKING", "#F37021");
  drawHBar(pdf, M + 8, RY + 26, HALF - 14, RH - 32, bL, bV, "#F37021", fmt);

  // Panel — Top 5 LG
  const RX2 = M + HALF + 8;
  drawPanel(pdf, RX2, RY, HALF, RH, "Top 5 Kontribusi LG", "LSR dengan total premi tertinggi", "#00A99D");
  drawChip(pdf, RX2 + HALF - 32, RY + 7, "RANKING", "#00A99D");
  drawHBar(pdf, RX2 + 8, RY + 26, HALF - 14, RH - 32, lL, lV, "#00A99D", fmt);

  drawFooter(pdf, 3, PAGES);

  pdf.save(`${filename}.pdf`);
}