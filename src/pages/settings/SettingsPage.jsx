import { useState, useEffect } from "react";
import { Bell, Eye, Shield, Settings as SettingsIcon } from "lucide-react";
import { T } from "../../constants/theme";
import { api } from "../../api";
import Toggle from "../../components/common/Toggle";
import Badge from "../../components/common/Badge";

const SettingsPage = () => {
  const [emailNotif, setEmailNotif] = useState(true);
  const [realtimeAlerts, setRealtimeAlerts] = useState(true);
  const [weeklySummary, setWeeklySummary] = useState(false);
  const [tempUnit, setTempUnit] = useState("celsius");
  const [energyUnit, setEnergyUnit] = useState("kw");
  const [refreshRate, setRefreshRate] = useState("5");
  const [device, setDevice] = useState({ edge_device: "ESP-WROOM-32 (NodeMCU)", firmware: "v2.1.4-tflite", ml_model: "TFLite Fault Classifier v3", wifi_status: "Connected", uptime: "N/A" });
  const [sensors, setSensors] = useState([
    { name: "INA219 (V/I/P)", status: "Calibrated", ok: true },
    { name: "DS18B20 (Temp)", status: "Calibrated", ok: true },
    { name: "LDR Sensor 1", status: "Active", ok: true },
    { name: "LDR Sensor 2", status: "Active", ok: true },
    { name: "Voltage Divider", status: "Active", ok: true },
  ]);

  useEffect(() => {
    api.settings()
      .then((d) => {
        setEmailNotif(d.preferences.email_notifications);
        setRealtimeAlerts(d.preferences.realtime_alerts);
        setWeeklySummary(d.preferences.weekly_summary);
        setTempUnit(d.preferences.temp_unit);
        setEnergyUnit(d.preferences.energy_unit);
        setRefreshRate(String(d.preferences.refresh_rate));
        setDevice(d.device);
        setSensors(d.sensors);
      })
      .catch(() => {});
  }, []);

  const savePref = (key, value) => {
    api.updatePrefs({ [key]: value }).catch(() => {});
  };

  const handleEmailNotif = (v) => { setEmailNotif(v); savePref("email_notifications", v); };
  const handleRealtimeAlerts = (v) => { setRealtimeAlerts(v); savePref("realtime_alerts", v); };
  const handleWeeklySummary = (v) => { setWeeklySummary(v); savePref("weekly_summary", v); };
  const handleTempUnit = (v) => { setTempUnit(v); savePref("temp_unit", v); };
  const handleEnergyUnit = (v) => { setEnergyUnit(v); savePref("energy_unit", v); };
  const handleRefreshRate = (v) => { setRefreshRate(v); savePref("refresh_rate", parseInt(v)); };

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Settings</h1>
        <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Configure your SunSense AI system preferences.</p>
      </div>

      <div className="grid-2-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        {/* Notification Preferences */}
        <div className="fade-in" style={{ background: T.card, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.orangeBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bell size={18} color={T.orange} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Notification Preferences</h3>
              <p style={{ fontSize: 12, color: T.textMuted }}>Manage how you receive alerts about your system.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <Toggle checked={emailNotif} onChange={handleEmailNotif} label="Email Notifications" />
              <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>Receive daily reports and critical alerts via email.</p>
            </div>
            <div>
              <Toggle checked={realtimeAlerts} onChange={handleRealtimeAlerts} label="Real-time Alerts" />
              <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>Push notifications for immediate fault detection.</p>
            </div>
            <div>
              <Toggle checked={weeklySummary} onChange={handleWeeklySummary} label="Weekly Summary" />
              <p style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>Get a weekly digest of system performance via email.</p>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="fade-in stagger-1" style={{ background: T.card, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.blueBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Eye size={18} color={T.blue} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Display Preferences</h3>
              <p style={{ fontSize: 12, color: T.textMuted }}>Customize your dashboard appearance.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, color: T.text, marginBottom: 8 }}>Temperature Unit</label>
              <div style={{ display: "flex", gap: 8 }}>
                {["celsius", "fahrenheit"].map(u => (
                  <button key={u} onClick={() => handleTempUnit(u)} style={{
                    flex: 1, padding: "10px 16px", borderRadius: 8, border: `1px solid ${tempUnit === u ? T.accent : T.border}`,
                    background: tempUnit === u ? T.accentGlow : "transparent", color: tempUnit === u ? T.accent : T.textMuted,
                    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    {u === "celsius" ? "°C (Celsius)" : "°F (Fahrenheit)"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: T.text, marginBottom: 8 }}>Energy Unit</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["kw", "kW (Kilowatts)"], ["wh", "Wh (Watt-hours)"]].map(([v, l]) => (
                  <button key={v} onClick={() => handleEnergyUnit(v)} style={{
                    flex: 1, padding: "10px 16px", borderRadius: 8, border: `1px solid ${energyUnit === v ? T.accent : T.border}`,
                    background: energyUnit === v ? T.accentGlow : "transparent", color: energyUnit === v ? T.accent : T.textMuted,
                    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, color: T.text, marginBottom: 8 }}>Data Refresh Rate</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["2", "2s"], ["5", "5s"], ["10", "10s"], ["30", "30s"]].map(([v, l]) => (
                  <button key={v} onClick={() => handleRefreshRate(v)} style={{
                    flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${refreshRate === v ? T.accent : T.border}`,
                    background: refreshRate === v ? T.accentGlow : "transparent", color: refreshRate === v ? T.accent : T.textMuted,
                    fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s",
                  }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Device Info */}
        <div className="fade-in stagger-2" style={{ background: T.card, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={18} color={T.green} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Device Information</h3>
              <p style={{ fontSize: 12, color: T.textMuted }}>ESP32 edge device and sensor configuration.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              ["Edge Device", device.edge_device],
              ["Firmware", device.firmware],
              ["ML Model", device.ml_model],
              ["WiFi Status", device.wifi_status],
              ["Uptime", device.uptime],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.textMuted }}>{k}</span>
                <span style={{ fontSize: 13, fontWeight: 500, fontFamily: "'Space Mono', monospace", color: T.text }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Sensor Calibration */}
        <div className="fade-in stagger-3" style={{ background: T.card, borderRadius: 16, padding: 28, border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${T.purple}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <SettingsIcon size={18} color={T.purple} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 600 }}>Sensor Configuration</h3>
              <p style={{ fontSize: 12, color: T.textMuted }}>Connected sensor status and calibration.</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sensors.map((s) => (
              <div key={s.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${T.border}` }}>
                <span style={{ fontSize: 13, color: T.textMuted }}>{s.name}</span>
                <Badge color={s.ok ? T.green : T.red}>{s.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
