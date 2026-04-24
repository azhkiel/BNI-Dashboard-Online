// App.jsx
import { useState, useEffect, useCallback } from "react";
import { getAllData } from "./api";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Crud from "./pages/Crud";
import SAWRanking from "./pages/SAWRanking";
import "./global.css";

export default function App() {
  const [page, setPage]           = useState("dashboard");
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [sidebarOpen, setSidebar] = useState(false);

  // ✅ Satu-satunya sumber collapsed state
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  // Simpan ke localStorage setiap kali berubah
  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); }
    catch {}
  }, [collapsed]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getAllData();
      setData(d);
    } catch (err) {
      console.error("Gagal memuat data:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleNavigate = (newPage) => {
    setPage(newPage);
    setSidebar(false);
  };

  return (
    <div className="flex min-h-screen bg-[#F0F4FA] overflow-x-hidden">

      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebar(false)}
        collapsed={collapsed}
        onCollapse={setCollapsed}
      />

      <div className={[
        "flex flex-col flex-1 min-w-0 min-h-screen",
        "transition-[margin] duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
        collapsed ? "lg:ml-16" : "lg:ml-64",
      ].join(" ")}>

        <Topbar
          page={page}
          onNavigate={handleNavigate}
          onOpenSidebar={() => setSidebar(true)}
        />

        <main className="flex-1 min-w-0 overflow-x-hidden pb-24 lg:pb-0">
          {page === "dashboard"   && <Dashboard  data={data} loading={loading} onNavigate={handleNavigate} />}
          {page === "sawrangking" && <SAWRanking />}
          {page === "crud"        && <Crud data={data} loading={loading} onRefresh={loadData} />}
        </main>

      </div>

      <BottomNav page={page} onNavigate={handleNavigate} />
    </div>
  );
}