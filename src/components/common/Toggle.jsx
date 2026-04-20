import { T } from "../../constants/theme";

const Toggle = ({ checked, onChange, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    {label && <span style={{ fontSize: 13.5, color: T.text }}>{label}</span>}
    <div onClick={() => onChange(!checked)} style={{
      width: 44, height: 24, borderRadius: 12, background: checked ? T.accent : T.border,
      cursor: "pointer", transition: "all 0.3s", position: "relative", flexShrink: 0
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: checked ? 23 : 3, transition: "all 0.3s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.3)"
      }} />
    </div>
  </div>
);

export default Toggle;
