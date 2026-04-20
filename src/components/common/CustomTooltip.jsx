import { T } from "../../constants/theme";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 14px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" }}>
      <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ fontSize: 13, fontWeight: 600, color: p.color, fontFamily: "'Space Mono', monospace" }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default CustomTooltip;
