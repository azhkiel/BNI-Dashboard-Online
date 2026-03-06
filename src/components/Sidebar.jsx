export default function Sidebar({ page, onNavigate, isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      <div
        className={"sidebar-overlay" + (isOpen ? " active" : "")}
        onClick={onClose}
      />

      <aside className={"sidebar" + (isOpen ? " open" : "")}>
        {/* Close button (mobile) */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, background: "rgba(255,255,255,0.12)",
            color: "white", border: "none", cursor: "pointer", fontSize: 16,
          }}
        >✕</button>

        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 12px", marginBottom: 32 }}>
          <div style={{ fontSize: 28 }}>🏦</div>
          <div style={{ color: "white", fontWeight: 800, fontSize: 16 }}>BNI Life</div>
        </div>

        {/* Nav */}
        <div className="section-label">Menu</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <button
            className={"nav-item" + (page === "dashboard" ? " active" : "")}
            onClick={() => { onNavigate("dashboard"); onClose(); }}
          >
            <span>📊</span> Dashboard
          </button>
          <button
            className={"nav-item" + (page === "crud" ? " active" : "")}
            onClick={() => { onNavigate("crud"); onClose(); }}
          >
            <span>📝</span> Input / Edit Data
          </button>
          <a
            href="https://docs.google.com/spreadsheets/d/1MPb4aMPFwzZM_xheqP_Gzrxf8Gn-eMxa-NOyqRekJgQ/edit?usp=sharing"
            target="_blank"
            rel="noreferrer"
            className="nav-item"
            onClick={onClose}
          >
            <span>📁</span> DATA EXCEL
          </a>
        </nav>
      </aside>
    </>
  );
}
