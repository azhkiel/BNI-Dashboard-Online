// src/pages/Login.jsx
import { useState } from "react";
import BASE_URL from "../config";

// ── INLINE ICONS ───────────────────────────────────────────────────────────
const IconUser    = ({ size = 16, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLock    = ({ size = 16, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconEye     = ({ size = 16, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff  = ({ size = 16, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconAlert   = ({ size = 15, color = "#dc2626" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconShield  = ({ size = 13, color = "#94a3b8" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconSpinner = ({ size = 18, color = "white" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
      <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
    </path>
  </svg>
);
const IconCheck   = ({ size = 36, color = "white" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// ── SUCCESS POPUP ──────────────────────────────────────────────────────────
function SuccessPopup({ nama }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" :
    hour < 15 ? "Selamat Siang" :
    hour < 18 ? "Selamat Sore" : "Selamat Malam";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 999,
      animation: "fadeIn .2s ease",
    }}>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px) scale(.96) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>

      <div style={{
        background: "white",
        borderRadius: 24,
        padding: "40px 44px",
        textAlign: "center",
        maxWidth: 360,
        width: "90%",
        boxShadow: "0 32px 80px rgba(0,0,0,0.3)",
        animation: "slideUp .28s ease",
      }}>
        {/* Icon circle */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "linear-gradient(135deg, #002960 0%, #003F87 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: "0 8px 24px rgba(0,63,135,0.35)",
        }}>
          <IconCheck />
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: "#F37021", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
          Login Berhasil
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#002960", marginBottom: 6, letterSpacing: "-0.4px" }}>
          {greeting}!
        </div>
        <div style={{ fontSize: 15, color: "#475569", fontWeight: 500 }}>
          {nama}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8 }}>
          Mengalihkan ke dashboard…
        </div>

        {/* Progress bar */}
        <div style={{
          height: 3, background: "#e2e8f0", borderRadius: 99, marginTop: 24, overflow: "hidden",
        }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #002960, #003F87)",
            animation: "progressFill 1.8s linear forwards",
          }} />
        </div>
        <style>{`
          @keyframes progressFill { from { width: 0% } to { width: 100% } }
        `}</style>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [successData, setSuccessData] = useState(null); // { nama }

  const handleSubmit = async () => {
    setError("");
    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setError("Username dan password tidak boleh kosong.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(BASE_URL + "?action=login", {
        method: "POST",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ username: u, password: p }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const result = await res.json();

      if (result.success) {
        const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;
        const session = {
          username:  result.username,
          nama:      result.nama,
          loginAt:   new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
        };
        localStorage.setItem("bni_session", JSON.stringify(session));

        // Tampilkan popup, lalu panggil onLogin setelah 2 detik
        setSuccessData({ nama: result.nama });
        setTimeout(() => onLogin(session), 2000);
      } else {
        setError(result.message || "Login gagal. Periksa kembali kredensial Anda.");
      }
    } catch (err) {
      if (err.message.startsWith("Server error")) {
        setError("Server tidak merespons dengan benar. Coba beberapa saat lagi.");
      } else {
        setError("Gagal menghubungi server. Periksa koneksi internet Anda.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #001a3d 0%, #002960 40%, #003F87 100%)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "24px", fontFamily: "'Segoe UI', sans-serif",
      position: "relative", overflow: "hidden",
    }}>

      {/* Success Popup */}
      {successData && <SuccessPopup nama={successData.nama} />}

      {/* Background decorative circles */}
      <div style={{ position: "absolute", top: -120, right: -120, width: 400, height: 400, borderRadius: "50%", background: "rgba(243,112,33,0.07)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -80, left: -80, width: 300, height: 300, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", top: "30%", left: "10%", width: 180, height: 180, borderRadius: "50%", background: "rgba(0,169,157,0.06)", pointerEvents: "none" }} />

      {/* Card */}
      <div style={{
        width: "100%", maxWidth: 420,
        background: "white",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.05)",
        overflow: "hidden",
        position: "relative", zIndex: 1,
      }}>

        {/* Card Header */}
        <div style={{
          background: "linear-gradient(135deg, #002960 0%, #003F87 100%)",
          padding: "32px 36px 28px",
          position: "relative", overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -30, top: -30, width: 130, height: 130, borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
          <div style={{ position: "absolute", right: 20, bottom: -40, width: 90, height: 90, borderRadius: "50%", background: "rgba(243,112,33,0.15)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 14, position: "relative", zIndex: 1 }}>
            <div >
              <img src="logo.png" className="w-10 h-10 object-contain"/>
            </div>
            <div>
              <div style={{ color: "white", fontWeight: 800, fontSize: 17, letterSpacing: "-0.3px" }}>BNI Life Insurance</div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>Internal Dashboard System</div>
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div style={{ padding: "32px 36px 28px" }}>

          {/* Error */}
          {error && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            }}>
              <IconAlert />
              <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500 }}>{error}</span>
            </div>
          )}

          {/* Username */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              Username
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#f8fafc", border: "1.5px solid " + (error ? "#fca5a5" : "#e2e8f0"),
              borderRadius: 10, padding: "11px 14px",
              transition: "border-color .15s",
            }}>
              <IconUser />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan username"
                autoComplete="username"
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 13, color: "#1e293b", width: "100%",
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
              Password
            </label>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "#f8fafc", border: "1.5px solid " + (error ? "#fca5a5" : "#e2e8f0"),
              borderRadius: 10, padding: "11px 14px",
            }}>
              <IconLock />
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={e => { setPassword(e.target.value); setError(""); }}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan password"
                autoComplete="current-password"
                style={{
                  border: "none", background: "transparent", outline: "none",
                  fontSize: 13, color: "#1e293b", width: "100%",
                }}
              />
              <button
                onClick={() => setShowPass(v => !v)}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
                aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPass ? <IconEyeOff /> : <IconEye />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%", padding: "13px",
              background: loading ? "#94a3b8" : "linear-gradient(135deg, #002960 0%, #003F87 100%)",
              color: "white", border: "none", borderRadius: 12,
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: loading ? "none" : "0 4px 20px rgba(0,63,135,0.35)",
              transition: "all .2s",
              letterSpacing: "0.02em",
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ""; }}
          >
            {loading ? <><IconSpinner /> Memverifikasi...</> : "Masuk ke Dashboard"}
          </button>

          {/* Footer info */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 20 }}>
            <IconShield />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>Koneksi aman • Hanya untuk pengguna internal</span>
          </div>
        </div>
      </div>

      {/* Bottom copyright */}
      <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, textAlign: "center" }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
          © 2026 BNI Dashboard — Internal Use Only
        </span>
      </div>
    </div>
  );
}