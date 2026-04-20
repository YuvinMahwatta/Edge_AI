import { T } from "../../constants/theme";

const Badge = ({ children, color = T.accent, bg }) => (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: 0.5, color, background: bg || `${color}18`, textTransform: "uppercase" }}>{children}</span>
);

export default Badge;
