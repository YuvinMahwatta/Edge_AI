#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>
#include <string.h>
#include "esp32_digital_model_export.h"

// ===================== WIFI / BACKEND CONFIG =====================
const char* WIFI_SSID = "STARLINK";
const char* WIFI_PASSWORD = "Alpha@200310013510";

// Use your laptop/server LAN IP, not localhost.
const char* BACKEND_BASE_URL = "http://192.168.8.100:8000";
const char* ESP32_API_KEY = "sunsense-esp32-dev-secret-2026";
const char* DEVICE_ID = "device-001";

// ===================== PIN DEFINITIONS =====================
#define INA219_SDA_PIN        21
#define INA219_SCL_PIN        22

#define VOLTAGE_SENSOR_PIN    32
#define LDR1_PIN              25    // Digital LDR module 1 (DO pin)
#define LDR2_PIN              26    // Digital LDR module 2 (DO pin)
#define TEMP_SENSOR_PIN        5

#define GREEN_LED_PIN         16
#define RED_LED_PIN            2
#define BUZZER_PIN            15

// ===================== ADC SETTINGS =====================
const int ADC_MAX = 4095;
const float ADC_REF = 3.3f;
const float VOLTAGE_DIVIDER_RATIO = 5.0f;

// ===================== THRESHOLDS (tuned for 6V 1W panel) =====================
const float LOW_VOLTAGE_V        = 1.0f;    // panel barely producing
const float LOW_CURRENT_A        = 0.003f;  // 3mA minimum (1W panel max ~167mA)
const float LOW_POWER_W          = 0.005f;  // 5mW minimum
const float CHARGING_CURRENT_A   = 0.002f;  // 2mA = consider charging

// ===================== TIMERS =====================
unsigned long lastPrintTime = 0;
unsigned long lastUploadTime = 0;
unsigned long lastWifiRetryTime = 0;

const unsigned long printInterval = 60000;   // 60 seconds
const unsigned long uploadInterval = 10000;  // 10 seconds
const unsigned long wifiRetryInterval = 10000;

// ===================== OBJECTS =====================
Adafruit_INA219 ina219;
OneWire oneWire(TEMP_SENSOR_PIN);
DallasTemperature tempSensor(&oneWire);

// ===================== STATE =====================
bool monitoringEnabled = true;
float lastValidTemperatureC = 30.0f;
bool hasLastValidTemperature = false;

// ===================== DATA STRUCT =====================
struct SensorData {
  float panelVoltageV;
  float busVoltageV;
  float currentA;
  float powerW;
  bool ldr1Light;       // true = light detected by LDR1
  bool ldr2Light;       // true = light detected by LDR2
  int lightCount;       // 0, 1, or 2 sensors detecting light
  int lightMismatch;    // 1 if only one sensor detects light
  float temperatureC;
  bool tempValid;
  bool fault;
  String status;             // local rule-based state
  int mlPrediction;          // ML model class (0-4)
  const char* mlClassName;   // raw ML model class name
  String backendCondition;   // backend/UI-friendly label
};

// ===================== FUNCTION DECLARATIONS =====================
float readVoltageSensor();
SensorData readAllSensors();
void updateIndicators(const SensorData& d);
void checkSystemErrors(const SensorData& d);
void print60SecondReport(const SensorData& d);
void ensureWifiConnected();
bool postTelemetry(const SensorData& d);
const char* mapModelLabelToBackendCondition(const char* mlClassName);

// ===================== READ VOLTAGE SENSOR =====================
float readVoltageSensor() {
  int raw = analogRead(VOLTAGE_SENSOR_PIN);
  float pinVoltage = (raw * ADC_REF) / ADC_MAX;
  return pinVoltage * VOLTAGE_DIVIDER_RATIO;
}

const char* mapModelLabelToBackendCondition(const char* mlClassName) {
  if (strcmp(mlClassName, "NORMAL") == 0) return "Normal";
  if (strcmp(mlClassName, "LOW_LIGHT") == 0) return "Low Light";
  if (strcmp(mlClassName, "SHADOW") == 0) return "Shadowing";
  if (strcmp(mlClassName, "OVERHEAT") == 0) return "Overheat";
  if (strcmp(mlClassName, "PANEL_FAULT") == 0) return "Panel Fault";
  return "Normal";
}

void ensureWifiConnected() {
  if (WiFi.status() == WL_CONNECTED) return;

  unsigned long now = millis();
  if (now - lastWifiRetryTime < wifiRetryInterval) return;
  lastWifiRetryTime = now;

  Serial.print("Wi-Fi disconnected. Reconnecting to ");
  Serial.println(WIFI_SSID);
  WiFi.disconnect(true, true);
  delay(200);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 12000) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Wi-Fi connected. IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("Wi-Fi reconnect failed.");
  }
}

