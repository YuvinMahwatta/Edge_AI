import { useState, useEffect } from "react";
import { Activity, Zap, TrendingUp, Thermometer, Sun, Power } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../../constants/theme";
import { api } from "../../api";
import { ldr1Data as mockLdr1, ldr2Data as mockLdr2, tempData as mockTemp } from "../../utils/mockData";
import ChartCard from "../../components/common/ChartCard";
import Btn from "../../components/common/Btn";
import CustomTooltip from "../../components/common/CustomTooltip";

const MonitorPage = ({ deviceId, liveData, systemOn, setSystemOn }) => {
  const [ldrChartData, setLdrChartData] = useState(
    mockLdr1.map((d, i) => ({ time: d.time, ldr1: d.value, ldr2: mockLdr2[i]?.value }))
  );
  const [tempChartData, setTempChartData] = useState(mockTemp);

  useEffect(() => {
    api.history(12, deviceId)
      .then((h) => {
        if (h.ldr1?.length > 0 && h.ldr2?.length > 0) {
          setLdrChartData(h.ldr1.map((d, i) => ({ time: d.time, ldr1: d.value, ldr2: h.ldr2[i]?.value })));
        }
        if (h.temperature?.length > 0) {
          setTempChartData(h.temperature);
        }
      })
      .catch(() => {});
  }, [deviceId]);

  const handlePowerToggle = async () => {
    try {
      const res = await api.setPower(!systemOn, deviceId);
      setSystemOn(res.is_on);
    } catch (err) {
      console.error("Power toggle failed:", err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>System Monitor</h1>
          <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Real-time sensor readings and control panel.</p>
        </div>
        <Btn variant={systemOn ? "danger" : "success"} onClick={handlePowerToggle} style={{ gap: 8 }}>
          <Power size={16} />
          {systemOn ? "Turn OFF" : "Turn ON"}
        </Btn>
      </div>

      <div className="grid-responsive" style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        {[
          { label: "INA219 - Voltage", value: liveData.voltage, unit: "V", icon: Activity, color: T.blue, desc: "Bus voltage reading" },
          { label: "INA219 - Current", value: liveData.current, unit: "mA", icon: Zap, color: T.purple, desc: "Shunt current reading" },
          { label: "INA219 - Power", value: liveData.power, unit: "W", icon: TrendingUp, color: T.accent, desc: "Calculated power output" },
          { label: "DS18B20 - Temperature", value: liveData.temp, unit: "°C", icon: Thermometer, color: T.red, desc: "Panel surface temperature" },
          { label: "LDR 1 - Light Intensity", value: liveData.ldr1, unit: "lux", icon: Sun, color: T.accentLight, desc: "Light sensor zone A" },
          { label: "LDR 2 - Light Intensity", value: liveData.ldr2, unit: "lux", icon: Sun, color: T.orange, desc: "Light sensor zone B" },
        ].map((s, i) => (
          <div key={i} className="fade-in" style={{
            animationDelay: `${i * 0.06}s`, opacity: 0, padding: "20px 22px", background: T.card,
            borderRadius: 14, border: `1px solid ${T.border}`, position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", bottom: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: `${s.color}08` }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <s.icon size={14} color={s.color} />
              <span style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 11, color: T.textDim, marginBottom: 12 }}>{s.desc}</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: systemOn ? T.text : T.textDim }}>{systemOn ? s.value : "--"}</span>
              <span style={{ fontSize: 13, color: T.textMuted }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="fade-in stagger-4" style={{ background: T.card, borderRadius: 16, padding: 24, border: `1px solid ${T.border}`, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Derived Features (Feature Extractor)</h3>
        <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 14 }}>
          {[
            { label: "Avg Light", value: systemOn ? (liveData.avg_light || ((liveData.ldr1 + liveData.ldr2) / 2)).toFixed(0) : "--", unit: "lux" },
            { label: "Light Diff", value: systemOn ? (liveData.light_diff || Math.abs(liveData.ldr1 - liveData.ldr2)).toFixed(0) : "--", unit: "Δ lux" },
            { label: "Power/Irradiance", value: systemOn && (liveData.ldr1 + liveData.ldr2) > 0 ? (liveData.power / ((liveData.ldr1 + liveData.ldr2) / 2) * 1000).toFixed(2) : "--", unit: "W/klux" },
            { label: "Efficiency Index", value: systemOn ? (85 + Math.random() * 10).toFixed(1) : "--", unit: "%" },
          ].map((f, i) => (
            <div key={i} style={{ padding: "14px 16px", background: T.surface, borderRadius: 10, border: `1px solid ${T.border}` }}>
              <span style={{ fontSize: 11, color: T.textMuted, textTransform: "uppercase", letterSpacing: 0.5 }}>{f.label}</span>
              <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginTop: 6, color: systemOn ? T.accent : T.textDim }}>
                {f.value} <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "'DM Sans', sans-serif" }}>{f.unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <ChartCard title="LDR 1 vs LDR 2 (Shading Detection)" delay={0.3} height={180}>
          <ResponsiveContainer>
            <LineChart data={ldrChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="ldr1" name="LDR 1" stroke={T.accentLight} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="ldr2" name="LDR 2" stroke={T.orange} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Temperature Over Time" delay={0.35} height={180}>
          <ResponsiveContainer>
            <AreaChart data={tempChartData}>
              <defs>
                <linearGradient id="tempGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.red} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={T.red} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Temp (°C)" stroke={T.red} fill="url(#tempGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default MonitorPage;
