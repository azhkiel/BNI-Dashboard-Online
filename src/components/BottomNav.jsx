import { LayoutDashboard, FilePen, Star } from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard",   label: "Dashboard", icon: LayoutDashboard },
  { id: "sawrangking", label: "Ranking",   icon: Star },
  { id: "crud",        label: "Input Data", icon: FilePen },
];

export default function BottomNav({ page, onNavigate }) {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[35] flex bg-white border-t border-[rgba(0,63,135,0.1)] shadow-[0_-4px_20px_rgba(0,63,135,0.1)]">
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = page === id;
        return (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={[
              "relative flex-1 flex flex-col items-center justify-center gap-[3px]",
              "pt-2.5 pb-2 border-none bg-transparent cursor-pointer",
              "text-[10px] font-semibold font-[inherit] transition-colors duration-200",
              active ? "text-[#F37021]" : "text-slate-400",
            ].join(" ")}
          >
            {/* Active indicator bar at top */}
            {active && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#F37021] rounded-b-[4px]" />
            )}
            <Icon size={20} strokeWidth={active ? 2.2 : 1.8} />
            {label}
          </button>
        );
      })}
    </nav>
  );
}