import { T } from "../../constants/theme";

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }) => (
  <button onClick={onClick} style={{
    display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "11px 16px", border: "none",
    borderRadius: 10, cursor: "pointer", fontSize: 13.5, fontWeight: active ? 600 : 400, fontFamily: "inherit",
    color: active ? T.accent : T.textMuted, background: active ? T.accentGlow : "transparent",
    transition: "all 0.2s", position: "relative",
  }}
    onMouseEnter={e => { if (!active) e.currentTarget.style.background = `${T.surface}`; }}
    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
    <Icon size={18} />
    <span>{label}</span>
    {badge && <span style={{ marginLeft: "auto", background: T.red, color: "#fff", fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 10, minWidth: 20, textAlign: "center" }}>{badge}</span>}
  </button>
);

export default SidebarItem;
