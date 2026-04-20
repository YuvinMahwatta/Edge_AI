import { T } from "../../constants/theme";

const ChartCard = ({ title, children, delay = 0, height = 200 }) => (
  <div className="fade-in" style={{ animationDelay: `${delay}s`, opacity: 0, background: T.card, borderRadius: 16, padding: 24, border: `1px solid ${T.border}` }}>
    <h3 style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 20, letterSpacing: 0.3 }}>{title}</h3>
    <div style={{ height }}>{children}</div>
  </div>
);

export default ChartCard;
