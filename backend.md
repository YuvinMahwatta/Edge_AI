# SunSense AI — Backend

FastAPI + PostgreSQL backend for the Solar Panel Health Monitoring System.

## Directory Structure

```
sunsense-backend/
├── app/
│   ├── main.py                 # FastAPI app, CORS, router registration, startup seed
│   ├── config.py               # Pydantic settings (reads .env)
│   ├── database.py             # Async SQLAlchemy engine + session
│   ├── models/
│   │   ├── user.py             # User (login, roles, user management)
│   │   ├── sensor_reading.py   # SensorReading (INA219, DS18B20, LDRs, ML result)
│   │   ├── alert.py            # Alert (type, severity, resolved state)
│   │   └── system_state.py     # SystemState (ON/OFF) + UserPreference (settings)
│   ├── schemas/
│   │   ├── auth.py             # Login/Signup request & token response
│   │   ├── user.py             # User CRUD shapes
│   │   ├── sensor.py           # ESP32 ingest, live data, history
│   │   ├── alert.py            # Alert list response
│   │   ├── dashboard.py        # Aggregated dashboard response
│   │   └── settings.py         # Preferences, device info, sensor status
│   ├── routers/
│   │   ├── auth.py             # POST /api/auth/login, /api/auth/signup
│   │   ├── dashboard.py        # GET  /api/dashboard
│   │   ├── monitor.py          # GET  /api/monitor/live, /history, POST /system-power
│   │   ├── alerts.py           # GET  /api/alerts, PATCH /api/alerts/:id/resolve
│   │   ├── settings.py         # GET  /api/settings, PATCH /api/settings/preferences
│   │   ├── users.py            # GET/POST/PATCH/DELETE /api/users (admin only)
│   │   └── esp32.py            # POST /api/esp32/ingest (device endpoint)
│   ├── services/
│   │   ├── auth_service.py     # Password hashing, JWT generation
│   │   ├── sensor_service.py   # Store/query readings, condition stats, daily power
│   │   ├── alert_service.py    # Auto-generate alerts from conditions, resolve
│   │   └── ml_service.py       # Rule-based fault classifier (server-side fallback)
│   └── utils/
│       ├── security.py         # bcrypt + JWT helpers
│       └── deps.py             # get_current_user, require_admin, verify_esp32_key
├── alembic/
│   └── env.py                  # Async Alembic migration runner
├── alembic.ini
├── requirements.txt
└── .env.example
```

---

## Setup

### 1. PostgreSQL

```bash
# Create the database
psql -U postgres -c "CREATE DATABASE sunsense;"
```

### 2. Environment

```bash
cd sunsense-backend
cp .env.example .env
# Edit .env — set your DATABASE_URL, SECRET_KEY, etc.
```

### 3. Python dependencies

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

On first start, the app will:
- Auto-create all database tables
- Seed a default admin account: `admin@sunsense.ai` / `admin123`
- Create the system state row (ON by default)

API docs: http://localhost:8000/docs

---

## API → Frontend Mapping

| Frontend Page      | API Endpoint                              | Method | Auth     |
|--------------------|-------------------------------------------|--------|----------|
| LoginPage          | `/api/auth/login`                         | POST   | No       |
| LoginPage (signup) | `/api/auth/signup`                        | POST   | No       |
| DashboardPage      | `/api/dashboard`                          | GET    | Bearer   |
| MonitorPage (live) | `/api/monitor/live`                       | GET    | Bearer   |
| MonitorPage (derived)| `/api/monitor/derived`                  | GET    | Bearer   |
| MonitorPage (history)| `/api/monitor/history?hours=12`         | GET    | Bearer   |
| MonitorPage (ON/OFF) | `/api/monitor/system-power`             | POST   | Bearer   |
| AlertsPage         | `/api/alerts`                             | GET    | Bearer   |
| AlertsPage (resolve)| `/api/alerts/{id}/resolve`               | PATCH  | Bearer   |
| SettingsPage       | `/api/settings`                           | GET    | Bearer   |
| SettingsPage (save)| `/api/settings/preferences`               | PATCH  | Bearer   |
| UserManagement     | `/api/users`                              | GET    | Admin    |
| UserManagement     | `/api/users`                              | POST   | Admin    |
| UserManagement     | `/api/users/{id}`                         | PATCH  | Admin    |
| UserManagement     | `/api/users/{id}`                         | DELETE | Admin    |
| ESP32 Device       | `/api/esp32/ingest`                       | POST   | API Key  |

