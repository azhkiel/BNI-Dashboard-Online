// src/pages/Login.jsx
import { useState, useEffect } from "react";
import BASE_URL from "../config";

// ── ICONS ───────────────────────────────────────────────────────────────────
const IconUser   = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLock   = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconEye    = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconAlert  = ({ size = 15, color = "#dc2626" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconCheck  = ({ size = 32, color = "white" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconArrow  = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IconShield = ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconLandmark = ({ size = 24, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="22" x2="21" y2="22"/><line x1="6" y1="18" x2="6" y2="11"/><line x1="10" y1="18" x2="10" y2="11"/><line x1="14" y1="18" x2="14" y2="11"/><line x1="18" y1="18" x2="18" y2="11"/><polygon points="12 2 20 7 4 7"/></svg>;

// ── SUCCESS POPUP ───────────────────────────────────────────────────────────
function SuccessPopup({ nama }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 11 ? "Selamat Pagi" :
    hour < 15 ? "Selamat Siang" :
    hour < 18 ? "Selamat Sore" : "Selamat Malam";

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,41,96,0.45)",
      backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
      animation: "overlayIn .3s ease",
    }}>
      <div style={{
        background: "white",
        border: "1px solid rgba(0,63,135,0.1)",
        borderRadius: 24,
        padding: "44px 48px",
        textAlign: "center",
        maxWidth: 380,
        width: "90%",
        boxShadow: "0 32px 80px rgba(0,41,96,0.18), 0 4px 24px rgba(0,63,135,0.1)",
        animation: "popupIn .35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: "50%",
          background: "linear-gradient(135deg, #F37021, #e05a00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 12px 32px rgba(243,112,33,0.35)",
          animation: "checkPop .5s .2s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
        }}>
          <IconCheck size={34} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#F37021", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Login Berhasil
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: "#002960", marginBottom: 6, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.3px" }}>
          {greeting}!
        </div>
        <div style={{ fontSize: 15, color: "#64748b", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          {nama}
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Mengalihkan ke dashboard…
        </div>
        <div style={{ height: 3, background: "#f0f4fa", borderRadius: 99, marginTop: 28, overflow: "hidden" }}>
          <div style={{
            height: "100%", borderRadius: 99,
            background: "linear-gradient(90deg, #F37021, #ff9a50)",
            animation: "barFill 1.8s linear forwards",
          }} />
        </div>
      </div>
    </div>
  );
}

// ── STAT CARD (Left Panel) ──────────────────────────────────────────────────
function StatCard({ value, label, accent }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.12)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: 14,
      padding: "14px 20px",
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.55)", marginTop: 3, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.12em" }}>{label}</div>
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [successData,  setSuccessData]  = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 50); }, []);

  const handleSubmit = async () => {
    setError("");
    const u = username.trim();
    const p = password;
    if (!u || !p) { setError("Username dan password tidak boleh kosong."); return; }
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
          username: result.username, nama: result.nama,
          loginAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + SESSION_DURATION_MS).toISOString(),
        };
        localStorage.setItem("bni_session", JSON.stringify(session));
        setSuccessData({ nama: result.nama });
        setTimeout(() => onLogin(session), 2000);
      } else {
        setError(result.message || "Login gagal. Periksa kembali kredensial Anda.");
      }
    } catch (err) {
      setError(err.message.startsWith("Server error")
        ? "Server tidak merespons. Coba beberapa saat lagi."
        : "Gagal menghubungi server. Periksa koneksi internet Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") handleSubmit(); };

  const inputStyle = (field) => ({
    display: "flex", alignItems: "center", gap: 12,
    background: focusedField === field ? "#EEF4FF" : "#F8FAFC",
    border: `1.5px solid ${
      focusedField === field ? "#003F87"
        : error ? "rgba(220,38,38,0.3)"
        : "#e2e8f0"
    }`,
    borderRadius: 12,
    padding: "12px 16px",
    transition: "all .2s ease",
    boxShadow: focusedField === field ? "0 0 0 3px rgba(0,63,135,0.1)" : "none",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes overlayIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popupIn    { from { opacity: 0; transform: scale(.85) translateY(16px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes checkPop   { from { transform: scale(0) } to { transform: scale(1) } }
        @keyframes barFill    { from { width: 0 } to { width: 100% } }
        @keyframes fadeSlideL { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeSlideR { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeSlideU { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes lineGrow   { from { width: 0 } to { width: 36px } }
        @keyframes shimmer    { 0% { background-position: -400px 0 } 100% { background-position: 400px 0 } }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 14px 36px rgba(243,112,33,0.4) !important;
        }
        .login-btn:active:not(:disabled) { transform: translateY(0) !important; }

        input::placeholder { color: #94a3b8; }
        input { caret-color: #F37021; }

        @media (max-width: 768px) {
          .split-left { display: none !important; }
          .split-right { width: 100% !important; }
        }
      `}</style>

      {successData && <SuccessPopup nama={successData.nama} />}

      <div style={{
        minHeight: "100vh",
        display: "flex",
        fontFamily: "'DM Sans', sans-serif",
        background: "#F0F4FA",
      }}>

        {/* ── LEFT PANEL (same BNI dark blue as dashboard header) ────────── */}
        <div className="split-left" style={{
          width: "52%",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(135deg, #002960 0%, #003F87 100%)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 52px",
        }}>
          {/* Subtle decorative circles — same as dashboard header */}
          <div style={{ position: "absolute", right: -40, top: -40, width: 320, height: 320, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 80, bottom: -80, width: 260, height: 260, borderRadius: "50%", background: "rgba(255,255,255,0.03)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", left: -60, bottom: "30%", width: 240, height: 240, borderRadius: "50%", background: "rgba(243,112,33,0.07)", pointerEvents: "none" }} />

          {/* Logo / brand */}
          <div style={{ position: "relative", zIndex: 2, animation: mounted ? "fadeSlideL .6s .1s both" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48,
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <img src="logo.png" style={{ width: 32, height: 32, objectFit: "contain" }} alt="BNI Life" />
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: "-0.2px", fontFamily: "'DM Sans', sans-serif" }}>BNI Dashboard</div>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginTop: 2, letterSpacing: "0.1em", textTransform: "uppercase" }}>Internal System</div>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0" }}>
            {/* Badge */}
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(243,112,33,0.15)",
              border: "1px solid rgba(243,112,33,0.3)",
              borderRadius: 99, padding: "6px 16px",
              marginBottom: 24,
              animation: mounted ? "fadeSlideL .6s .25s both" : "none",
              alignSelf: "flex-start",
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F37021" }} />
              <span style={{ fontSize: 11, color: "#ffb380", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Dashboard Manajemen
              </span>
            </div>

            <h1 style={{
              color: "white",
              fontSize: 48,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-1.2px",
              marginBottom: 18,
              animation: mounted ? "fadeSlideL .6s .35s both" : "none",
            }}>
              Kelola Data<br />dengan Mudah
            </h1>

            <p style={{
              color: "rgba(255,255,255,0.55)",
              fontSize: 14, lineHeight: 1.75,
              maxWidth: 340, marginBottom: 40,
              animation: mounted ? "fadeSlideL .6s .45s both" : "none",
              fontWeight: 400,
            }}>
              Platform terpadu untuk monitoring, analitik, dan pengelolaan data secara real-time.
            </p>

            {/* Stat cards — 3 columns */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
              animation: mounted ? "fadeSlideL .6s .55s both" : "none",
            }}>
              <StatCard value="98.6%" label="Uptime" />
              <StatCard value="2.4s" label="Resp. Time" />
              <StatCard value="256-bit" label="Enkripsi" />
            </div>
          </div>

          {/* Footer tag */}
          <div style={{ position: "relative", zIndex: 2, animation: mounted ? "fadeSlideL .6s .7s both" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 20, height: 1, background: "rgba(255,255,255,0.25)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                © 2026 BNI Dashboard — Internal Use Only
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL (white card, same as dashboard content area) ───── */}
        <div className="split-right" style={{
          width: "48%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 40px",
          background: "#F0F4FA",
          position: "relative",
        }}>

          <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>

            {/* Card wrapper — mirrors dashboard ChartCard */}
            <div style={{
              background: "white",
              borderRadius: 18,
              border: "1px solid rgba(0,63,135,0.07)",
              boxShadow: "0 2px 20px rgba(0,63,135,0.07)",
              padding: "40px 40px 36px",
              animation: mounted ? "fadeSlideR .6s .2s both" : "none",
            }}>

              {/* Top accent bar — BNI orange */}
              <div style={{
                height: 4, borderRadius: "4px 4px 0 0",
                background: "linear-gradient(90deg, #F37021, #ff9a50)",
                margin: "-40px -40px 32px",
                borderRadius: "18px 18px 0 0",
              }} />

              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: "rgba(0,63,135,0.08)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <IconLandmark size={18} color="#003F87" />
                  </div>
                  <div style={{
                    height: 2, width: 0,
                    background: "#F37021", borderRadius: 2,
                    animation: mounted ? "lineGrow .5s .7s forwards" : "none",
                  }} />
                  <span style={{ fontSize: 11, color: "#F37021", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Selamat Datang
                  </span>
                </div>
                <h2 style={{
                  fontSize: 28,
                  fontFamily: "'Playfair Display', serif",
                  fontWeight: 800,
                  color: "#002960",
                  letterSpacing: "-0.8px",
                  lineHeight: 1.2,
                  marginBottom: 8,
                }}>
                  Masuk ke Dashboard
                </h2>
                <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, fontWeight: 400 }}>
                  Gunakan kredensial internal Anda untuk mengakses sistem.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  background: "#fef2f2",
                  border: "1px solid rgba(220,38,38,0.2)",
                  borderRadius: 10, padding: "10px 14px", marginBottom: 20,
                  animation: "fadeSlideU .25s ease",
                }}>
                  <div style={{ marginTop: 1 }}><IconAlert /></div>
                  <span style={{ fontSize: 12, color: "#dc2626", fontWeight: 500, lineHeight: 1.5 }}>{error}</span>
                </div>
              )}

              {/* Username */}
              <div style={{ marginBottom: 14 }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700,
                  color: "#94a3b8", textTransform: "uppercase",
                  letterSpacing: "0.12em", marginBottom: 7,
                }}>Username</label>
                <div style={inputStyle("username")}>
                  <span style={{ color: focusedField === "username" ? "#003F87" : "#cbd5e1", transition: "color .2s" }}>
                    <IconUser />
                  </span>
                  <input
                    type="text"
                    value={username}
                    onChange={e => { setUsername(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField("username")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleKeyDown}
                    placeholder="Masukkan username"
                    autoComplete="username"
                    style={{
                      border: "none", background: "transparent", outline: "none",
                      fontSize: 13, color: "#1e293b", width: "100%",
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 28 }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700,
                  color: "#94a3b8", textTransform: "uppercase",
                  letterSpacing: "0.12em", marginBottom: 7,
                }}>Password</label>
                <div style={inputStyle("password")}>
                  <span style={{ color: focusedField === "password" ? "#003F87" : "#cbd5e1", transition: "color .2s" }}>
                    <IconLock />
                  </span>
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(""); }}
                    onFocus={() => setFocusedField("password")}
                    onBlur={() => setFocusedField(null)}
                    onKeyDown={handleKeyDown}
                    placeholder="Masukkan password"
                    autoComplete="current-password"
                    style={{
                      border: "none", background: "transparent", outline: "none",
                      fontSize: 13, color: "#1e293b", width: "100%",
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
                    }}
                  />
                  <button
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 4, display: "flex", alignItems: "center",
                      color: "#cbd5e1", transition: "color .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "#64748b"}
                    onMouseLeave={e => e.currentTarget.style.color = "#cbd5e1"}
                  >
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                className="login-btn"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  background: loading
                    ? "#f1f5f9"
                    : "linear-gradient(135deg, #F37021 0%, #e05800 100%)",
                  color: loading ? "#94a3b8" : "white",
                  border: loading ? "1px solid #e2e8f0" : "none",
                  borderRadius: 12,
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: loading ? "none" : "0 6px 22px rgba(243,112,33,0.3)",
                  transition: "all .25s ease",
                  letterSpacing: "0.01em",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {loading ? (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                    Memverifikasi...
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <IconArrow size={15} />
                  </>
                )}
              </button>
            </div>

            {/* Security note below card */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              marginTop: 18,
              animation: mounted ? "fadeSlideR .6s .6s both" : "none",
            }}>
              <span style={{ color: "#94a3b8" }}><IconShield /></span>
              <span style={{ fontSize: 11, color: "#94a3b8", letterSpacing: "0.04em" }}>
                Koneksi terenkripsi 256-bit · Hanya pengguna internal
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}