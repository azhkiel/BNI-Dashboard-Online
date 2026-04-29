// src/pages/Login.jsx
import { useState, useEffect, useRef } from "react";
import BASE_URL from "../config";

// ── ICONS ───────────────────────────────────────────────────────────────────
const IconUser    = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconLock    = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>;
const IconEye     = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
const IconEyeOff  = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
const IconAlert   = ({ size = 15, color = "#ff6b6b" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IconCheck   = ({ size = 32, color = "white" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconArrow   = ({ size = 16, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>;
const IconShield  = ({ size = 12, color = "currentColor" }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

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
      background: "rgba(0,12,36,0.75)",
      backdropFilter: "blur(8px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 9999,
      animation: "overlayIn .3s ease",
    }}>
      <div style={{
        background: "linear-gradient(145deg, #0d1f3e, #0a2955)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24,
        padding: "44px 48px",
        textAlign: "center",
        maxWidth: 380,
        width: "90%",
        boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 60px rgba(243,112,33,0.1)",
        animation: "popupIn .35s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: "50%",
          background: "linear-gradient(135deg, #F37021, #e05a00)",
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 24px",
          boxShadow: "0 12px 36px rgba(243,112,33,0.45)",
          animation: "checkPop .5s .2s cubic-bezier(0.175, 0.885, 0.32, 1.275) both",
        }}>
          <IconCheck size={34} />
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#F37021", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Login Berhasil
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: "white", marginBottom: 6, fontFamily: "'Playfair Display', serif", letterSpacing: "-0.3px" }}>
          {greeting}!
        </div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>
          {nama}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 8, fontFamily: "'DM Sans', sans-serif" }}>
          Mengalihkan ke dashboard…
        </div>
        <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 99, marginTop: 28, overflow: "hidden" }}>
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

// ── FLOATING PARTICLE ───────────────────────────────────────────────────────
function Particle({ style }) {
  return <div style={{ position: "absolute", borderRadius: "50%", pointerEvents: "none", ...style }} />;
}

// ── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({ value, label, delay }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.06)",
      backdropFilter: "blur(12px)",
      border: "1px solid rgba(255,255,255,0.1)",
      borderRadius: 16,
      padding: "16px 22px",
      animation: `floatIn .7s ${delay}s both`,
    }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: "white", fontFamily: "'Playfair Display', serif", letterSpacing: "-0.5px" }}>{value}</div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3, fontFamily: "'DM Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</div>
    </div>
  );
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function Login({ onLogin }) {
  const [username,    setUsername]    = useState("");
  const [password,    setPassword]    = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [successData, setSuccessData] = useState(null);
  const [focusedField, setFocusedField] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTimeout(() => setMounted(true), 50);
  }, []);

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
    background: focusedField === field ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
    border: `1.5px solid ${error && !username && !password ? "rgba(255,107,107,0.5)" : focusedField === field ? "rgba(243,112,33,0.7)" : "rgba(255,255,255,0.1)"}`,
    borderRadius: 12,
    padding: "13px 16px",
    transition: "all .2s ease",
    boxShadow: focusedField === field ? "0 0 0 4px rgba(243,112,33,0.08), inset 0 1px 0 rgba(255,255,255,0.05)" : "none",
  });

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes overlayIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popupIn    { from { opacity: 0; transform: scale(.8) translateY(20px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes checkPop   { from { transform: scale(0) } to { transform: scale(1) } }
        @keyframes barFill    { from { width: 0 } to { width: 100% } }

        @keyframes floatIn    { from { opacity: 0; transform: translateY(20px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes fadeSlideL { from { opacity: 0; transform: translateX(-40px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeSlideR { from { opacity: 0; transform: translateX(40px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeSlideU { from { opacity: 0; transform: translateY(24px) } to { opacity: 1; transform: translateY(0) } }

        @keyframes drift1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(18px,-24px) scale(1.08); }
          66%      { transform: translate(-14px,16px) scale(0.95); }
        }
        @keyframes drift2 {
          0%,100% { transform: translate(0,0) scale(1); }
          40%      { transform: translate(-20px,20px) scale(1.05); }
          70%      { transform: translate(12px,-16px) scale(0.92); }
        }
        @keyframes drift3 {
          0%,100% { transform: translate(0,0); }
          50%      { transform: translate(10px,-30px); }
        }
        @keyframes meshMove {
          0%,100% { transform: translate(0%,0%) rotate(0deg); }
          50%      { transform: translate(3%,-3%) rotate(3deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulse {
          0%,100% { opacity: 0.4; transform: scale(1); }
          50%      { opacity: 0.7; transform: scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes lineGrow {
          from { width: 0 }
          to   { width: 40px }
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px) !important;
          box-shadow: 0 16px 40px rgba(243,112,33,0.45) !important;
        }
        .login-btn:active:not(:disabled) {
          transform: translateY(0px) !important;
        }

        input::placeholder { color: rgba(255,255,255,0.2); }
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
        background: "#050d1f",
      }}>

        {/* ── LEFT PANEL ─────────────────────────────────────────────────── */}
        <div className="split-left" style={{
          width: "55%",
          position: "relative",
          overflow: "hidden",
          background: "linear-gradient(145deg, #001229 0%, #002055 50%, #003080 100%)",
          display: "flex", flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 56px",
        }}>

          {/* Animated mesh background */}
          <div style={{
            position: "absolute", inset: 0, zIndex: 0,
            animation: "meshMove 12s ease-in-out infinite",
          }}>
            <div style={{ position: "absolute", top: "10%", left: "20%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,80,180,0.35) 0%, transparent 70%)" }} />
            <div style={{ position: "absolute", top: "40%", right: "5%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(243,112,33,0.15) 0%, transparent 70%)" }} />
            <div style={{ position: "absolute", bottom: "5%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,150,220,0.12) 0%, transparent 70%)" }} />
          </div>

          {/* Geometric grid lines */}
          <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, zIndex: 0 }} viewBox="0 0 600 900" preserveAspectRatio="xMidYMid slice">
            {[0,1,2,3,4,5,6,7,8,9,10,11,12].map(i => (
              <line key={`v${i}`} x1={i*55} y1="0" x2={i*55} y2="900" stroke="white" strokeWidth="1"/>
            ))}
            {[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(i => (
              <line key={`h${i}`} x1="0" y1={i*60} x2="600" y2={i*60} stroke="white" strokeWidth="1"/>
            ))}
            <line x1="0" y1="900" x2="600" y2="0" stroke="white" strokeWidth="0.5"/>
            <line x1="200" y1="900" x2="600" y2="300" stroke="white" strokeWidth="0.5"/>
          </svg>

          {/* Floating particles */}
          {[
            { w:8,h:8,t:"15%",l:"75%",bg:"rgba(243,112,33,0.6)",anim:"drift1 8s ease-in-out infinite" },
            { w:5,h:5,t:"70%",l:"80%",bg:"rgba(0,180,255,0.5)",anim:"drift2 10s ease-in-out infinite" },
            { w:12,h:12,t:"45%",l:"15%",bg:"rgba(255,255,255,0.12)",anim:"drift3 7s ease-in-out infinite" },
            { w:4,h:4,t:"85%",l:"40%",bg:"rgba(243,112,33,0.4)",anim:"drift1 11s ease-in-out infinite reverse" },
            { w:6,h:6,t:"25%",l:"55%",bg:"rgba(100,200,255,0.3)",anim:"drift2 9s ease-in-out infinite" },
          ].map((p,i) => (
            <Particle key={i} style={{ width:p.w,height:p.h,top:p.t,left:p.l,background:p.bg,animation:p.anim,zIndex:1 }} />
          ))}

          {/* Decorative circle ring */}
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 520, height: 520,
            borderRadius: "50%",
            border: "1px solid rgba(255,255,255,0.04)",
            zIndex: 0,
            animation: "pulse 6s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 380, height: 380,
            borderRadius: "50%",
            border: "1px solid rgba(243,112,33,0.08)",
            zIndex: 0,
          }} />

          {/* Logo */}
          <div style={{ position: "relative", zIndex: 2, animation: mounted ? "fadeSlideL .7s .1s both" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{
                width: 48, height: 48,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 14,
                display: "flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(10px)",
              }}>
                <img src="logo.png" style={{ width: 32, height: 32, objectFit: "contain" }} alt="BNI Life" />
              </div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: 16, letterSpacing: "-0.2px", fontFamily: "'DM Sans', sans-serif" }}>BNI Dashboard</div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 1, letterSpacing: "0.08em", textTransform: "uppercase" }}>Internal System</div>
              </div>
            </div>
          </div>

          {/* Main hero text */}
          <div style={{ position: "relative", zIndex: 2, flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "40px 0" }}>
            <div style={{
              display: "inline-block",
              background: "rgba(243,112,33,0.12)",
              border: "1px solid rgba(243,112,33,0.25)",
              borderRadius: 99,
              padding: "6px 16px",
              marginBottom: 24,
              animation: mounted ? "fadeSlideL .7s .25s both" : "none",
            }}>
              <span style={{ fontSize: 11, color: "#F37021", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                ● Dashboard Manajemen
              </span>
            </div>

            <h1 style={{
              color: "white",
              fontSize: 52,
              fontFamily: "'Playfair Display', serif",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-1.5px",
              marginBottom: 20,
              animation: mounted ? "fadeSlideL .7s .35s both" : "none",
            }}>
              Kelola Data
              dengan Mudah
            </h1>

            <p style={{
              color: "rgba(255,255,255,0.45)",
              fontSize: 14,
              lineHeight: 1.7,
              maxWidth: 360,
              marginBottom: 40,
              animation: mounted ? "fadeSlideL .7s .45s both" : "none",
              fontWeight: 400,
            }}>
              Platform terpadu untuk monitoring, analitik, dan pengelolaan data secara real-time.
            </p>

            {/* Stat cards */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12,
              animation: mounted ? "fadeSlideL .7s .55s both" : "none",
            }}>
              <StatCard value="98.6%" label="Uptime" delay={0.6} />
              <StatCard value="2.4s" label="Resp. Time" delay={0.7} />
              <StatCard value="256-bit" label="Enkripsi" delay={0.8} />
            </div>
          </div>

          {/* Bottom tag */}
          <div style={{
            position: "relative", zIndex: 2,
            animation: mounted ? "fadeSlideL .7s .7s both" : "none",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 1, background: "rgba(255,255,255,0.2)" }} />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                © 2026 BNI Dashboard — Internal Use Only
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ────────────────────────────────────────────────── */}
        <div className="split-right" style={{
          width: "45%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "48px 40px",
          background: "#050d1f",
          position: "relative",
          overflow: "hidden",
        }}>

          {/* Subtle bg glow */}
          <div style={{
            position: "absolute", top: "30%", left: "50%",
            transform: "translate(-50%,-50%)",
            width: 400, height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,63,135,0.2) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{
            width: "100%",
            maxWidth: 400,
            position: "relative", zIndex: 1,
          }}>

            {/* Header text */}
            <div style={{ marginBottom: 40, animation: mounted ? "fadeSlideR .7s .2s both" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{
                  height: 2, width: 0,
                  background: "#F37021",
                  animation: mounted ? "lineGrow .6s .6s forwards" : "none",
                  borderRadius: 2,
                }} />
                <span style={{ fontSize: 11, color: "#F37021", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.15em" }}>
                  Selamat Datang
                </span>
              </div>
              <h2 style={{
                fontSize: 36,
                fontFamily: "'Playfair Display', serif",
                fontWeight: 800,
                color: "white",
                letterSpacing: "-1px",
                lineHeight: 1.15,
                marginBottom: 10,
              }}>
                Masuk ke<br />Dashboard
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", lineHeight: 1.6, fontWeight: 400 }}>
                Gunakan kredensial internal Anda untuk mengakses sistem.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                background: "rgba(255,107,107,0.08)",
                border: "1px solid rgba(255,107,107,0.25)",
                borderRadius: 12, padding: "12px 16px", marginBottom: 24,
                animation: "fadeSlideU .3s ease",
              }}>
                <div style={{ marginTop: 1 }}><IconAlert /></div>
                <span style={{ fontSize: 12, color: "#ff8a8a", fontWeight: 500, lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            {/* Form */}
            <div style={{ animation: mounted ? "fadeSlideR .7s .4s both" : "none" }}>

              {/* Username */}
              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700,
                  color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                  letterSpacing: "0.12em", marginBottom: 8,
                }}>Username</label>
                <div style={inputStyle("username")}>
                  <span style={{ color: focusedField === "username" ? "#F37021" : "rgba(255,255,255,0.2)", transition: "color .2s" }}>
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
                      fontSize: 13, color: "white", width: "100%",
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ marginBottom: 32 }}>
                <label style={{
                  display: "block", fontSize: 10, fontWeight: 700,
                  color: "rgba(255,255,255,0.35)", textTransform: "uppercase",
                  letterSpacing: "0.12em", marginBottom: 8,
                }}>Password</label>
                <div style={inputStyle("password")}>
                  <span style={{ color: focusedField === "password" ? "#F37021" : "rgba(255,255,255,0.2)", transition: "color .2s" }}>
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
                      fontSize: 13, color: "white", width: "100%",
                      fontFamily: "'DM Sans', sans-serif", fontWeight: 400,
                    }}
                  />
                  <button
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: 4, display: "flex", alignItems: "center",
                      color: "rgba(255,255,255,0.2)",
                      transition: "color .2s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,0.6)"}
                    onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,0.2)"}
                  >
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <button
                className="login-btn"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "15px 24px",
                  background: loading
                    ? "rgba(255,255,255,0.06)"
                    : "linear-gradient(135deg, #F37021 0%, #e05800 100%)",
                  color: "white",
                  border: loading ? "1px solid rgba(255,255,255,0.08)" : "none",
                  borderRadius: 14,
                  fontSize: 14, fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  boxShadow: loading ? "none" : "0 8px 28px rgba(243,112,33,0.35)",
                  transition: "all .25s ease",
                  letterSpacing: "0.01em",
                  fontFamily: "'DM Sans', sans-serif",
                  position: "relative", overflow: "hidden",
                }}
              >
                {loading ? (
                  <>
                    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
                        <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
                      </path>
                    </svg>
                    <span style={{ color: "rgba(255,255,255,0.5)" }}>Memverifikasi...</span>
                  </>
                ) : (
                  <>
                    <span>Masuk ke Dashboard</span>
                    <IconArrow size={15} />
                  </>
                )}
              </button>
            </div>

            {/* Security note */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              marginTop: 24,
              animation: mounted ? "fadeSlideR .7s .6s both" : "none",
            }}>
              <span style={{ color: "rgba(255,255,255,0.2)" }}><IconShield /></span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
                Koneksi terenkripsi 256-bit · Hanya pengguna internal
              </span>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}