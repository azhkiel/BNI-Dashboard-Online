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
    <div className="fixed inset-0 bg-[#002960]/45 backdrop-blur-sm flex items-center justify-center z-[9999]" style={{ animation: "overlayIn .3s ease" }}>
      <div 
        className="bg-white border border-[#003F87]/10 rounded-[24px] py-11 px-12 text-center max-w-[380px] w-[90%] shadow-[0_32px_80px_rgba(0,41,96,0.18),0_4px_24px_rgba(0,63,135,0.1)]"
        style={{ animation: "popupIn .35s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }}
      >
        <div 
          className="w-[76px] h-[76px] rounded-full bg-gradient-to-br from-[#F37021] to-[#e05a00] flex items-center justify-center mx-auto mb-6 shadow-[0_12px_32px_rgba(243,112,33,0.35)]"
          style={{ animation: "checkPop .5s .2s cubic-bezier(0.175, 0.885, 0.32, 1.275) both" }}
        >
          <IconCheck size={34} />
        </div>
        <div className="text-[10px] font-bold text-[#F37021] uppercase tracking-[0.15em] mb-2 font-['DM_Sans']">
          Login Berhasil
        </div>
        <div className="text-[26px] font-extrabold text-[#002960] mb-1.5 font-['Playfair_Display'] tracking-[-0.3px]">
          {greeting}!
        </div>
        <div className="text-[15px] text-slate-500 font-medium font-['DM_Sans']">
          {nama}
        </div>
        <div className="text-xs text-slate-400 mt-2 font-['DM_Sans']">
          Mengalihkan ke dashboard…
        </div>
        <div className="h-[3px] bg-slate-100 rounded-full mt-7 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#F37021] to-[#ff9a50]" style={{ animation: "barFill 1.8s linear forwards" }} />
        </div>
      </div>
    </div>
  );
}