// ===================== READ ALL =====================
SensorData readAllSensors() {
  SensorData d{};

  d.panelVoltageV = readVoltageSensor();

  // Read digital LDR modules (LOW = light detected, HIGH = dark)
  d.ldr1Light = (digitalRead(LDR1_PIN) == LOW);
  d.ldr2Light = (digitalRead(LDR2_PIN) == LOW);
  d.lightCount = (d.ldr1Light ? 1 : 0) + (d.ldr2Light ? 1 : 0);
  d.lightMismatch = (d.ldr1Light != d.ldr2Light) ? 1 : 0;

  // Read temperature
  tempSensor.requestTemperatures();
  float tempC = tempSensor.getTempCByIndex(0);
  if (tempC == DEVICE_DISCONNECTED_C) {
    d.tempValid = false;
    if (hasLastValidTemperature) {
      d.temperatureC = lastValidTemperatureC;
    } else {
      d.temperatureC = 30.0f;
    }
  } else {
    d.temperatureC = tempC;
    d.tempValid = true;
    lastValidTemperatureC = tempC;
    hasLastValidTemperature = true;
  }

  float busVoltage = ina219.getBusVoltage_V();
  float currentmA  = ina219.getCurrent_mA();

  d.busVoltageV = busVoltage;
  d.currentA = fabs(currentmA / 1000.0f);   // abs value — works regardless of wiring direction
  d.powerW = d.panelVoltageV * d.currentA;

  d.fault = false;
  d.status = "NORMAL";

  // Light-based decision
  if (d.lightCount == 0) {
    d.status = "LOW_LIGHT";
  }
  else if (d.lightCount == 1) {
    if (d.currentA >= CHARGING_CURRENT_A) {
      d.status = "CHARGING";
    } else {
      d.status = "PARTIAL_LIGHT";
    }
  }
  else {
    if (d.panelVoltageV < LOW_VOLTAGE_V) {
      d.status = "LOW_VOLTAGE_FAULT";
      d.fault = true;
    }
    else if (d.currentA < LOW_CURRENT_A) {
      d.status = "LOW_CURRENT_FAULT";
      d.fault = true;
    }
    else if (d.powerW < LOW_POWER_W) {
      d.status = "LOW_POWER_FAULT";
      d.fault = true;
    }
    else if (d.currentA >= CHARGING_CURRENT_A) {
      d.status = "CHARGING";
    }
  }

  // --- ML Model Inference ---
  float features[8];
  features[0] = d.temperatureC;                          // temperature_c
  features[1] = d.panelVoltageV;                         // voltage_v
  features[2] = d.currentA;                              // current_a
  features[3] = d.powerW;                                // power_w
  features[4] = d.ldr1Light ? 1.0f : 0.0f;               // ldr1_state
  features[5] = d.ldr2Light ? 1.0f : 0.0f;               // ldr2_state
  features[6] = (float)d.lightCount;                     // light_count
  features[7] = (float)d.lightMismatch;                  // light_mismatch

  d.mlPrediction = predict_digital_model(features);
  d.mlClassName = digital_class_name(d.mlPrediction);
  d.backendCondition = String(mapModelLabelToBackendCondition(d.mlClassName));

  return d;
}

// ===================== NETWORK POST =====================
bool postTelemetry(const SensorData& d) {
  if (WiFi.status() != WL_CONNECTED) return false;

  HTTPClient http;
  String url = String(BACKEND_BASE_URL) + "/api/esp32/ingest";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Api-Key", ESP32_API_KEY);

  StaticJsonDocument<512> doc;
  doc["device_id"] = DEVICE_ID;
  doc["voltage"] = d.panelVoltageV;
  doc["current"] = d.currentA;
  doc["power"] = d.powerW;
  doc["temperature"] = d.temperatureC;

  // Keep names compatible with current backend.
  doc["ldr1"] = d.ldr1Light ? 1 : 0;
  doc["ldr2"] = d.ldr2Light ? 1 : 0;

  // Main cloud condition comes from ML.
  doc["condition"] = d.backendCondition;
  doc["confidence"] = 0;

  // Extra digital-device fields for future backend updates.
  doc["rule_status"] = d.status;
  doc["ml_label_raw"] = d.mlClassName;
  doc["light_count"] = d.lightCount;
  doc["light_mismatch"] = d.lightMismatch;
  doc["temp_valid"] = d.tempValid;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  String response = http.getString();
  http.end();

  Serial.printf("POST /api/esp32/ingest -> HTTP %d\n", httpCode);
  if (response.length() > 0) {
    Serial.println(response);
  }

  return httpCode >= 200 && httpCode < 300;
}

