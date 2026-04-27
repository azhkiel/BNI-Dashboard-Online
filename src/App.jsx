// App.jsx — dengan sistem login + session expiry
import { useState, useEffect, useCallback } from "react";
import { getAllData } from "./api";
import { getAllDataTeller } from "./api";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import BottomNav from "./components/BottomNav";
import Dashboard from "./pages/Dashboard";
import Crud from "./pages/Crud";
import SAWRanking from "./pages/SAWRanking";
import TellerDashboard from "./pages/TellerDashboard";
import PasmarDashboard from "./pages/PasmarDashboard";
import Login from "./pages/Login";
import "./global.css";

// ── SESSION HELPERS ────────────────────────────────────────────────────────

/**
 * Baca session dari localStorage dan validasi expiry-nya.
 * Mengembalikan null jika tidak ada atau sudah kadaluarsa.
 */
function getStoredSession() {
  try {
    const raw = localStorage.getItem("bni_session");
    if (!raw) return null;

    const session = JSON.parse(raw);

    // ✅ Cek expiry — jika sudah lewat, hapus dan anggap tidak login
    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      localStorage.removeItem("bni_session");
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  try { localStorage.removeItem("bni_session"); } catch {}
}

function handleLogout() {
  localStorage.removeItem("bni_session");
  setSession(null); // atau state apapun yang kamu pakai untuk track login
}

// ── APP ────────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession]     = useState(() => getStoredSession());
  const [page, setPage]           = useState("dashboard");
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [sidebarOpen, setSidebar] = useState(false);
  const [dataTeller, setDataTeller]       = useState(null);
  const [loadingTeller, setLoadingTeller] = useState(true);
  const [dataPasmar, setDataPasmar]       = useState(null);

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); }
    catch {}
  }, [collapsed]);

  // ✅ Periksa expiry session secara berkala (setiap 5 menit)
  // Ini memastikan user yang meninggalkan tab terbuka tetap aman di-logout.
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      const valid = getStoredSession();
      if (!valid) {
        handleLogout();
      }
    }, 5 * 60 * 1000); // cek tiap 5 menit

    return () => clearInterval(interval);
  }, [session]);

  // Load data hanya jika sudah login
  useEffect(() => {
    if (!session) return;
    getAllDataTeller()
      .then(setDataTeller)
      .catch(() => setDataTeller([]))
      .finally(() => setLoadingTeller(false));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    import("./api").then(({ getAllDataPasmar }) => {
      getAllDataPasmar()
        .then(setDataPasmar)
        .catch(() => setDataPasmar([]));
    });
  }, [session]);

  const loadData = useCallback(async () => {
    if (!session) return;
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
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLogin = (newSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    clearSession();
    setSession(null);
    setData(null);
    setDataTeller(null);
    setDataPasmar(null);
    setPage("dashboard");
  };

  const handleNavigate = (newPage) => {
    setPage(newPage);
    setSidebar(false);
  };

  // ── Belum login → tampilkan halaman Login ──
  if (!session) {
    return <Login onLogin={handleLogin} />;
  }

  // ── Sudah login → tampilkan dashboard ──
  return (
    <div className="flex min-h-screen bg-[#F0F4FA] overflow-x-hidden">

      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebar(false)}
        collapsed={collapsed}
        onCollapse={setCollapsed}
        onLogout={handleLogout}
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
          session={session}
          onLogout={handleLogout}
        />

        <main className="flex-1 min-w-0 overflow-x-hidden pb-24 lg:pb-0">
          {page === "dashboard"       && <Dashboard  data={data} loading={loading} onNavigate={handleNavigate} />}
          {page === "sawrangking"     && <SAWRanking />}
          {page === "tellerdashboard" && <TellerDashboard data={dataTeller} loading={loadingTeller} />}
          {page === "pasmar"          && <PasmarDashboard data={dataPasmar} />}
          {page === "crud"            && <Crud data={data} loading={loading} onRefresh={loadData} />}
        </main>

      </div>

      <BottomNav page={page} onNavigate={handleNavigate} />
    </div>
  );
}