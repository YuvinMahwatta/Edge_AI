import { useEffect, useMemo, useState } from "react";
import { Sun, LayoutDashboard, Activity, Bell, Settings, Users, LogOut, Menu } from "lucide-react";
import { T } from "./constants/theme";
import { api, clearToken, getToken, setToken } from "./api";
import { isFirebaseConfigured, signIntoFirebase, signOutFirebase } from "./firebase";
import { normalizeLivePayload, subscribeToDeviceAlerts, subscribeToDeviceLive } from "./realtime";

import SidebarItem from "./components/common/SidebarItem";
import LoginPage from "./pages/auth/LoginPage";
import DashboardPage from "./pages/dashboard/DashboardPage";
import MonitorPage from "./pages/sensor/MonitorPage";
import AlertsPage from "./pages/alert/AlertsPage";
import SettingsPage from "./pages/settings/SettingsPage";
import UserManagementPage from "./pages/user/UserManagementPage";

const fontLink = document.createElement("link");
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&family=Space+Mono:wght@400;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

const css = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body, #root {
    height: 100%;
    width: 100%;
    overflow: hidden;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  .slide-in { animation: slideIn 0.4s ease forwards; }
  .fade-in { animation: fadeIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
  .stagger-1 { animation-delay: 0.05s; opacity: 0; }
  .stagger-2 { animation-delay: 0.1s; opacity: 0; }
  .stagger-3 { animation-delay: 0.15s; opacity: 0; }
  .stagger-4 { animation-delay: 0.2s; opacity: 0; }
  .stagger-5 { animation-delay: 0.25s; opacity: 0; }
  .stagger-6 { animation-delay: 0.3s; opacity: 0; }
  @keyframes slideIn { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes glow { 0%, 100% { box-shadow: 0 0 5px rgba(24,111,107,0.2); } 50% { box-shadow: 0 0 20px rgba(24,111,107,0.4); } }

  @media (max-width: 1024px) {
    .login-left { display: none; }
    .sidebar { position: fixed; left: -240px; top: 0; bottom: 0; z-index: 50; }
    .sidebar.open { left: 0; }
    .mobile-header { display: flex !important; justify-content: space-between; align-items: center; padding: 0 20px; height: 60px; background: #fff; border-bottom: 1px solid #E5E7EB; position: sticky; top: 0; z-index: 40; }
    .main-content { padding: 20px !important; }
    .sidebar-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 45; backdrop-filter: blur(2px); }
  }
`;

async function fetchBackendLive(deviceId, setLiveData, setSystemOn) {
  const data = await api.live(deviceId);
  setLiveData(normalizeLivePayload(data) || data);
  setSystemOn(data.system_on);
}

export default function SunSenseAI() {
  const [page, setPage] = useState("login");
  const [activePage, setActivePage] = useState("dashboard");
  const [role, setRole] = useState("user");
  const [userName, setUserName] = useState("");
  const [systemOn, setSystemOn] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [realtimeEnabled, setRealtimeEnabled] = useState(false);
  const [activeAlertCount, setActiveAlertCount] = useState(0);

  const deviceId = useMemo(() => api.defaultDeviceId, []);

  const [liveData, setLiveData] = useState({
    device_id: deviceId,
    voltage: 0,
    current: 0,
    power: 0,
    temp: 0,
    ldr1: 0,
    ldr2: 0,
    avg_light: 0,
    light_diff: 0,
    condition: "Normal",
    confidence: 0,
    system_on: true,
  });

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetchBackendLive(deviceId, setLiveData, setSystemOn)
      .then(() => {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          setRole(payload.role || "user");
        } catch {
          setRole("user");
        }
        setPage("app");
      })
      .catch(() => {
        clearToken();
      });
  }, [deviceId]);

  useEffect(() => {
    if (page !== "app") return undefined;

    let unsubscribeLive = () => {};
    let unsubscribeAlerts = () => {};
    let intervalId = null;
    let cancelled = false;

    const enableRealtime = async () => {
      if (!isFirebaseConfigured) {
        setRealtimeEnabled(false);
        return false;
      }

      try {
        const { firebase_token } = await api.firebaseToken();
        await signIntoFirebase(firebase_token);
        if (cancelled) return false;

        unsubscribeLive = subscribeToDeviceLive(deviceId, (payload) => {
          setLiveData((prev) => ({ ...prev, ...payload }));
          setSystemOn(payload.system_on ?? true);
        });
        unsubscribeAlerts = subscribeToDeviceAlerts(deviceId, (items) => {
          setActiveAlertCount(items.filter((item) => !item.resolved).length);
        });
        setRealtimeEnabled(true);
        return true;
      } catch (error) {
        console.warn("Realtime bootstrap failed, falling back to backend polling:", error.message);
        setRealtimeEnabled(false);
        return false;
      }
    };

    const start = async () => {
      const ok = await enableRealtime();
      if (cancelled || ok) return;

      const poll = async () => {
        try {
          await fetchBackendLive(deviceId, setLiveData, setSystemOn);
          const alertData = await api.alerts(deviceId);
          setActiveAlertCount(alertData.active_count || 0);
        } catch (err) {
          console.error("Poll error:", err.message);
        }
      };

      await poll();
      intervalId = setInterval(poll, 5000);
    };

    start();

    return () => {
      cancelled = true;
      unsubscribeLive();
      unsubscribeAlerts();
      if (intervalId) clearInterval(intervalId);
    };
  }, [page, deviceId]);

  const handleLogin = async (tokenData) => {
    setToken(tokenData.access_token);
    setRole(tokenData.role);
    setUserName(tokenData.name);
    setPage("app");

    try {
      await fetchBackendLive(deviceId, setLiveData, setSystemOn);
    } catch {
      // handled by app effect fallback
    }
  };

  const handleLogout = async () => {
    clearToken();
    await signOutFirebase().catch(() => {});
    setPage("login");
    setActivePage("dashboard");
    setRealtimeEnabled(false);
    setActiveAlertCount(0);
    setLiveData({
      device_id: deviceId,
      voltage: 0,
      current: 0,
      power: 0,
      temp: 0,
      ldr1: 0,
      ldr2: 0,
      avg_light: 0,
      light_diff: 0,
      condition: "Normal",
      confidence: 0,
      system_on: true,
    });
  };

  if (page === "login") return (
    <>
      <style>{css}</style>
      <LoginPage onLogin={handleLogin} />
    </>
  );

  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { id: "monitor", icon: Activity, label: "Monitor" },
    { id: "alerts", icon: Bell, label: "Alerts", badge: activeAlertCount > 0 ? String(activeAlertCount) : "" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];
  if (role === "admin") navItems.push({ id: "users", icon: Users, label: "User Management" });

  const pageContent = {
    dashboard: <DashboardPage deviceId={deviceId} liveData={liveData} systemOn={systemOn} realtimeEnabled={realtimeEnabled} />,
    monitor: <MonitorPage deviceId={deviceId} liveData={liveData} systemOn={systemOn} setSystemOn={setSystemOn} />,
    alerts: <AlertsPage deviceId={deviceId} realtimeEnabled={realtimeEnabled} />,
    settings: <SettingsPage />,
    users: <UserManagementPage />,
  };

  return (
    <>
      <style>{css}</style>
      <div className="main-layout" style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
        <div className="mobile-header" style={{ display: "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sun size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>SunSense AI</span>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} style={{ background: "transparent", border: "none", cursor: "pointer", color: T.text }}>
            <Menu size={24} />
          </button>
        </div>

        {mobileMenuOpen && <div className="sidebar-overlay" onClick={() => setMobileMenuOpen(false)} />}

        <div className={`sidebar ${sidebarCollapsed ? "collapsed" : ""} ${mobileMenuOpen ? "open" : ""}`} style={{
          width: sidebarCollapsed ? 68 : 240, background: T.surface, borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column", flexShrink: 0, transition: "width 0.3s ease, left 0.3s ease", overflow: "hidden",
        }}>
          <div style={{ padding: sidebarCollapsed ? "20px 14px" : "20px 20px", display: "flex", alignItems: "center", gap: 12, borderBottom: `1px solid ${T.border}`, minHeight: 68 }}>
            <div onClick={() => setSidebarCollapsed(!sidebarCollapsed)} style={{
              width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, animation: "glow 3s infinite",
            }}>
              <Sun size={18} color="#fff" />
            </div>
            {!sidebarCollapsed && <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.5, whiteSpace: "nowrap" }}>SunSense AI</span>}
          </div>

          <div style={{ flex: 1, padding: sidebarCollapsed ? "16px 10px" : "16px 14px", display: "flex", flexDirection: "column", gap: 4 }}>
            {navItems.map((item) => (
              sidebarCollapsed ? (
                <button key={item.id} onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }} title={item.label} style={{
                  width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "inherit",
                  display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                  background: activePage === item.id ? T.accentGlow : "transparent",
                  color: activePage === item.id ? T.accent : T.textMuted, transition: "all 0.2s",
                }}>
                  <item.icon size={18} />
                  {item.badge && <span style={{ position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 999, background: T.red, color: "#fff", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{item.badge}</span>}
                </button>
              ) : (
                <SidebarItem key={item.id} {...item} active={activePage === item.id} onClick={() => { setActivePage(item.id); setMobileMenuOpen(false); }} />
              )
            ))}
          </div>

          <div style={{ padding: sidebarCollapsed ? "16px 10px" : "16px 14px", borderTop: `1px solid ${T.border}` }}>
            {!sidebarCollapsed ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg, ${T.accent}40, ${T.green}40)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: T.accent, flexShrink: 0 }}>
                  {role === "admin" ? "A" : "U"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName || (role === "admin" ? "Admin" : "User")}</div>
                  <div style={{ fontSize: 11, color: T.textDim }}>{realtimeEnabled ? "Realtime channel active" : "Backend polling mode"}</div>
                </div>
                <button onClick={handleLogout} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 4 }}>
                  <LogOut size={16} color={T.textDim} />
                </button>
              </div>
            ) : (
              <button onClick={handleLogout} title="Logout" style={{ width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <LogOut size={18} color={T.textDim} />
              </button>
            )}
          </div>
        </div>

        <div className="main-content" style={{ flex: 1, overflow: "auto", padding: "28px 36px", background: T.surface }}>
          <div key={activePage}>{pageContent[activePage]}</div>
        </div>
      </div>
    </>
  );
}