---

## Connecting the Frontend

### Step 1 — Create an API helper in the React project

Create `src/api.ts`:

```typescript
const API = "http://localhost:8000/api";

let token: string | null = null;

export function setToken(t: string) { token = t; }
export function clearToken()        { token = null; }

async function request(path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string> || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  // Auth
  login:    (email: string, password: string) =>
              request("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  signup:   (name: string, email: string, password: string) =>
              request("/auth/signup", { method: "POST", body: JSON.stringify({ name, email, password }) }),

  // Dashboard
  dashboard: () => request("/dashboard"),

  // Monitor
  live:       () => request("/monitor/live"),
  derived:    () => request("/monitor/derived"),
  history:    (hours = 12) => request(`/monitor/history?hours=${hours}`),
  setPower:   (is_on: boolean) =>
                request("/monitor/system-power", { method: "POST", body: JSON.stringify({ is_on }) }),

  // Alerts
  alerts:     () => request("/alerts"),
  resolve:    (id: string) => request(`/alerts/${id}/resolve`, { method: "PATCH" }),

  // Settings
  settings:   () => request("/settings"),
  updatePrefs:(data: Record<string, any>) =>
                request("/settings/preferences", { method: "PATCH", body: JSON.stringify(data) }),

  // Users (admin)
  users:      (search = "") => request(`/users?search=${search}`),
  addUser:    (data: { name: string; email: string; password: string; role: string }) =>
                request("/users", { method: "POST", body: JSON.stringify(data) }),
  updateUser: (id: string, data: Record<string, any>) =>
                request(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  deleteUser: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
};
```

### Step 2 — Replace mock data in each page

**LoginPage** — replace the `onLogin` handler:
```typescript
import { api, setToken } from "../api";

const handleLogin = async () => {
  const res = await api.login(email, password);
  setToken(res.access_token);
  onLogin(res.role);  // "admin" or "user"
};
```

**DashboardPage** — replace static `liveData` with polling:
```typescript
useEffect(() => {
  const poll = async () => {
    const data = await api.dashboard();
    setLiveData(data);  // shape already matches
  };
  poll();
  const iv = setInterval(poll, 5000);
  return () => clearInterval(iv);
}, []);
```

**MonitorPage** — replace system ON/OFF toggle:
```typescript
const togglePower = async () => {
  await api.setPower(!systemOn);
  setSystemOn(!systemOn);
};
```

**AlertsPage** — fetch + resolve:
```typescript
useEffect(() => { api.alerts().then(setAlerts); }, []);
const resolve = async (id) => { await api.resolve(id); /* re-fetch */ };
```

**SettingsPage** — fetch prefs and save:
```typescript
useEffect(() => { api.settings().then(d => setPrefs(d.preferences)); }, []);
const save = async (field, value) => { await api.updatePrefs({ [field]: value }); };
```

**UserManagement** — full CRUD:
```typescript
useEffect(() => { api.users(search).then(d => setUsers(d.users)); }, [search]);
const addUser = async () => { await api.addUser(newUser); /* re-fetch */ };
const deleteUser = async (id) => { await api.deleteUser(id); /* re-fetch */ };
```

### Step 3 — CORS

The backend already allows `http://localhost:3000` and `http://localhost:5173`.
If your React dev server runs on a different port, add it to `CORS_ORIGINS` in `.env`.

---

## ESP32 Integration

The ESP32 posts to `POST /api/esp32/ingest` with header `X-Api-Key: <your-device-key>`:

```json
{
  "voltage": 5.12,
  "current": 168,
  "power": 0.86,
  "temperature": 38.4,
  "ldr1": 842,
  "ldr2": 810,
  "condition": "Normal",
  "confidence": 94.7
}
```

If `condition` is `"Normal"` with `confidence: 0`, the server runs its own
rule-based classifier as a fallback. If an abnormal condition is detected,
an alert is auto-created in the database.
