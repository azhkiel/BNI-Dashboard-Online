// components/Sidebar.jsx
import {
  LayoutDashboard, Star, FilePen, FileSpreadsheet, X, ChevronLeft,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",        icon: LayoutDashboard },
  { id: "sawrangking", label: "SAW Ranking",       icon: Star },
  { id: "crud",        label: "Input / Edit Data", icon: FilePen },
];

function NavItem({ item, active, collapsed, onClick }) {
  const { label, icon: Icon } = item;
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={[
        "relative flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium border-none cursor-pointer transition-all duration-200 group overflow-hidden",
        active
          ? "bg-[#F37021] text-white font-semibold shadow-[0_4px_14px_rgba(243,112,33,0.35)]"
          : "bg-transparent text-white/70 hover:bg-white/10 hover:text-white/95",
      ].join(" ")}
    >
      <Icon size={17} className="shrink-0" />
      <span className={[
        "whitespace-nowrap overflow-hidden transition-all duration-[280ms]",
        collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
      ].join(" ")}>
        {label}
      </span>
      {active && !collapsed && (
        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white/80 shrink-0" />
      )}
      {collapsed && (
        <span className="
          pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2
          bg-[#002960] text-white text-xs font-semibold px-3 py-1.5 rounded-lg
          whitespace-nowrap shadow-lg
          opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
          transition-all duration-150 z-50
        ">
          {label}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({ page, onNavigate, isOpen, onClose, collapsed, onCollapse }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        ].join(" ")}
      />

      <aside className={[
        "fixed left-0 top-0 h-screen z-40 flex flex-col overflow-hidden",
        "bg-gradient-to-b from-[#002960] to-[#003F87]",
        "shadow-[4px_0_24px_rgba(0,41,96,0.18)]",
        "transition-[width,transform] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "lg:w-[64px]" : "lg:w-64",
        "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      ].join(" ")}>

        {/* Mobile close — X pojok kanan atas, hanya di mobile */}
        <button
          onClick={onClose}
          aria-label="Tutup sidebar"
          className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center
            rounded-lg bg-white/10 text-white border-none cursor-pointer hover:bg-white/20 transition-colors z-10"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden px-3 py-5 w-64 min-w-[256px]">

          {/* Logo area — di desktop: baris logo + tombol collapse sejajar */}
          <div className="flex items-center gap-2 px-1 mb-7 mt-1">

            {/* Logo — klik untuk toggle collapse di desktop */}
            <div
              onClick={() => onCollapse(prev => !prev)}
              className="hidden lg:flex w-[38px] h-[38px] rounded-xl bg-white/15 items-center justify-center shrink-0 cursor-pointer hover:bg-white/25 transition-colors duration-200"
              title={collapsed ? "Buka sidebar" : "Ciutkan sidebar"}
            >
              <img src="logo.png" alt="Logo" className="w-5 h-5 object-contain" />
            </div>

            {/* Logo versi mobile — tidak bisa toggle collapse */}
            <div className="lg:hidden w-[38px] h-[38px] rounded-xl bg-white/15 flex items-center justify-center shrink-0">
              <img src="logo.png" alt="Logo" className="w-5 h-5 object-contain" />
            </div>

            {/* Teks + tombol X collapse — hanya di desktop, tersembunyi saat collapsed */}
            <div className={[
              "flex items-center justify-between flex-1 overflow-hidden transition-all duration-[280ms]",
              collapsed ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
            ].join(" ")}>
              <div className="whitespace-nowrap">
                <div className="text-white font-extrabold text-[15px] leading-tight">BNI Life</div>
                <div className="text-white/50 text-[11px] mt-0.5">Insurance</div>
              </div>

              {/* ✅ Tombol X collapse — desktop only, di dalam baris header, rapi sejajar */}
              <button
                onClick={() => onCollapse(prev => !prev)}
                aria-label="Ciutkan sidebar"
                className="hidden lg:flex ml-2 w-7 h-7 shrink-0 items-center justify-center
                  rounded-lg bg-white/10 text-white/60 border-none cursor-pointer
                  hover:bg-white/20 hover:text-white transition-all duration-200"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>

          {/* Section label */}
          <p className={[
            "text-[9px] font-bold uppercase tracking-[0.12em] text-white/40 px-3 mb-1.5 whitespace-nowrap transition-all duration-[280ms] overflow-hidden",
            collapsed ? "opacity-0 max-w-0" : "opacity-100 max-w-full",
          ].join(" ")}>
            Menu Utama
          </p>

          {/* Nav */}
          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={page === item.id}
                collapsed={collapsed}
                onClick={() => { onNavigate(item.id); onClose(); }}
              />
            ))}

            <a
              href="https://docs.google.com/spreadsheets/d/1MPb4aMPFwzZM_xheqP_Gzrxf8Gn-eMxa-NOyqRekJgQ/edit?usp=sharing"
              target="_blank"
              rel="noreferrer"
              onClick={onClose}
              title={collapsed ? "Data Excel" : undefined}
              className="relative flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium no-underline bg-transparent text-white/70 hover:bg-white/10 hover:text-white/95 transition-all duration-200 group overflow-hidden"
            >
              <FileSpreadsheet size={17} className="shrink-0" />
              <span className={[
                "whitespace-nowrap overflow-hidden transition-all duration-[280ms]",
                collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
              ].join(" ")}>
                Data Excel
              </span>
              {collapsed && (
                <span className="
                  pointer-events-none absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2
                  bg-[#002960] text-white text-xs font-semibold px-3 py-1.5 rounded-lg
                  whitespace-nowrap shadow-lg
                  opacity-0 group-hover:opacity-100 translate-x-1 group-hover:translate-x-0
                  transition-all duration-150 z-50
                ">
                  Data Excel
                </span>
              )}
            </a>
          </nav>

          {/* Version card */}
          <div className={[
            "mt-auto pt-5 transition-all duration-[280ms]",
            collapsed ? "opacity-0 pointer-events-none" : "opacity-100",
          ].join(" ")}>
            <div className="rounded-xl px-3.5 py-3 bg-white/[0.07] border border-white/10">
              <p className="text-[9px] font-bold uppercase tracking-[0.1em] text-white/40 mb-1">Versi</p>
              <p className="text-[12px] font-semibold text-white/70">Dashboard Produksi 2025</p>
            </div>
          </div>

        </div>
      </aside>
    </>
  );
}