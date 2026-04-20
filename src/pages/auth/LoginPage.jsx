import { useState } from "react";
import { Sun, ChevronRight } from "lucide-react";
import { T } from "../../constants/theme";
import { api } from "../../api";
import Btn from "../../components/common/Btn";
import Input from "../../components/common/Input";

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !pass) { setError("Please fill in all fields."); return; }
    if (isSignUp && !name) { setError("Please enter your name."); return; }

    setLoading(true);
    try {
      let res;
      if (isSignUp) {
        res = await api.signup(name, email, pass);
      } else {
        res = await api.login(email, pass);
      }
      onLogin(res); // { access_token, token_type, role, name }
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="login-container" style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* Left Panel */}
      <div className="login-left" style={{
        flex: 1,
        padding: 48,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        backgroundImage: `url("https://images.unsplash.com/photo-1567778277100-e6b304ccaca8?q=80&w=1200&auto=format&fit=crop")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        overflow: "hidden"
      }}>
        {/* Darkening Overlay for UX/Readability */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to right, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
          zIndex: 0
        }} />

        {/* Subtle Texture Layer */}
        <div style={{
          position: "absolute",
          inset: 0,
          opacity: 0.05,
          backgroundImage: "radial-gradient(#fff 0.5px, transparent 0.5px)",
          backgroundSize: "12px 12px",
          zIndex: 0
        }} />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 48 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sun size={22} color="#fff" />
            </div>
            <span style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: -0.5 }}>SunSense AI</span>
          </div>

          <h1 className="fade-in" style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 700, color: "#fff", lineHeight: 1.15, marginBottom: 20, letterSpacing: -1 }}>
            Smart solar panel<br />
            <span style={{ color: "#4FD1C5" }}>monitoring.</span>
          </h1>
          <p className="fade-in stagger-1" style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", lineHeight: 1.7, maxWidth: 420 }}>
            Real-time tracking, AI fault detection, and efficiency optimization. Powered by Edge AI on ESP32.
          </p>

          <div className="fade-in stagger-3" style={{ display: "flex", gap: 32, marginTop: 48, flexWrap: "wrap" }}>
            {[["5+", "Sensors"], ["< 2s", "Detection"], ["99.2%", "Accuracy"]].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 26, fontWeight: 700, color: "#4FD1C5", fontFamily: "'Space Mono', monospace" }}>{v}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4, textTransform: "uppercase", letterSpacing: 1 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="login-right" style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
        <div style={{ width: "100%", maxWidth: 400 }}>
          <h2 className="fade-in" style={{ fontSize: 26, fontWeight: 700, marginBottom: 8 }}>
            {isSignUp ? "Create Account" : "Welcome to SunSense AI"}
          </h2>
          <p className="fade-in stagger-1" style={{ fontSize: 13.5, color: T.textMuted, marginBottom: 36 }}>
            {isSignUp ? "Sign up to start monitoring your solar panels" : "Login to monitor your solar panel system"}
          </p>

          {error && (
            <div style={{ padding: "10px 14px", background: T.redBg, border: `1px solid ${T.red}30`, borderRadius: 8, marginBottom: 16, fontSize: 13, color: T.red }}>
              {error}
            </div>
          )}

          <div className="fade-in stagger-2" onKeyDown={handleKeyDown}>
            {isSignUp && <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" />}
            <Input label="Email Address" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" />
            <Input label="Password" type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" />
          </div>

          <Btn variant="primary" size="lg" onClick={handleSubmit}
            style={{ width: "100%", marginTop: 8, borderRadius: 12, height: 48, fontSize: 15, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "#fff", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Please wait..." : (isSignUp ? "Create Account" : "Login to Dashboard")} {!loading && <ChevronRight size={18} />}
          </Btn>

          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: T.textMuted }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span onClick={() => { setIsSignUp(!isSignUp); setError(""); }} style={{ color: T.accent, cursor: "pointer", fontWeight: 600 }}>
              {isSignUp ? "Sign in" : "Sign up"}
            </span>
          </p>

          <div style={{ marginTop: 32, padding: "14px 16px", background: T.card, borderRadius: 10, border: `1px solid ${T.border}`, fontSize: 12, color: T.textDim }}>
            <strong style={{ color: T.textMuted }}>Default admin:</strong> admin@sunsense.ai / admin123
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
