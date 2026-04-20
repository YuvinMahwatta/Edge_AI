import { T } from "../constants/theme";

export const genTimeSeries = (points, base, variance, trend = 0) =>
  Array.from({ length: points }, (_, i) => ({
    time: `${String(6 + Math.floor(i * (12 / points))).padStart(2, "0")}:${String((i * 37) % 60).padStart(2, "0")}`,
    value: Math.max(0, +(base + Math.sin(i * 0.5) * variance + Math.random() * variance * 0.5 + trend * i).toFixed(2)),
  }));

export const voltageData = genTimeSeries(24, 4.8, 0.6, 0.02);
export const currentData = genTimeSeries(24, 150, 40, 0.5);
export const powerData = genTimeSeries(24, 0.72, 0.25, 0.01);
export const tempData = genTimeSeries(24, 32, 5, 0.15);
export const ldr1Data = genTimeSeries(24, 700, 200, 2);
export const ldr2Data = genTimeSeries(24, 680, 200, 1.5);

export const dailyPower = Array.from({ length: 7 }, (_, i) => ({
  day: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i],
  power: +(0.5 + Math.random() * 0.7).toFixed(2),
  expected: +(0.7 + Math.random() * 0.3).toFixed(2),
}));

export const conditionDist = [
  { name: "Normal", value: 62, color: T.green },
  { name: "Low Light", value: 18, color: T.blue },
  { name: "Shadowing", value: 10, color: T.orange },
  { name: "Dust", value: 7, color: T.accentDark },
  { name: "Fault", value: 3, color: T.red },
];

export const alertsData = [
  { id: 1, type: "warning", title: "Dust Accumulation Detected", desc: "Efficiency dropped by 12% across Array A. Cleaning recommended to restore optimal output.", time: "2 hours ago", resolved: false, severity: "medium" },
  { id: 2, type: "danger", title: "Partial Shadowing Detected", desc: "String B efficiency dropped 30%. Likely cause: debris or new shadowing obstacle.", time: "4 hours ago", resolved: false, severity: "high" },
  { id: 3, type: "danger", title: "Inverter Communication Lost", desc: "ESP32 failed to communicate with main inverter. Check physical connections.", time: "Yesterday, 4:30 PM", resolved: false, severity: "critical" },
  { id: 4, type: "info", title: "Low Light Condition", desc: "Light intensity below 200 lux. Reduced output is expected during cloudy periods.", time: "Yesterday, 2:15 PM", resolved: true, severity: "low" },
  { id: 5, type: "success", title: "Inverter Connection Restored", desc: "The intermittent connection issue with Inverter B has been automatically resolved. System is operating normally.", time: "2 days ago", resolved: true, severity: "low" },
  { id: 6, type: "info", title: "Scheduled Maintenance Reminder", desc: "Monthly panel cleaning is due. Check dust accumulation levels.", time: "3 days ago", resolved: true, severity: "low" },
];

export const usersData = [
  { id: 1, name: "Yuvin Mahawatta", email: "yuvin@sunsense.ai", role: "admin", status: "active", lastLogin: "2 hours ago" },
  { id: 2, name: "Himan Withana", email: "himan@sunsense.ai", role: "admin", status: "active", lastLogin: "5 hours ago" },
  { id: 3, name: "Praveen Lakshitha", email: "praveen@sunsense.ai", role: "user", status: "active", lastLogin: "1 day ago" },
  { id: 4, name: "Hashan Kumara", email: "hashan@sunsense.ai", role: "user", status: "active", lastLogin: "3 days ago" },
  { id: 5, name: "John Doe", email: "john@example.com", role: "user", status: "inactive", lastLogin: "2 weeks ago" },
];
