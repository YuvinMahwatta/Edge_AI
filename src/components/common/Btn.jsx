import { T } from "../../constants/theme";

const Btn = ({ children, variant = "primary", size = "md", onClick, style: s, ...props }) => {
  const base = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, borderRadius: 10, transition: "all 0.2s", letterSpacing: 0.3 };
  const sizes = { sm: { padding: "7px 14px", fontSize: 12 }, md: { padding: "10px 20px", fontSize: 13 }, lg: { padding: "13px 28px", fontSize: 14 } };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${T.accent}, ${T.accentDark})`, color: "#FFF" },
    secondary: { background: T.card, color: T.text, border: `1px solid ${T.border}` },
    danger: { background: T.redBg, color: T.red },
    ghost: { background: "transparent", color: T.textMuted },
    success: { background: T.greenBg, color: T.green },
  };
  return <button style={{ ...base, ...sizes[size], ...variants[variant], ...s }} onClick={onClick} {...props}>{children}</button>;
};

export default Btn;
