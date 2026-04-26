import { CalendarDays, Menu, Plus, ArrowLeft, LayoutDashboard, FilePen, Star } from "lucide-react";

const PAGE_META = {
  dashboard:   { title: "Dashboard Produksi",    sub: "Data real-time per hari ini" },
  sawrangking: { title: "SAW Ranking",           sub: "Peringkat kinerja BAS berdasarkan SAW" },
  tellerdashboard: { title: "Data Teller",       sub: "Data Teller real-time per hari ini" },
  crud:        { title: "Input & Kelola Data",   sub: "Tambah, edit, atau hapus data produksi" },
};

export default function Topbar({ page, onNavigate, onOpenSidebar }) {
  const dateStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  const meta = PAGE_META[page] ?? PAGE_META.dashboard;

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-8 h-16 bg-white border-b border-[rgba(0,63,135,0.08)] shadow-[0_2px_12px_rgba(0,63,135,0.05)] flex-shrink-0">

      {/* ── Left: hamburger + page title ── */}
      <div className="flex items-center gap-3">

        {/* Hamburger — only visible on tablet/mobile (lg:hidden) */}
        <button
          onClick={onOpenSidebar}
          aria-label="Buka menu"
          className="lg:hidden flex flex-col justify-center items-center w-10 h-10 gap-[5px] rounded-xl bg-[#EEF4FF] border-none cursor-pointer transition-colors duration-200 hover:bg-[#d8e6ff] shrink-0"
        >
          <Menu size={18} className="text-[#003F87]" />
        </button>

        <div>
          <h1 className="text-[18px] font-extrabold text-[#002960] leading-tight">
            {meta.title}
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">{meta.sub}</p>
        </div>
      </div>

      {/* ── Right: date chip + action button ── */}
      <div className="flex items-center gap-3">

        {/* Date — hidden on small screens */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 whitespace-nowrap">
          <CalendarDays size={13} className="text-slate-300" />
          {dateStr}
        </div>

        {/* Action button */}
        {page === "dashboard" ? (
          <button
            onClick={() => onNavigate("crud")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white
              bg-gradient-to-br from-[#F37021] to-[#e05c10]
              shadow-[0_4px_14px_rgba(243,112,33,0.3)]
              border-none cursor-pointer
              transition-all duration-200
              hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(243,112,33,0.4)]"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Tambah Data</span>
          </button>
        ) : (
          <button
            onClick={() => onNavigate("dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white
              bg-gradient-to-br from-[#003F87] to-[#002960]
              shadow-[0_4px_14px_rgba(0,63,135,0.25)]
              border-none cursor-pointer
              transition-all duration-200
              hover:-translate-y-px hover:shadow-[0_6px_20px_rgba(0,63,135,0.35)]"
          >
            <ArrowLeft size={15} />
            <span className="hidden sm:inline">Kembali ke Dashboard</span>
          </button>
        )}
      </div>
    </header>
  );
}