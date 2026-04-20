import { ArrowUp, ArrowDown } from "lucide-react";
import { T } from "../../constants/theme";

const StatCard = ({ icon: Icon, label, value, unit, trend, trendValue, color = T.accent, delay = 0 }) => (
  <div className="fade-in" style={{ animationDelay: `${delay}s`, opacity: 0, background: T.card, borderRadius: 16, padding: "22px 24px", border: `1px solid ${T.border}`, position: "relative", overflow: "hidden", transition: "all 0.3s", cursor: "default" }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = "translateY(-2px)"; }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.transform = "translateY(0)"; }}>
    <div style={{ position: "absolute", top: 0, right: 0, width: 100, height: 100, background: `radial-gradient(circle at top right, ${color}10, transparent)` }} />
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={color} />
      </div>
      <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</span>
    </div>
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ fontSize: 32, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: T.text, lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: 14, color: T.textMuted, fontWeight: 500 }}>{unit}</span>
    </div>
    {trend !== undefined && (
      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, fontSize: 12, fontWeight: 600, color: trend === "up" ? T.green : T.red }}>
        {trend === "up" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
        <span>{trendValue}</span>
      </div>
    )}
  </div>
);

export default StatCard;