// ===================== OUTPUT =====================
void updateIndicators(const SensorData& d) {
  static unsigned long lastBlink = 0;
  static bool blinkState = false;
  unsigned long now = millis();

  if (now - lastBlink >= 500) {
    lastBlink = now;
    blinkState = !blinkState;
  }

  if (!monitoringEnabled) {
    digitalWrite(GREEN_LED_PIN, HIGH);
    digitalWrite(RED_LED_PIN, HIGH);
    noTone(BUZZER_PIN);
    return;
  }

  if (d.status == "LOW_LIGHT") {
    static unsigned long lastBeep = 0;
    digitalWrite(GREEN_LED_PIN, HIGH);
    digitalWrite(RED_LED_PIN, blinkState ? LOW : HIGH);

    if (now - lastBeep >= 5000) {
      lastBeep = now;
      tone(BUZZER_PIN, 1000);
    } else if (now - lastBeep >= 200) {
      noTone(BUZZER_PIN);
    }
  }
  else if (d.fault || d.backendCondition == "Panel Fault" || d.backendCondition == "Overheat") {
    digitalWrite(GREEN_LED_PIN, HIGH);
    digitalWrite(RED_LED_PIN, blinkState ? LOW : HIGH);

    if (blinkState) {
      tone(BUZZER_PIN, 1500);
    } else {
      noTone(BUZZER_PIN);
    }
  } else {
    digitalWrite(RED_LED_PIN, HIGH);
    noTone(BUZZER_PIN);
    digitalWrite(GREEN_LED_PIN, blinkState ? LOW : HIGH);
  }
}

void checkSystemErrors(const SensorData& d) {
  Serial.println("================================");
  Serial.printf("Voltage : %.2f V | Current : %.3f A | Power : %.3f W\n",
                d.panelVoltageV, d.currentA, d.powerW);
  Serial.printf("LDR1 : %s | LDR2 : %s | Temp : %s\n",
                d.ldr1Light ? "LIGHT" : "DARK",
                d.ldr2Light ? "LIGHT" : "DARK",
                d.tempValid ? String(d.temperatureC, 1).c_str() : "LAST_VALID_USED");
  Serial.printf("Rule Status: %s\n", d.status.c_str());
  Serial.printf("ML Prediction: %s | Backend Condition: %s\n",
                d.mlClassName, d.backendCondition.c_str());
}

void print60SecondReport(const SensorData& d) {
  Serial.println("========= 60 SECOND REPORT =========");

  Serial.printf("Voltage     : %.2f V\n", d.panelVoltageV);
  Serial.printf("Bus Voltage : %.2f V\n", d.busVoltageV);
  Serial.printf("Current     : %.3f A\n", d.currentA);
  Serial.printf("Power       : %.3f W\n", d.powerW);
  Serial.printf("LDR1        : %s\n", d.ldr1Light ? "LIGHT" : "DARK");
  Serial.printf("LDR2        : %s\n", d.ldr2Light ? "LIGHT" : "DARK");
  Serial.printf("Light Count : %d\n", d.lightCount);
  Serial.printf("Mismatch    : %d\n", d.lightMismatch);
  Serial.printf("Status      : %s\n", d.status.c_str());
  if (d.tempValid) {
    Serial.printf("Temperature : %.1f C\n", d.temperatureC);
  } else {
    Serial.printf("Temperature : %.1f C (last valid reused)\n", d.temperatureC);
  }
  Serial.printf("Fault       : %s\n", d.fault ? "YES" : "NO");
  Serial.printf("ML Predict  : %s (class %d)\n", d.mlClassName, d.mlPrediction);
  Serial.printf("Cloud Cond. : %s\n", d.backendCondition.c_str());
  Serial.printf("Wi-Fi       : %s\n", WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED");

  Serial.println("====================================");
}

// ===================== SETUP =====================
void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(LDR1_PIN, INPUT);
  pinMode(LDR2_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Active LOW OFF state
  digitalWrite(GREEN_LED_PIN, HIGH);
  digitalWrite(RED_LED_PIN, HIGH);
  noTone(BUZZER_PIN);

  analogReadResolution(12);
  Wire.begin(INA219_SDA_PIN, INA219_SCL_PIN);

  if (!ina219.begin()) {
    Serial.println("ERROR: INA219 not detected!");
    while (true) {
      digitalWrite(RED_LED_PIN, LOW);
      delay(200);
      digitalWrite(RED_LED_PIN, HIGH);
      delay(200);
    }
  }

  // Initialize temperature sensor
  tempSensor.begin();
  if (tempSensor.getDeviceCount() > 0) {
    Serial.println("DS18B20 temperature sensor detected!");
  } else {
    Serial.println("WARNING: DS18B20 temperature sensor NOT detected!");
  }

  Serial.println("SYSTEM STARTED");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.println();
  Serial.print("Connected. ESP32 IP: ");
  Serial.println(WiFi.localIP());

  // Startup melody — confirms new code uploaded successfully
  tone(BUZZER_PIN, 800);
  delay(200);
  tone(BUZZER_PIN, 1200);
  delay(200);
  tone(BUZZER_PIN, 1600);
  delay(300);
  noTone(BUZZER_PIN);
}

// ===================== LOOP =====================
void loop() {
  ensureWifiConnected();

  SensorData data = readAllSensors();

  updateIndicators(data);
  checkSystemErrors(data);

  unsigned long now = millis();

  if (now - lastPrintTime >= printInterval) {
    lastPrintTime = now;
    print60SecondReport(data);
  }

  if (monitoringEnabled && now - lastUploadTime >= uploadInterval) {
    lastUploadTime = now;
    bool ok = postTelemetry(data);
    Serial.println(ok ? "Telemetry upload: OK" : "Telemetry upload: FAILED");
  }

  delay(500);
}