// ── STAT CARD (Left Panel) ──────────────────────────────────────────────────
function StatCard({ value, label }) {
  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-5 py-3.5">
      <div className="text-xl font-extrabold text-white font-['Playfair_Display'] tracking-[-0.5px]">{value}</div>
      <div className="text-[10px] text-white/55 mt-1 font-['DM_Sans'] uppercase tracking-[0.12em]">{label}</div>
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

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;800&family=DM+Sans:wght@300;400;500;600;700&display=swap');

        /* Custom Keyframes - dipertahankan untuk animasi yang presisi */
        @keyframes overlayIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes popupIn    { from { opacity: 0; transform: scale(.85) translateY(16px) } to { opacity: 1; transform: scale(1) translateY(0) } }
        @keyframes checkPop   { from { transform: scale(0) } to { transform: scale(1) } }
        @keyframes barFill    { from { width: 0 } to { width: 100% } }
        @keyframes fadeSlideL { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeSlideR { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: translateX(0) } }
        @keyframes fadeSlideU { from { opacity: 0; transform: translateY(12px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes lineGrow   { from { width: 0 } to { width: 36px } }
      `}</style>

      {successData && <SuccessPopup nama={successData.nama} />}

      <div className="min-h-screen flex font-['DM_Sans'] bg-[#F0F4FA]">

        {/* ── LEFT PANEL ────────── */}
        <div className="hidden md:flex w-[52%] relative overflow-hidden bg-gradient-to-br from-[#002960] to-[#003F87] flex-col justify-between px-12 py-12">
          {/* Decorative circles */}
          <div className="absolute -right-10 -top-10 w-[320px] h-[320px] rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-20 -bottom-20 w-[260px] h-[260px] rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute -left-14 bottom-[30%] w-[240px] h-[240px] rounded-full bg-[#F37021]/10 pointer-events-none" />

          {/* Logo / brand */}
          <div className="relative z-10" style={{ animation: mounted ? "fadeSlideL .6s .1s both" : "none" }}>
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center">
                <img src="logo.png" className="w-8 h-8 object-contain" alt="BNI Life" />
              </div>
              <div>
                <div className="text-white font-bold text-base tracking-tight font-['DM_Sans']">BNI Dashboard</div>
                <div className="text-white/50 text-[11px] mt-0.5 tracking-widest uppercase">Internal System</div>
              </div>
            </div>
          </div>

          {/* Hero text */}
          <div className="relative z-10 flex-1 flex flex-col justify-center py-12">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-1.5 bg-[#F37021]/15 border border-[#F37021]/30 rounded-full py-1.5 px-4 mb-6 self-start"
              style={{ animation: mounted ? "fadeSlideL .6s .25s both" : "none" }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-[#F37021]" />
              <span className="text-[11px] text-[#ffb380] font-semibold tracking-widest uppercase">
                Dashboard Manajemen Data BNI
              </span>
            </div>

            <h1 
              className="text-white text-5xl font-extrabold font-['Playfair_Display'] leading-[1.1] tracking-[-1.2px] mb-4"
              style={{ animation: mounted ? "fadeSlideL .6s .35s both" : "none" }}
            >
              Kelola Data<br />dengan Mudah
            </h1>

            <p 
              className="text-white/55 text-sm leading-relaxed max-w-[340px] mb-10 font-normal"
              style={{ animation: mounted ? "fadeSlideL .6s .45s both" : "none" }}
            >
              Platform terpadu untuk monitoring, analitik, dan pengelolaan data secara real-time.
            </p>

            {/* Stat cards */}
            <div 
              className="grid grid-cols-3 gap-3"
              style={{ animation: mounted ? "fadeSlideL .6s .55s both" : "none" }}
            >
              <StatCard value="98.6%" label="Uptime" />
              <StatCard value="2.4s" label="Resp. Time" />
              <StatCard value="256-bit" label="Enkripsi" />
            </div>
          </div>

          {/* Footer tag */}
          <div className="relative z-10" style={{ animation: mounted ? "fadeSlideL .6s .7s both" : "none" }}>
            <div className="flex items-center gap-2">
              <div className="w-5 h-[1px] bg-white/25" />
              <span className="text-[11px] text-white/30 tracking-widest uppercase">
                © 2026 BNI Dashboard — Internal Use Only
              </span>
            </div>
          </div>
        </div>

        {/* ── RIGHT PANEL ───── */}
        <div className="w-full md:w-[48%] flex flex-col justify-center items-center py-12 px-10 bg-[#F0F4FA] relative">
          <div className="w-full max-w-[420px] relative z-10">

            {/* Card wrapper */}
            <div 
              className="bg-white rounded-[18px] border border-[#003F87]/10 shadow-[0_2px_20px_rgba(0,63,135,0.07)] px-10 pt-10 pb-9"
              style={{ animation: mounted ? "fadeSlideR .6s .2s both" : "none" }}
            >
              {/* Top accent bar */}
              <div className="h-1 rounded-t-[18px] bg-gradient-to-r from-[#F37021] to-[#ff9a50] -mx-10 -mt-10 mb-8" />

              {/* Header */}
              <div className="mb-7">
                <h2 className="text-[28px] font-extrabold font-['Playfair_Display'] text-[#002960] tracking-[-0.8px] leading-tight mb-2">
                  Masuk ke Dashboard
                </h2>
                <p className="text-[13px] text-slate-500 leading-relaxed font-normal">
                  Gunakan kredensial internal untuk mengakses sistem.
                </p>
              </div>

              {/* Error */}
              {error && (
                <div 
                  className="flex items-start gap-2.5 bg-red-50 border border-red-600/20 rounded-lg py-2.5 px-3.5 mb-5"
                  style={{ animation: "fadeSlideU .25s ease" }}
                >
                  <div className="mt-[1px]"><IconAlert /></div>
                  <span className="text-xs text-red-600 font-medium leading-relaxed">{error}</span>
                </div>
              )}

              {/* Username */}
              <div className="mb-3.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5">
                  Username
                </label>
                <div className={`flex items-center gap-3 border-[1.5px] rounded-xl px-4 py-3 transition-all duration-200 ${
                  focusedField === "username" 
                    ? "bg-[#EEF4FF] border-[#003F87] ring-[3px] ring-[#003F87]/10" 
                    : error ? "bg-[#F8FAFC] border-red-600/30" : "bg-[#F8FAFC] border-slate-200"
                }`}>
                  <span className={`transition-colors duration-200 ${focusedField === "username" ? "text-[#003F87]" : "text-slate-300"}`}>
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
                    className="border-none bg-transparent outline-none text-[13px] text-slate-800 w-full font-normal placeholder-slate-400 caret-[#F37021] font-['DM_Sans']"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="mb-7">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] mb-1.5">
                  Password
                </label>
                <div className={`flex items-center gap-3 border-[1.5px] rounded-xl px-4 py-3 transition-all duration-200 ${
                  focusedField === "password" 
                    ? "bg-[#EEF4FF] border-[#003F87] ring-[3px] ring-[#003F87]/10" 
                    : error ? "bg-[#F8FAFC] border-red-600/30" : "bg-[#F8FAFC] border-slate-200"
                }`}>
                  <span className={`transition-colors duration-200 ${focusedField === "password" ? "text-[#003F87]" : "text-slate-300"}`}>
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
                    className="border-none bg-transparent outline-none text-[13px] text-slate-800 w-full font-normal placeholder-slate-400 caret-[#F37021] font-['DM_Sans']"
                  />
                  <button
                    onClick={() => setShowPass(v => !v)}
                    className="p-1 flex items-center text-slate-300 hover:text-slate-500 transition-colors duration-200 focus:outline-none"
                  >
                    {showPass ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`w-full py-3.5 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2.5 transition-all duration-250 tracking-[0.01em] font-['DM_Sans'] ${
                  loading 
                    ? "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed" 
                    : "bg-gradient-to-br from-[#F37021] to-[#e05800] text-white shadow-[0_6px_22px_rgba(243,112,33,0.3)] hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(243,112,33,0.4)] active:translate-y-0"
                }`}
              >
                {loading ? (
                  <>
                    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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

            {/* Security note */}
            <div 
              className="flex items-center justify-center gap-2 mt-4"
              style={{ animation: mounted ? "fadeSlideR .6s .6s both" : "none" }}
            >
              <span className="text-slate-400"><IconShield /></span>
              <span className="text-[11px] text-slate-400 tracking-[0.04em]">
                Koneksi terenkripsi 256-bit · Hanya pengguna internal
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}