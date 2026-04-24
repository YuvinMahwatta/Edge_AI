const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const DEFAULT_DEVICE_ID = import.meta.env.VITE_DEFAULT_DEVICE_ID || "device-001";

let _token = localStorage.getItem("sunsense_token");

export function setToken(t) {
  _token = t;
  localStorage.setItem("sunsense_token", t);
}

export function clearToken() {
  _token = null;
  localStorage.removeItem("sunsense_token");
}

export function getToken() {
  return _token;
}

function withDevice(path, deviceId = DEFAULT_DEVICE_ID) {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}device_id=${encodeURIComponent(deviceId)}`;
}

async function request(path, opts = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (_token) {
    headers.Authorization = `Bearer ${_token}`;
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401) {
    clearToken();
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }

  return res.json();
}

export const api = {
  defaultDeviceId: DEFAULT_DEVICE_ID,

  login: (email, password) =>
    request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),

  signup: (name, email, password) =>
    request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  firebaseToken: () => request("/auth/firebase-token", { method: "POST" }),

  dashboard: (deviceId = DEFAULT_DEVICE_ID) => request(withDevice("/dashboard", deviceId)),

  live: (deviceId = DEFAULT_DEVICE_ID) => request(withDevice("/monitor/live", deviceId)),

  derived: (deviceId = DEFAULT_DEVICE_ID) => request(withDevice("/monitor/derived", deviceId)),

  history: (hours = 12, deviceId = DEFAULT_DEVICE_ID) =>
    request(withDevice(`/monitor/history?hours=${hours}`, deviceId)),

  setPower: (is_on, deviceId = DEFAULT_DEVICE_ID) =>
    request(`/monitor/devices/${encodeURIComponent(deviceId)}/power`, {
      method: "POST",
      body: JSON.stringify({ is_on }),
    }),

  alerts: (deviceId = DEFAULT_DEVICE_ID) => request(withDevice("/alerts", deviceId)),

  resolve: (id) => request(`/alerts/${id}/resolve`, { method: "PATCH" }),

  clearAlerts: (deviceId = DEFAULT_DEVICE_ID) =>
    request(withDevice("/alerts/clear", deviceId), { method: "DELETE" }),

  settings: () => request("/settings"),

  updatePrefs: (data) =>
    request("/settings/preferences", { method: "PATCH", body: JSON.stringify(data) }),

  users: (search = "") => request(`/users?search=${encodeURIComponent(search)}`),

  addUser: (data) => request("/users", { method: "POST", body: JSON.stringify(data) }),

  updateUser: (id, data) => request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  deleteUser: (id) => request(`/users/${id}`, { method: "DELETE" }),
};
