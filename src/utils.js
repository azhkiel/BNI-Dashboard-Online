export const BNI_COLORS = [
  "#003F87", "#F37021", "#00A99D", "#6C5CE7", "#E17055",
  "#0984E3", "#FDCB6E", "#00B894", "#D63031", "#A29BFE",
];

export function formatIDR(n) {
  const num = Number(n || 0);
  if (num >= 1e9) return "Rp " + (num / 1e9).toFixed(2) + " M";
  if (num >= 1e6) return "Rp " + (num / 1e6).toFixed(2) + " Jt";
  return new Intl.NumberFormat("id-ID", {
    style: "currency", currency: "IDR", maximumFractionDigits: 0,
  }).format(num);
}

export function groupSum(arr, key, sumKey) {
  const map = {};
  arr.forEach((r) => {
    const k = r[key] || "Lainnya";
    map[k] = (map[k] || 0) + Number(r[sumKey] || 0);
  });
  return map;
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
//  16:9 PAGE SIZE
//  jsPDF custom format array = [width, height] in the unit given
//  For landscape we just pass width > height directly.
// ─────────────────────────────────────────────────────────────
const PW  = 297;      // mm — same width as A4 landscape
const PH  = 167.0625; // mm — 297 * (9/16) = true 16:9
const M   = 8;        // margin

// ─────────────────────────────────────────────────────────────
//  TINY HELPERS
// ─────────────────────────────────────────────────────────────
function rgb(h) {
  const s = h.replace("#","");
  return [parseInt(s.slice(0,2),16), parseInt(s.slice(2,4),16), parseInt(s.slice(4,6),16)];
}
function F(pdf,c){ const[r,g,b]=rgb(c); pdf.setFillColor(r,g,b); }
function S(pdf,c){ const[r,g,b]=rgb(c); pdf.setDrawColor(r,g,b); }
function RR(pdf,x,y,w,h,r,m="F"){ pdf.roundedRect(x,y,w,h,r,r,m); }
function A(pdf,a){ pdf.setGState(pdf.GState({opacity:a})); }
function T(pdf,c){ const[r,g,b]=rgb(c); pdf.setTextColor(r,g,b); }

// ─────────────────────────────────────────────────────────────
//  BACKGROUND
// ─────────────────────────────────────────────────────────────
function drawBg(pdf) {
  F(pdf,"#EEF3FA"); pdf.rect(0,0,PW,PH,"F");
  F(pdf,"#002960"); A(pdf,0.06); pdf.circle(-14,-14,52,"F"); A(pdf,1);
  F(pdf,"#F37021"); A(pdf,0.06); pdf.circle(PW+14,PH+14,60,"F"); A(pdf,1);
  F(pdf,"#003F87"); A(pdf,0.028);
  for(let ry=0;ry<=PH;ry+=9) for(let cx=0;cx<=PW;cx+=9) pdf.circle(cx,ry,0.55,"F");
  A(pdf,1);
}

// ─────────────────────────────────────────────────────────────
//  HEADER (slides 2+)
// ─────────────────────────────────────────────────────────────
function drawHeader(pdf, title, sub, date) {
  const HH = 24;
  F(pdf,"#002960"); RR(pdf,M,M,PW-M*2,HH,4);
  F(pdf,"#F37021"); pdf.roundedRect(M,M,5.5,HH,2.5,2.5,"F");
  F(pdf,"#003F87"); RR(pdf,M+9,M+3,19,18,3);
  pdf.setFont("helvetica","bold"); pdf.setFontSize(8); T(pdf,"#FFFFFF");
  pdf.text("BNI",M+18.5,M+11,{align:"center"});
  pdf.setFont("helvetica","normal"); pdf.setFontSize(5.5);
  pdf.text("LIFE",M+18.5,M+16.5,{align:"center"});
  pdf.setFont("helvetica","bold"); pdf.setFontSize(14); T(pdf,"#FFFFFF");
  pdf.text(title, M+33, M+13);
  pdf.setFont("helvetica","normal"); pdf.setFontSize(7.5); T(pdf,"#B0D2F5");
  pdf.text(sub, M+33, M+21);
  pdf.setFontSize(6.5); T(pdf,"#90B8DC");
  pdf.text("Dicetak pada", PW-M, M+10, {align:"right"});
  pdf.setFont("helvetica","bold"); pdf.setFontSize(8); T(pdf,"#FFFFFF");
  pdf.text(date, PW-M, M+20, {align:"right"});
}

// ─────────────────────────────────────────────────────────────
//  FOOTER
// ─────────────────────────────────────────────────────────────
function drawFooter(pdf, pg, tot) {
  const fy = PH-6.5;
  S(pdf,"#002960"); A(pdf,0.15); pdf.setLineWidth(0.25); pdf.line(M,fy,PW-M,fy); A(pdf,1);
  pdf.setFont("helvetica","normal"); pdf.setFontSize(6.5); T(pdf,"#8898B8");
  pdf.text("© 2025 BNI Life Insurance — Dashboard Produksi Internal  |  CONFIDENTIAL", M+2, PH-3);
  pdf.setFont("helvetica","bold"); T(pdf,"#003F87");
  pdf.text(`${pg} / ${tot}`, PW-M, PH-3, {align:"right"});
}

// ─────────────────────────────────────────────────────────────
//  WHITE PANEL
// ─────────────────────────────────────────────────────────────
function drawPanel(pdf, x, y, w, h, title, sub, badge, accent="#003F87") {
  F(pdf,"#FFFFFF"); RR(pdf,x,y,w,h,4);
  S(pdf,"#D5E5F5"); pdf.setLineWidth(0.18); RR(pdf,x,y,w,h,4,"S");
  const[r,g,b]=rgb(accent);
  pdf.setFillColor(r,g,b); pdf.roundedRect(x,y,w,3.5,2,2,"F");
  if(badge){
    A(pdf,0.12); pdf.setFillColor(r,g,b); RR(pdf,x+w-32,y+7,26,9,2.5); A(pdf,1);
    pdf.setFontSize(7); pdf.setFont("helvetica","bold"); pdf.setTextColor(r,g,b);
    pdf.text(badge, x+w-19, y+13.5, {align:"center"});
  }
  pdf.setFont("helvetica","bold"); pdf.setFontSize(11); T(pdf,"#002960");
  pdf.text(title, x+7, y+13.5);
  if(sub){ pdf.setFont("helvetica","normal"); pdf.setFontSize(7); T(pdf,"#94A3B8");
    pdf.text(sub, x+7, y+20); }
}

// ─────────────────────────────────────────────────────────────
//  KPI CARD
// ─────────────────────────────────────────────────────────────
function drawKpi(pdf, x, y, w, h, label, value, pct, accent) {
  F(pdf,"#FFFFFF"); RR(pdf,x,y,w,h,4);
  S(pdf,"#D5E5F5"); pdf.setLineWidth(0.18); RR(pdf,x,y,w,h,4,"S");
  const[r,g,b]=rgb(accent);
  pdf.setFillColor(r,g,b); pdf.roundedRect(x,y,4.5,h,2,2,"F");
  A(pdf,0.09); pdf.setFillColor(r,g,b); pdf.circle(x+w-15,y+h/2,13,"F"); A(pdf,1);

  // label
  pdf.setFont("helvetica","bold"); pdf.setFontSize(7.5); T(pdf,"#94A3B8");
  pdf.text(label.toUpperCase(), x+11, y+12);

  // value — sits in middle of card
  const vs = String(value);
  const fs = vs.length>15?11 : vs.length>11?14 : 18;
  pdf.setFontSize(fs); pdf.setFont("helvetica","bold"); T(pdf,"#002960");
  pdf.text(vs, x+11, y + h*0.52 + fs*0.18);

  // green badge — fixed width, centred text
  const BW=56, BH=11;
  const BY = y + h - BH - 5;
  F(pdf,"#16A34A"); RR(pdf,x+11,BY,BW,BH,3);
  pdf.setFontSize(7.5); pdf.setFont("helvetica","bold"); T(pdf,"#FFFFFF");
  pdf.text(`▲ ${pct} vs bln lalu`, x+11+BW/2, BY+BH*0.68, {align:"center"});
}

// ─────────────────────────────────────────────────────────────
//  VERTICAL BAR CHART
// ─────────────────────────────────────────────────────────────
function drawBar(pdf, x, y, w, h, labels, values, color, fmt) {
  if(!values||!values.length) return;
  const max=Math.max(...values,1), n=values.length;
  const bw=Math.min((w/n)*0.58,18);
  const gap=(w-bw*n)/(n+1);
  const[r,g,b]=rgb(color);

  S(pdf,"#C8D8EC"); pdf.setLineWidth(0.12);
  for(let i=1;i<=4;i++){
    const gy=y+h-(i/4)*h;
    pdf.line(x,gy,x+w,gy);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(5.5); T(pdf,"#AAC0DC");
    pdf.text(fmt?fmt((i/4)*max):((i/4)*max).toFixed(0), x-1,gy+1.5,{align:"right"});
  }
  S(pdf,"#B0CCEA"); pdf.line(x,y+h,x+w,y+h);

  values.forEach((val,i)=>{
    const bh=(val/max)*h, bx=x+gap+i*(bw+gap), by=y+h-bh;
    pdf.setFillColor(r,g,b); pdf.roundedRect(bx,by,bw,bh,2,2,"F");
    A(pdf,0.2); F(pdf,"#FFFFFF"); pdf.roundedRect(bx,by,bw,bh*0.3,2,2,"F"); A(pdf,1);
    if(bh>8){
      pdf.setFont("helvetica","bold"); pdf.setFontSize(5.5); pdf.setTextColor(r,g,b);
      pdf.text(fmt?fmt(val):String(val), bx+bw/2, by-2,{align:"center"});
    }
    pdf.setFont("helvetica","normal"); pdf.setFontSize(5.5); T(pdf,"#7A90B5");
    pdf.text(String(labels[i]||"").slice(0,7), bx+bw/2, y+h+6,{align:"center"});
  });
}

// ─────────────────────────────────────────────────────────────
//  HORIZONTAL BAR CHART
// ─────────────────────────────────────────────────────────────
function drawHBar(pdf, x, y, w, h, labels, values, color, fmt) {
  if(!values||!values.length) return;
  const max=Math.max(...values,1), n=values.length;
  const rowH=h/n, lblW=60, barMax=w-lblW-24;
  const[r,g,b]=rgb(color);

  values.forEach((val,i)=>{
    const bw=Math.max((val/max)*barMax,0);
    const ry=y+i*rowH, bh=rowH*0.46, boff=rowH*0.27;

    // rank pill
    A(pdf,0.13); pdf.setFillColor(r,g,b); RR(pdf,x,ry+boff,13,bh,2.5); A(pdf,1);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(7.5); pdf.setTextColor(r,g,b);
    pdf.text(`#${i+1}`, x+6.5, ry+boff+bh*0.65,{align:"center"});

    // label
    pdf.setFont("helvetica","normal"); pdf.setFontSize(7); T(pdf,"#142D5A");
    pdf.text(String(labels[i]||"").slice(0,26), x+16, ry+boff+bh*0.65);

    // track + bar
    F(pdf,"#D8E6F5"); RR(pdf,x+lblW,ry+boff,barMax,bh,2);
    pdf.setFillColor(r,g,b); RR(pdf,x+lblW,ry+boff,bw,bh,2);
    A(pdf,0.2); F(pdf,"#FFFFFF"); RR(pdf,x+lblW,ry+boff,bw,bh*0.36,2); A(pdf,1);

    // value
    pdf.setFont("helvetica","bold"); pdf.setFontSize(7.5); pdf.setTextColor(r,g,b);
    pdf.text(fmt?fmt(val):String(val), x+lblW+barMax+3, ry+boff+bh*0.65);
  });
}

// ─────────────────────────────────────────────────────────────
//  DONUT CHART
// ─────────────────────────────────────────────────────────────
function drawDonut(pdf, cx, cy, OR, IR, values, colors, labels, fmt) {
  if(!values||!values.length) return;
  const total=values.reduce((a,b)=>a+b,0); if(!total) return;
  const STEPS=80; let sa=-Math.PI/2;

  values.forEach((val,i)=>{
    const sl=(val/total)*Math.PI*2;
    const[r,g,b]=rgb(colors[i%colors.length]);
    const pts=[];
    for(let s=0;s<=STEPS;s++){const a=sa+(sl/STEPS)*s; pts.push([cx+Math.cos(a)*OR,cy+Math.sin(a)*OR]);}
    for(let s=STEPS;s>=0;s--){const a=sa+(sl/STEPS)*s; pts.push([cx+Math.cos(a)*IR,cy+Math.sin(a)*IR]);}
    pdf.setFillColor(r,g,b); pdf.setDrawColor(255,255,255); pdf.setLineWidth(0.8);
    pdf.lines(pts.slice(1).map((p,idx)=>[p[0]-pts[idx][0],p[1]-pts[idx][1]]),pts[0][0],pts[0][1],[1,1],"FD",true);
    if(val/total>0.05){
      const ma=sa+sl/2, lr=(OR+IR)/2;
      pdf.setFont("helvetica","bold"); pdf.setFontSize(7); T(pdf,"#FFFFFF");
      pdf.text(((val/total)*100).toFixed(1)+"%", cx+Math.cos(ma)*lr, cy+Math.sin(ma)*lr+2,{align:"center"});
    }
    sa+=sl;
  });

  F(pdf,"#FFFFFF"); pdf.circle(cx,cy,IR-0.4,"F");
  pdf.setFont("helvetica","bold"); pdf.setFontSize(8); T(pdf,"#002960");
  pdf.text("Total",cx,cy-2,{align:"center"});
  pdf.setFont("helvetica","normal"); pdf.setFontSize(7); T(pdf,"#6A82A8");
  pdf.text(fmt?fmt(total):String(total),cx,cy+6.5,{align:"center"});

  // legend 2-col
  const legY=cy+OR+7, legX=cx-OR;
  values.forEach((v,i)=>{
    const col=i%2, row=Math.floor(i/2);
    const lx=legX+col*OR, ly=legY+row*9;
    const[r,g,b]=rgb(colors[i%colors.length]);
    pdf.setFillColor(r,g,b); RR(pdf,lx,ly,6.5,5,1.5);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(6.5); T(pdf,"#142D5A");
    pdf.text(String(labels[i]||"").slice(0,18), lx+9, ly+4.5);
  });
}

// ─────────────────────────────────────────────────────────────
//  MAIN exportToPDF
// ─────────────────────────────────────────────────────────────
export async function exportToPDF(
  _el, filename="Dashboard_Produksi",
  chartData, totals, dateStr, BNI_COLORS_ARG, formatIDR_ARG
) {
  const COLORS = BNI_COLORS_ARG || BNI_COLORS;
  const fmt    = formatIDR_ARG  || formatIDR;
  const { default: jsPDF } = await import("jspdf");

  // ── KEY FIX: jsPDF custom format must be [width, height] ──
  // orientation:"l" with format array = jsPDF uses the array as-is
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: [PW, PH],   // 297 x 167.06 mm  → true 16:9
  });

  const { totalPremium, totalFee, totalPolicy } = totals;
  const { monthly, product, fee, bas, lsr }     = chartData;
  const mL=Object.keys(monthly),  mV=Object.values(monthly);
  const pL=Object.keys(product),  pV=Object.values(product);
  const fL=Object.keys(fee),      fV=Object.values(fee);
  const bL=bas.map(b=>b[0]),      bV=bas.map(b=>b[1]);
  const lL=lsr.map(b=>b[0]),      lV=lsr.map(b=>b[1]);

  const PAGES=3;

  // ══════════════════════════════════════════════
  //  SLIDE 1 — Cover + KPI
  // ══════════════════════════════════════════════
  drawBg(pdf);

  const SPLIT = PW*0.41;

  // navy left panel
  F(pdf,"#002960"); pdf.rect(0,0,SPLIT,PH,"F");
  // orange diagonal
  F(pdf,"#F37021"); pdf.triangle(SPLIT-50,0,SPLIT,0,SPLIT,52,"F");

  // BNI logo
  F(pdf,"#003F87"); RR(pdf,18,18,44,44,8);
  pdf.setFont("helvetica","bold"); pdf.setFontSize(18); T(pdf,"#FFFFFF");
  pdf.text("BNI",40,38,{align:"center"});
  pdf.setFont("helvetica","normal"); pdf.setFontSize(10);
  pdf.text("LIFE",40,48,{align:"center"});

  // title
  pdf.setFont("helvetica","bold"); pdf.setFontSize(28); T(pdf,"#FFFFFF");
  pdf.text("Dashboard",18,82);
  pdf.text("Produksi",18,100);

  // tagline
  pdf.setFontSize(10); pdf.setFont("helvetica","normal"); T(pdf,"#F37021");
  pdf.text("BNI Life Insurance — Laporan 2025",18,111);

  // divider
  S(pdf,"#FFFFFF"); A(pdf,0.18); pdf.setLineWidth(0.45);
  pdf.line(18,117,SPLIT-12,117); A(pdf,1);

  // date + confidential
  pdf.setFontSize(8.5); T(pdf,"#AAD0F0"); pdf.setFont("helvetica","normal");
  pdf.text(`Dicetak: ${dateStr}`,18,126);
  A(pdf,0.72); pdf.setFontSize(7.5); T(pdf,"#F37021");
  pdf.text("INTERNAL — CONFIDENTIAL",18,134); A(pdf,1);

  // dots
  [0,1,2].forEach(n=>{
    A(pdf,n===0?1:0.28);
    pdf.setFillColor(n===0?243:210, n===0?112:220, n===0?33:230);
    pdf.circle(20+n*12,PH-13,3.5,"F"); A(pdf,1);
  });

  // KPI right side
  const CX=SPLIT+12, CW=PW-CX-M;
  // vertical centre the 3 cards
  const KH=40, KG=6, KTot=KH*3+KG*2;
  const KY0=(PH-KTot)/2 - 4;

  pdf.setFont("helvetica","bold"); pdf.setFontSize(12); T(pdf,"#002960");
  pdf.text("Ringkasan Kinerja",CX,KY0-9);
  pdf.setFont("helvetica","normal"); pdf.setFontSize(8); T(pdf,"#94A3B8");
  pdf.text("Overview produksi keseluruhan",CX,KY0-3);

  [
    {label:"Total Premium",   value:fmt(totalPremium), pct:"12.4%", color:"#003F87"},
    {label:"Total Fee Based", value:fmt(totalFee),     pct:"8.1%",  color:"#F37021"},
    {label:"Jumlah Polis",    value:String(totalPolicy),pct:"5.7%", color:"#00A99D"},
  ].forEach((k,i)=>{
    drawKpi(pdf, CX, KY0+i*(KH+KG), CW, KH, k.label, k.value, k.pct, k.color);
  });

  drawFooter(pdf,1,PAGES);

  // ══════════════════════════════════════════════
  //  SLIDE 2 — Charts
  // ══════════════════════════════════════════════
  pdf.addPage();
  drawBg(pdf);
  drawHeader(pdf,"Analisis Premium","Tren Premi & Komposisi Produk — 2025",dateStr);

  const S2y  = M+24+5;          // content start Y
  const S2b  = PH-10;           // content end Y
  const S2H  = S2b - S2y;       // total content height
  const R1H  = S2H*0.52;
  const R2H  = S2H*0.44;
  const Rg   = S2H*0.04;

  // top-left bar chart
  const PNW  = PW*0.57-M-4;
  drawPanel(pdf,M,S2y,PNW,R1H,"Premium per Bulan","Tren premi bulanan 2025","2025","#003F87");
  drawBar(pdf, M+11, S2y+25, PNW-18, R1H-32, mL, mV, "#003F87", fmt);

  // top-right donut
  const DX=M+PNW+5, DW=PW-DX-M;
  drawPanel(pdf,DX,S2y,DW,R1H,"Komposisi Produk","Distribusi per jenis produk","Produk","#F37021");
  const dcx=DX+DW/2, dcy=S2y+R1H*0.38;
  const dOR=Math.min(DW,R1H)*0.25, dIR=dOR*0.47;
  drawDonut(pdf,dcx,dcy,dOR,dIR,pV,COLORS,pL,fmt);

  // bottom fee chart
  const FY=S2y+R1H+Rg;
  drawPanel(pdf,M,FY,PW-M*2,R2H,"Fee Based per Bulan","Tren fee based bulanan 2025","Fee","#00A99D");
  drawBar(pdf,M+11,FY+25,PW-M*2-18,R2H-32,fL,fV,"#00A99D",fmt);

  drawFooter(pdf,2,PAGES);

  // ══════════════════════════════════════════════
  //  SLIDE 3 — Rankings
  // ══════════════════════════════════════════════
  pdf.addPage();
  drawBg(pdf);
  drawHeader(pdf,"Ranking Produksi","Top 5 BAS & Top 5 Kontribusi LG — 2025",dateStr);

  const RY=M+24+5, RH=PH-RY-10, RHW=(PW-M*2-7)/2;

  drawPanel(pdf,M,RY,RHW,RH,"Top 5 BAS","BAS dengan premi tertinggi","Ranking","#F37021");
  drawHBar(pdf,M+9,RY+26,RHW-14,RH-30,bL,bV,"#F37021",fmt);

  const RX2=M+RHW+7;
  drawPanel(pdf,RX2,RY,RHW,RH,"Top 5 Kontribusi LG","LSR dengan premi tertinggi","Ranking","#00A99D");
  drawHBar(pdf,RX2+9,RY+26,RHW-14,RH-30,lL,lV,"#00A99D",fmt);

  drawFooter(pdf,3,PAGES);

  pdf.save(`${filename}.pdf`);
}