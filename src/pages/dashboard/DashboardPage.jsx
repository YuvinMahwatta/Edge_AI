import { useState, useEffect } from "react";
import { Zap, Activity, Thermometer, Sun, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, BarChart, Bar } from "recharts";
import { T } from "../../constants/theme";
import { api } from "../../api";
import { powerData as mockPower, conditionDist as mockConditions, voltageData as mockVoltage, dailyPower as mockDaily } from "../../utils/mockData";
import StatCard from "../../components/common/StatCard";
import ChartCard from "../../components/common/ChartCard";
import Badge from "../../components/common/Badge";
import Btn from "../../components/common/Btn";
import CustomTooltip from "../../components/common/CustomTooltip";

const DashboardPage = ({ deviceId, liveData, systemOn, realtimeEnabled }) => {
  const [conditionData, setConditionData] = useState(mockConditions);
  const [dailyData, setDailyData] = useState(mockDaily);
  const [powerHistory, setPowerHistory] = useState(mockPower);
  const [voltageHistory, setVoltageHistory] = useState(mockVoltage);

  useEffect(() => {
    api.dashboard(deviceId)
      .then((d) => {
        if (d.condition_distribution?.length > 0) setConditionData(d.condition_distribution);
        if (d.daily_power?.length > 0) setDailyData(d.daily_power);
      })
      .catch(() => {});

    api.history(12, deviceId)
      .then((h) => {
        if (h.power?.length > 0) setPowerHistory(h.power);
        if (h.voltage?.length > 0) setVoltageHistory(h.voltage);
      })
      .catch(() => {});
  }, [deviceId]);

  return (
    <div>
      <div className="fade-in" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>Welcome back</h1>
          <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Here&apos;s how your solar system is performing today.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 20, background: systemOn ? T.greenBg : T.redBg }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: systemOn ? T.green : T.red, animation: systemOn ? "pulse 2s infinite" : "none" }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: systemOn ? T.green : T.red }}>
            {systemOn ? (realtimeEnabled ? "Realtime updates active" : "Polling backend every 5s") : "System offline"}
          </span>
        </div>
      </div>

      <div className="grid-responsive" style={{ marginBottom: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
        <StatCard icon={Zap} label="Power Output" value={liveData.power} unit="W" trend="up" trendValue="+2.4%" color={T.accent} delay={0.05} />
        <StatCard icon={Activity} label="Voltage" value={liveData.voltage} unit="V" trend="up" trendValue="+0.3V" color={T.blue} delay={0.1} />
        <StatCard icon={Zap} label="Current" value={liveData.current} unit="mA" trend="up" trendValue="+5.2mA" color={T.purple} delay={0.15} />
      </div>
      <div className="grid-2-responsive" style={{ marginBottom: 24, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
        <StatCard icon={Thermometer} label="Temperature" value={liveData.temp} unit="°C" color={T.orange} delay={0.2} />
        <StatCard icon={Sun} label="Irradiance" value={liveData.ldr1} unit="lux" trend="up" trendValue="Excellent sunlight" color={T.accentLight} delay={0.25} />
      </div>

      <div className="fade-in stagger-5" style={{ padding: "20px 24px", background: T.card, borderRadius: 16, border: `1px solid ${T.border}`, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>System Health Diagnosis</h3>
        <div style={{
          display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", flexWrap: "wrap",
          background: liveData.condition === "Normal" ? T.greenBg : T.orangeBg,
          borderRadius: 12, border: `1px solid ${liveData.condition === "Normal" ? T.green : T.orange}25`,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: liveData.condition === "Normal" ? `${T.green}20` : `${T.orange}20`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {liveData.condition === "Normal" ? <CheckCircle size={22} color={T.green} /> : <AlertTriangle size={22} color={T.orange} />}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: liveData.condition === "Normal" ? T.green : T.orange }}>
                {liveData.condition === "Normal" ? "System Operating Normally" : `${liveData.condition} Detected`}
              </span>
              <Badge color={liveData.condition === "Normal" ? T.green : T.orange}>{liveData.condition === "Normal" ? "HEALTHY" : "ATTENTION"}</Badge>
            </div>
            <p style={{ fontSize: 12.5, color: T.textMuted, marginTop: 4 }}>
              {liveData.condition === "Normal"
                ? `All parameters within expected ranges. ML model confidence: ${liveData.confidence || 0}%`
                : "Machine learning analysis indicates potential issues. Review recommended."}
            </p>
          </div>
          <Btn variant="ghost" size="sm" style={{ color: T.accent }}>View Details <ChevronRight size={14} /></Btn>
        </div>
      </div>

      <div className="grid-responsive" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginBottom: 20 }}>
        <ChartCard title="Power Output Over Time" delay={0.3}>
          <ResponsiveContainer>
            <AreaChart data={powerHistory}>
              <defs>
                <linearGradient id="pwrGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={T.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={T.border} />
              <XAxis dataKey="time" tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: T.textDim, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="value" name="Power (W)" stroke={T.accent} fill="url(#pwrGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Condition Distribution" delay={0.35}>
          <ResponsiveContainer>
            <PieChart>
              <Pie data={conditionData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" stroke="none" paddingAngle={3}>
                {conditionData.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: -8 }}>
            {conditionData.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, color: T.textMuted }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c.color }} />
                {c.name} ({c.value}%)
              </div>
            ))}
          </div>
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
              <Bar dataKey="power" name="Power (W)" fill={T.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
};

export default DashboardPage;
