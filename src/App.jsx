import { useState, useEffect, useCallback } from "react";
import { getAllData, getAllDataTeller, getAllDataPasmar } from "./api";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Dashboard from "./pages/Dashboard";
import Crud from "./pages/Crud";
import SAWRanking from "./pages/SAWRanking";
import TellerDashboard from "./pages/TellerDashboard";
import PasmarDashboard from "./pages/PasmarDashboard";
import Login from "./pages/Login";
import KMeansDashboard from "./pages/KMeansDashboard";
import DBSCANDashboard from "./pages/DBSCANDashboard";
import RegresiDashboard from "./pages/RegresiDashboard";
import IsolationForestDashboard from "./pages/IsolationForestDashboard";
import AutoencoderDashboard from "./pages/AutoencoderDashboard";
import LSTMDashboard from "./pages/LstmDashboard";
import "./global.css";

// ── SESSION HELPERS ────────────────────────────────────────────────────────

const SESSION_KEY = "bni_session";

function getStoredSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw);

    if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
}

// ── APP ────────────────────────────────────────────────────────────────────

export default function App() {
  const [session, setSession]         = useState(() => getStoredSession());
  const [page, setPage]               = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed]     = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; }
    catch { return false; }
  });

  const [data, setData]               = useState(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataTeller, setDataTeller]   = useState(null);
  const [tellerLoading, setTellerLoading] = useState(true);
  const [dataPasmar, setDataPasmar]   = useState(null);

  // ── Persist sidebar collapsed state
  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); }
    catch {}
  }, [collapsed]);

  // ── Auto-logout when session expires (checked every 5 minutes)
  useEffect(() => {
    if (!session) return;
    const interval = setInterval(() => {
      if (!getStoredSession()) handleLogout();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [session]);

  // ── Fetch main data
  const loadData = useCallback(async () => {
    if (!session) return;
    setDataLoading(true);
    try {
      setData(await getAllData());
    } catch (err) {
      console.error("Gagal memuat data:", err);
      setData([]);
    } finally {
      setDataLoading(false);
    }
  }, [session]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Fetch teller data
  useEffect(() => {
    if (!session) return;
    getAllDataTeller()
      .then(setDataTeller)
      .catch(() => setDataTeller([]))
      .finally(() => setTellerLoading(false));
  }, [session]);

  // ── Fetch pasmar data
  useEffect(() => {
    if (!session) return;
    getAllDataPasmar()
      .then(setDataPasmar)
      .catch(() => setDataPasmar([]));
  }, [session]);

  // ── Handlers
  const handleLogin = (newSession) => setSession(newSession);

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
    setSidebarOpen(false);
  };

  // ── Render
  if (!session) return <Login onLogin={handleLogin} />;

  const tellerProps = { data: dataTeller, loading: tellerLoading };

  return (
    <div className="flex min-h-screen bg-[#F0F4FA] overflow-x-hidden">

      <Sidebar
        page={page}
        onNavigate={handleNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
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
          onOpenSidebar={() => setSidebarOpen(true)}
          session={session}
          onLogout={handleLogout}
        />

        <main className="flex-1 min-w-0 overflow-x-hidden pb-24 lg:pb-0">
          {page === "dashboard"       && <Dashboard data={data} loading={dataLoading} onNavigate={handleNavigate} />}
          {page === "crud"            && <Crud data={data} loading={dataLoading} onRefresh={loadData} />}
          {page === "sawrangking"     && <SAWRanking />}
          {page === "tellerdashboard" && <TellerDashboard {...tellerProps} />}
          {page === "pasmar"          && <PasmarDashboard data={dataPasmar} />}
          {page === "kmeans"          && <KMeansDashboard {...tellerProps} />}
          {page === "dbscan"          && <DBSCANDashboard {...tellerProps} />}
          {page === "regresi"         && <RegresiDashboard {...tellerProps} />}
          {page === "if"              && <IsolationForestDashboard {...tellerProps} />}
          {page === "auto"            && <AutoencoderDashboard {...tellerProps} />}
          {page === "lstm"            && <LSTMDashboard {...tellerProps} />}
        </main>

      </div>
    </div>
  );
}