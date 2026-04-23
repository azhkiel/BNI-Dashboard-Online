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
    /*
      Root: flex row, full viewport height.
      Sidebar is position:fixed (out of flow).
      lg:ml-64 pushes main content past the 256px fixed sidebar on desktop.
      On mobile (< lg) sidebar slides off-canvas, margin resets to 0.
    */
    <div className="flex min-h-screen bg-[#F0F4FA] overflow-x-hidden">

      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebar(false)}
      />

      {/* Main column — pushed right of sidebar on desktop */}
      <div className="flex flex-col flex-1 min-w-0 min-h-screen lg:ml-64">

        <Topbar
          page={page}
          onNavigate={handleNavigate}
          onOpenSidebar={() => setSidebar(true)}
        />

        {/* Page content — extra bottom padding on mobile for BottomNav */}
        <main className="flex-1 min-w-0 overflow-x-hidden pb-24 lg:pb-0">
          {page === "dashboard"   && <Dashboard  data={data} loading={loading} onNavigate={handleNavigate} />}
          {page === "sawrangking" && <SAWRanking />}
          {page === "crud"        && <Crud data={data} loading={loading} onRefresh={loadData} />}
        </main>

      </div>

      {/* Mobile bottom nav */}
      <BottomNav page={page} onNavigate={handleNavigate} />
    </div>
  );
}