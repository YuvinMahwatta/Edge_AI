import { useState, useEffect, useCallback } from "react";
import { Activity, Zap, TrendingUp, Thermometer, Sun } from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { T } from "../../constants/theme";
import { api } from "../../api";
import ChartCard from "../../components/common/ChartCard";
import CustomTooltip from "../../components/common/CustomTooltip";

const MonitorPage = ({ deviceId, liveData, systemOn, prefs = {} }) => {
  const [ldrChartData, setLdrChartData] = useState([]);
  const [tempChartData, setTempChartData] = useState([]);

  const fetchHistory = useCallback(() => {
    api.history(12, deviceId)
      .then((h) => {
        const formatTime = (p) => p.iso_time
          ? new Date(p.iso_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : p.time;

        if (h.ldr1?.length > 0 && h.ldr2?.length > 0) {
          setLdrChartData(h.ldr1.map((d, i) => ({
            time: formatTime(d),
            ldr1: d.value,   // 0 or 1 boolean from ESP32
            ldr2: h.ldr2[i]?.value ?? 0,
          })));
        }
        if (h.temperature?.length > 0) {
          setTempChartData(h.temperature.map(d => ({ ...d, time: formatTime(d) })));
        }
      })
      .catch(() => {});
  }, [deviceId]);

  useEffect(() => {
    fetchHistory();                              // load on mount
    const interval = setInterval(fetchHistory, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchHistory]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>System Monitor</h1>
          <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Real-time sensor readings and control panel.</p>
        </div>
      </div>

      <div className="monitor-cards-3x2" style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {[
          { label: "INA219 - Voltage", value: Number(liveData.voltage).toFixed(2), unit: "V", icon: Activity, color: T.blue, desc: "Bus voltage reading" },
          { label: "INA219 - Current", value: (liveData.current * 1000).toFixed(1), unit: "mA", icon: Zap, color: T.purple, desc: "Shunt current reading" },
          { 
            label: "INA219 - Power", 
            value: (() => {
              const p = liveData.power > 0 ? liveData.power : (liveData.voltage * liveData.current);
              return prefs.energy_unit === "wh" ? (p * 1000).toFixed(4) : p.toFixed(6);
            })(),
            unit: prefs.energy_unit === "wh" ? "mW" : "W", 
            icon: TrendingUp, 
            color: T.accent, 
            desc: "Calculated power output" 
          },
          { label: "DS18B20 - Temperature", value: prefs.temp_unit === "fahrenheit" ? ((liveData.temp * 9/5) + 32).toFixed(1) : Number(liveData.temp).toFixed(1), unit: prefs.temp_unit === "fahrenheit" ? "°F" : "°C", icon: Thermometer, color: T.red, desc: "Panel surface temperature" },
          { label: "LDR 1 - Light Intensity", value: liveData.ldr1 ? "Light" : "Dark", unit: "", icon: Sun, color: T.accentLight, desc: "Light sensor zone A" },
          { label: "LDR 2 - Light Intensity", value: liveData.ldr2 ? "Light" : "Dark", unit: "", icon: Sun, color: T.orange, desc: "Light sensor zone B" },
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
        <div className="derived-cards-4" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[
            { label: "Avg Light", value: systemOn ? (liveData.avg_light >= 1 ? "Bright" : liveData.avg_light > 0 ? "Partial" : "Dark") : "--", unit: "" },
            { label: "Light Diff", value: systemOn ? (liveData.light_diff > 0 ? "Unbalanced" : "Balanced") : "--", unit: "" },
            { label: "Power / Active LDR", value: systemOn && liveData.avg_light > 0 ? (liveData.power / liveData.avg_light).toFixed(3) : "--", unit: "W" },
            { label: "Efficiency Index", value: systemOn ? (liveData.condition === "Panel Fault" ? "0.0" : liveData.condition === "Shadowing" ? "65.5" : liveData.condition === "Low Light" ? "92.4" : "98.7") : "--", unit: "%" },
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
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(v) => v === 1 ? "Light" : "Dark"}
                tick={{ fill: T.textDim, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value, name) => [value === 1 ? "Light" : "Dark", name]}
              />
              <Line type="stepAfter" dataKey="ldr1" name="LDR 1" stroke={T.accentLight} strokeWidth={2} dot={false} />
              <Line type="stepAfter" dataKey="ldr2" name="LDR 2" stroke={T.orange} strokeWidth={2} dot={false} />
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
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: T.textDim, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={40}
                tickFormatter={(v) => prefs.temp_unit === "fahrenheit" ? `${((v * 9/5) + 32).toFixed(0)}°F` : `${v}°C`}
              />
              <Tooltip
                content={<CustomTooltip />}
                formatter={(value) => [
                  prefs.temp_unit === "fahrenheit"
                    ? `${((value * 9/5) + 32).toFixed(1)}°F`
                    : `${Number(value).toFixed(1)}°C`,
                  "Temperature"
                ]}
              />
              <Area type="monotone" dataKey="value" name={prefs.temp_unit === "fahrenheit" ? "Temp (°F)" : "Temp (°C)"} stroke={T.red} fill="url(#tempGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default MonitorPage;
