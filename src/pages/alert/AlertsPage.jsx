import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { T } from "../../constants/theme";
import { api } from "../../api";
import { subscribeToDeviceAlerts } from "../../realtime";
import { alertsData as mockAlerts } from "../../utils/mockData";
import Badge from "../../components/common/Badge";
import Btn from "../../components/common/Btn";
import AlertItem from "../../components/common/AlertItem";

const AlertsPage = ({ deviceId, realtimeEnabled }) => {
  const [alerts, setAlerts] = useState([]);

  const fetchAlerts = async () => {
    try {
      const data = await api.alerts(deviceId);
      const all = [...data.active, ...data.resolved];
      setAlerts(all);
    } catch {
      // keep mock data on failure
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [deviceId]);

  useEffect(() => {
    if (!realtimeEnabled) return undefined;
    const unsubscribe = subscribeToDeviceAlerts(deviceId, (items) => {
      if (items.length > 0) setAlerts(items);
    });
    return () => unsubscribe();
  }, [deviceId, realtimeEnabled]);

  const active = useMemo(() => alerts.filter((a) => !a.resolved), [alerts]);
  const resolved = useMemo(() => alerts.filter((a) => a.resolved), [alerts]);

  const resolve = async (id) => {
    try {
      await api.resolve(id);
      if (!realtimeEnabled) {
        await fetchAlerts();
      }
    } catch {
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
    }
  };

  const clearAll = async () => {
    if (!window.confirm(`Are you sure you want to clear all ${alerts.length} alerts? This cannot be undone.`)) return;
    try {
      await api.clearAlerts(deviceId);
      setAlerts([]);
    } catch (err) {
      console.error("Failed to clear alerts:", err.message);
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: -0.5 }}>System Alerts</h1>
          <p style={{ fontSize: 13.5, color: T.textMuted, marginTop: 4 }}>Important notifications about your solar system&apos;s performance.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <Badge color={T.orange} bg={T.orangeBg}>{active.length} active alerts</Badge>
          {alerts.length > 0 && (
            <Btn variant="danger" size="sm" onClick={clearAll} style={{ gap: 6 }}>
              <Trash2 size={14} />
              Clear All ({alerts.length})
            </Btn>
          )}
        </div>
      </div>

      {active.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Active</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 32 }}>
            {active.map((a) => <AlertItem key={a.id} alert={a} onResolve={resolve} />)}
          </div>
        </>
      )}

      {resolved.length > 0 && (
        <>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: T.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Resolved</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {resolved.map((a) => <AlertItem key={a.id} alert={a} onResolve={resolve} />)}
          </div>
        </>
      )}
    </div>
  );
};

export default AlertsPage;
