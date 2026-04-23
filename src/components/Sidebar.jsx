import { LayoutDashboard, FilePen, FileSpreadsheet, X, Star } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard",       icon: LayoutDashboard },
  { id: "sawrangking", label: "SAW Ranking",      icon: Star },
  { id: "crud",        label: "Input / Edit Data", icon: FilePen },
];

export default function Sidebar({ page, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* ── Mobile Overlay ── */}
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "block" : "hidden",
          "lg:hidden",
        ].join(" ")}
      />

      {/* ── Sidebar ── */}
      <aside
        className={[
          // Base
          "fixed left-0 top-0 h-screen w-64 z-40 flex flex-col px-4 py-6 overflow-y-auto overflow-x-hidden",
          // Background gradient (navy dark → navy)
          "bg-gradient-to-b from-[#002960] to-[#003F87]",
          // Shadow
          "shadow-[4px_0_24px_rgba(0,41,96,0.18)]",
          // Slide animation
          "transition-transform duration-300 ease-in-out will-change-transform",
          // Desktop: always visible; Mobile: slide in/out
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        ].join(" ")}
      >
        {/* ── Close Button (mobile only) ── */}
        <button
          onClick={onClose}
          aria-label="Tutup sidebar"
          className="lg:hidden absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white border-none cursor-pointer transition-colors duration-200 hover:bg-white/20"
        >
          <X size={16} />
        </button>

        {/* ── Logo ── */}
        <div className="flex items-center gap-3 px-1 mb-8 mt-1">
          <div className="w-[42px] h-[42px] rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <img
              src="logo.png"
              alt="Logo"
              className="w-[22px] h-[22px] object-contain"
            />
          </div>
          <div>
            <div className="text-white font-extrabold text-[15px] leading-tight">BNI Life</div>
            <div className="text-white/50 text-[11px] mt-0.5">Insurance</div>
          </div>
        </div>

        {/* ── Section Label ── */}
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 px-3 mb-1.5">
          Menu Utama
        </p>

        {/* ── Nav Items ── */}
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNavigate(id); onClose(); }}
              className={[
                "flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium border-none cursor-pointer transition-all duration-200",
                page === id
                  ? "bg-[#F37021] text-white font-semibold shadow-[0_4px_14px_rgba(243,112,33,0.35)]"
                  : "bg-transparent text-white/70 hover:bg-white/10 hover:text-white/95",
              ].join(" ")}
            >
              <Icon size={17} className="shrink-0" />
              {label}
            </button>
          ))}

          {/* ── External Link ── */}
          <a
            href="https://docs.google.com/spreadsheets/d/1MPb4aMPFwzZM_xheqP_Gzrxf8Gn-eMxa-NOyqRekJgQ/edit?usp=sharing"
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex items-center gap-2.5 w-full text-left px-3 py-2.5 rounded-xl text-[14px] font-medium no-underline bg-transparent text-white/70 hover:bg-white/10 hover:text-white/95 transition-all duration-200"
          >
            <FileSpreadsheet size={17} className="shrink-0" />
            Data Excel
          </a>
        </nav>

        {/* ── Bottom Version Card ── */}
        <div className="mt-auto pt-6">
          <div className="rounded-xl px-3.5 py-3 bg-white/[0.07] border border-white/10">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/40 mb-1">
              Versi
            </p>
            <p className="text-[12px] font-semibold text-white/70">
              Dashboard Produksi 2025
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}