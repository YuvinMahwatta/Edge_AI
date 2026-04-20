import { XCircle, AlertTriangle, Activity, CheckCircle } from "lucide-react";
import { T } from "../../constants/theme";
import Badge from "./Badge";
import Btn from "./Btn";

const AlertItem = ({ alert, onResolve }) => {
  const colors = { danger: T.red, warning: T.orange, info: T.blue, success: T.green };
  const c = colors[alert.type] || T.textMuted;
  const icons = { danger: XCircle, warning: AlertTriangle, info: Activity, success: CheckCircle };
  const Ic = icons[alert.type] || Activity;
  return (
    <div className="fade-in" style={{
      display: "flex", gap: 16, padding: "18px 20px", background: alert.resolved ? `${T.surface}` : T.card,
      borderRadius: 14, border: `1px solid ${alert.resolved ? T.border : c}30`, position: "relative",
      opacity: alert.resolved ? 0.6 : 1, transition: "all 0.3s",
      borderLeft: `3px solid ${c}`,
    }}>
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${c}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ic size={18} color={c} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>{alert.title}</span>
          <Badge color={c}>{alert.severity}</Badge>
        </div>
        <p style={{ fontSize: 13, color: T.textMuted, lineHeight: 1.5, marginBottom: 6 }}>{alert.desc}</p>
        <span style={{ fontSize: 11, color: T.textDim }}>{alert.time}</span>
      </div>
      {!alert.resolved && (
        <Btn variant="secondary" size="sm" onClick={() => onResolve(alert.id)} style={{ alignSelf: "center", flexShrink: 0, borderColor: c, color: c }}>
          Mark Resolved
        </Btn>
      )}
    </div>
  );
};

export default AlertItem;
