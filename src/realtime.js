import { onValue, ref } from "firebase/database";
import { database, isFirebaseConfigured } from "./firebase";

function humanizeTime(value) {
  if (!value) return "Just now";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return String(value);

  const diffMs = Date.now() - dt.getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return dt.toLocaleString();
}

function normalizeAlertMap(value) {
  if (!value || typeof value !== "object") return [];
  return Object.values(value)
    .map((alert) => ({
      id: alert.id,
      device_id: alert.device_id,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      desc: alert.description || alert.desc,
      resolved: Boolean(alert.resolved),
      created_at: alert.created_at || null,
      time: humanizeTime(alert.created_at || alert.time),
    }))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
}

export function normalizeLivePayload(payload) {
  if (!payload) return null;
  return {
    device_id: payload.device_id,
    voltage: payload.voltage ?? 0,
    current: payload.current ?? 0,
    power: payload.power ?? 0,
    temp: payload.temp ?? payload.temperature ?? 0,
    ldr1: payload.ldr1 ?? 0,
    ldr2: payload.ldr2 ?? 0,
    avg_light: payload.avg_light ?? 0,
    light_diff: payload.light_diff ?? 0,
    condition: payload.condition ?? "Normal",
    confidence: payload.confidence ?? 0,
    system_on: payload.system_on ?? true,
    recorded_at: payload.recorded_at ?? null,
  };
}

export function subscribeToDeviceLive(deviceId, onData) {
  if (!isFirebaseConfigured || !database) return () => {};
  const liveRef = ref(database, `devices/${deviceId}/live`);
  return onValue(liveRef, (snapshot) => {
    if (!snapshot.exists()) return;
    onData(normalizeLivePayload(snapshot.val()));
  });
}

export function subscribeToDeviceAlerts(deviceId, onData) {
  if (!isFirebaseConfigured || !database) return () => {};
  const alertsRef = ref(database, `devices/${deviceId}/alerts`);
  return onValue(alertsRef, (snapshot) => {
    onData(normalizeAlertMap(snapshot.val()));
  });
}
