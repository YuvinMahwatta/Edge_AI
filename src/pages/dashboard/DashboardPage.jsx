import { useState, useEffect } from "react";
import { Zap, Activity, Thermometer, Sun, CheckCircle, AlertTriangle, ChevronRight, Power } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, BarChart, Bar } from "recharts";
import { T } from "../../constants/theme";
import { api } from "../../api";
import { powerData as mockPower, conditionDist as mockConditions, voltageData as mockVoltage, dailyPower as mockDaily } from "../../utils/mockData";
import StatCard from "../../components/common/StatCard";
import ChartCard from "../../components/common/ChartCard";
import Badge from "../../components/common/Badge";
import Btn from "../../components/common/Btn";
import CustomTooltip from "../../components/common/CustomTooltip";

const DashboardPage = ({ deviceId, liveData, systemOn, setSystemOn, realtimeEnabled, prefs = {} }) => {
  const [conditionData, setConditionData] = useState(mockConditions);
  const [dailyData, setDailyData] = useState(mockDaily);
  const [powerHistory, setPowerHistory] = useState(mockPower);
  const [voltageHistory, setVoltageHistory] = useState(mockVoltage);

  useEffect(() => {
    api.dashboard(deviceId)
      .then((d) => {
        if (d.condition_distribution?.length > 0) setConditionData(d.condition_distribution);
        if (d.daily_power?.length > 0) {
          const scaledDaily = d.daily_power.map(dp => ({
            ...dp,
            power: prefs.energy_unit === "wh" ? Number((dp.power * 1000).toFixed(1)) : dp.power,
            expected: prefs.energy_unit === "wh" ? Number((dp.expected * 1000).toFixed(1)) : dp.expected
          }));
          setDailyData(scaledDaily);
        }
      })
      .catch(() => { });

    api.history(12, deviceId)
      .then((h) => {
        const formatTime = (pts) => pts.map(p => ({
          ...p,
          time: p.iso_time ? new Date(p.iso_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : p.time
        }));
        if (h.power?.length > 0) {
          const scaledPower = formatTime(h.power).map(p => ({
            ...p,
            value: prefs.energy_unit === "wh" ? Number((p.value * 1000).toFixed(1)) : p.value
          }));
          setPowerHistory(scaledPower);
        }
        if (h.voltage?.length > 0) setVoltageHistory(formatTime(h.voltage));
      })
      .catch(() => { });
  }, [deviceId, prefs.energy_unit]);

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
      <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Welcome back</h1>
          <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Here&apos;s how your solar system is performing today.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: systemOn ? T.greenBg : T.redBg }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: systemOn ? T.green : T.red, animation: systemOn ? "pulse 2s infinite" : "none" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: systemOn ? T.green : T.red }}>
              {systemOn ? (realtimeEnabled ? "Realtime updates active" : "Polling backend every 5s") : "System offline"}
            </span>
          </div>
          <Btn variant={systemOn ? "danger" : "success"} onClick={handlePowerToggle} style={{ gap: 8 }}>
            <Power size={16} />
            {systemOn ? "Turn OFF" : "Turn ON"}
          </Btn>
        </div>
      </div>

      <div className="fade-in" style={{ padding: "20px 24px", background: T.card, borderRadius: 16, marginBottom: 24, display: "flex", alignItems: "center", justifyContent: "space-between", border: `1px solid ${T.border}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: (liveData.condition === "Normal" ? T.green : liveData.condition === "Low Light" ? T.blue : liveData.condition === "Shadowing" ? T.orange : T.red) + "15", display: "flex", alignItems: "center", justifyContent: "center", color: liveData.condition === "Normal" ? T.green : liveData.condition === "Low Light" ? T.blue : liveData.condition === "Shadowing" ? T.orange : T.red }}>
            {liveData.condition === "Normal" ? <CheckCircle size={26} /> : <AlertTriangle size={26} />}
          </div>
          <div>
            <p style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, letterSpacing: 0.5, textTransform: "uppercase" }}>Real-Time Status</p>
            <h2 style={{ fontSize: 22, fontWeight: 700, color: T.text, marginTop: 4 }}>{liveData.condition || "Normal"}</h2>
          </div>
        </div>
      </div>

      <div className="grid-responsive" style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <StatCard 
          icon={Zap} 
          label="Power Output" 
          value={(() => {
            const p = liveData.power > 0 ? liveData.power : (liveData.voltage * liveData.current);
            return prefs.energy_unit === "wh" ? (p * 1000).toFixed(4) : p.toFixed(6);
          })()} 
          unit={prefs.energy_unit === "wh" ? "mW" : "W"} 
          trend="up" 
          trendValue="+2.4%" 
          color={T.accent} 
          delay={0.05} 
        />
        <StatCard icon={Activity} label="Voltage" value={Number(liveData.voltage).toFixed(2)} unit="V" trend="up" trendValue="+0.3V" color={T.blue} delay={0.1} />
        <StatCard icon={Zap} label="Current" value={(liveData.current * 1000).toFixed(1)} unit="mA" trend="up" trendValue="+5.2mA" color={T.purple} delay={0.15} />
      </div>
      <div className="grid-2-responsive" style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <StatCard icon={Thermometer} label="Temperature" value={prefs.temp_unit === "fahrenheit" ? ((liveData.temp * 9/5) + 32).toFixed(1) : Number(liveData.temp).toFixed(1)} unit={prefs.temp_unit === "fahrenheit" ? "°F" : "°C"} color={T.orange} delay={0.2} />
        <StatCard icon={Sun} label="Irradiance" value={liveData.ldr1 ? "Light" : "Dark"} unit="" color={T.accentLight} delay={0.25} />
      </div>

      <div className="charts-2x2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Power Output Over Time" delay={0.3}>
          <ResponsiveContainer>
            <AreaChart data={powerHistory}>
              <defs>
                <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name={prefs.energy_unit === "wh" ? "Power (mW)" : "Power (W)"} stroke={T.accent} fill="url(#pwrGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Condition Distribution" delay={0.35}>
          <ResponsiveContainer>
            <BarChart data={conditionData} layout="vertical" margin={{ left: 20, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} unit="%" />
              <YAxis type="category" dataKey="name" tick={{ fill: T.textDim, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Distribution (%)" radius={[0, 6, 6, 0]}>
                {conditionData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Voltage Trend" delay={0.4}>
          <ResponsiveContainer>
            <LineChart data={voltageHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="value" name="Voltage (V)" stroke={T.blue} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Daily Average Power" delay={0.45}>
          <ResponsiveContainer>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="day" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="power" name={prefs.energy_unit === "wh" ? "Power (mW)" : "Power (W)"} fill={T.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default DashboardPage;
