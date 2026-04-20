import { T } from "../../constants/theme";

const Input = ({ label, type = "text", value, onChange, placeholder, icon: Icon, style: s }) => (
  <div style={{ marginBottom: 18, ...s }}>
    {label && <label style={{ display: "block", fontSize: 12, fontWeight: 500, color: T.textMuted, marginBottom: 7, letterSpacing: 0.5, textTransform: "uppercase" }}>{label}</label>}
    <div style={{ position: "relative" }}>
      {Icon && <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)" }}><Icon size={16} color={T.textDim} /></div>}
      <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{
        width: "100%", padding: Icon ? "12px 14px 12px 42px" : "12px 14px", background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 10, color: T.text, fontSize: 14, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s",
      }}
        onFocus={e => e.target.style.borderColor = T.accent}
        onBlur={e => e.target.style.borderColor = T.border} />
    </div>
  </div>
);

export default Input;
