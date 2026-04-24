#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <Adafruit_INA219.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <math.h>
#include <string.h>
#include "model.h"

// ===================== WIFI / BACKEND CONFIG =====================
const char* WIFI_SSID = "SLT_FIBRE";
const char* WIFI_PASSWORD = "saman123";

// Use your laptop/server LAN IP, not localhost.
const char* BACKEND_BASE_URL = "http://192.168.1.18:8000";
const char* ESP32_API_KEY = "sunsense-esp32-dev-secret-2026";
const char* DEVICE_ID = "device-001";

// ===================== PIN DEFINITIONS =====================
#define INA219_SDA_PIN        21
#define INA219_SCL_PIN        22

#define OLED_SDA_PIN          18
#define OLED_SCL_PIN          19

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

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
TwoWire I2COLED = TwoWire(1); // Use second I2C bus
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &I2COLED, -1);

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
void updateOLED(const SensorData& d);

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

  // Read INA219 — use Bus+Shunt as true panel voltage (more accurate than analog sensor)
  float shuntVoltage = ina219.getShuntVoltage_mV();
  float busVoltage = ina219.getBusVoltage_V();
  float currentmA  = ina219.getCurrent_mA();

  d.busVoltageV = busVoltage;
  d.panelVoltageV = busVoltage + (shuntVoltage / 1000.0f);  // True panel voltage = Bus + Shunt drop
  d.currentA = fabs(currentmA / 1000.0f);   // abs value — works regardless of wiring direction
  d.powerW = d.panelVoltageV * d.currentA;

  d.fault = false;
  d.status = "NORMAL";

  // --- Rule-based decision (Commented out to rely solely on ML) ---
  /*
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
  */

  // --- ML Model Inference ---
  int ldr_left = d.ldr1Light ? 1 : 0;
  int ldr_right = d.ldr2Light ? 1 : 0;
  float avg_light = (ldr_left + ldr_right) / 2.0f;
  float light_diff = fabs(ldr_left - ldr_right);
  float current_ratio = d.currentA / (d.panelVoltageV + 0.00001f);
  float power_efficiency = d.powerW / (avg_light + 0.1f);

  float features[10]; 
  features[0] = d.temperatureC;          // temperature_c
  features[1] = ldr_left;                // ldr_left
  features[2] = ldr_right;               // ldr_right
  features[3] = avg_light;               // avg_light
  features[4] = light_diff;              // light_diff
  features[5] = d.panelVoltageV;         // voltage_v
  features[6] = d.currentA;              // current_a
  features[7] = d.powerW;                // power_w
  features[8] = current_ratio;           // current_ratio
  features[9] = power_efficiency;        // power_efficiency

  d.mlPrediction = predict_model(features);
  d.mlClassName = class_name(d.mlPrediction);
  d.backendCondition = String(mapModelLabelToBackendCondition(d.mlClassName));

  // Sync core system state to ML prediction
  d.status = String(d.mlClassName);
  d.fault = (d.status == "PANEL_FAULT" || d.status == "OVERHEAT");

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
  unsigned long now = millis();

  if (!monitoringEnabled) {
    digitalWrite(GREEN_LED_PIN, LOW);
    digitalWrite(RED_LED_PIN, LOW);
    noTone(BUZZER_PIN);
    return;
  }

  // --- Buzzer Logic ---
  // ONLY beep for PANEL_FAULT
  if (d.status == "PANEL_FAULT") {
    if ((now / 250) % 2 == 0) { // Fast beep
      tone(BUZZER_PIN, 1500);
    } else {
      noTone(BUZZER_PIN);
    }
  } else {
    noTone(BUZZER_PIN);
  }

  // --- LED Logic ---
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);

  if (d.status == "NORMAL") {
    // Normal: Green slow blink (1 Hz)
    digitalWrite(GREEN_LED_PIN, ((now / 500) % 2 == 0) ? HIGH : LOW);
  } 
  else if (d.status == "LOW_LIGHT") {
    // Low Light: Red slow blink
    digitalWrite(RED_LED_PIN, ((now / 1000) % 2 == 0) ? HIGH : LOW);
  }
  else if (d.status == "SHADOW") {
    // Shadow: Red double blink pattern
    int cycle = (now / 200) % 10; // 2 second cycle
    digitalWrite(RED_LED_PIN, (cycle == 0 || cycle == 2) ? HIGH : LOW);
  }
  else if (d.status == "OVERHEAT") {
    // Overheat: Red fast blink (2.5 Hz)
    digitalWrite(RED_LED_PIN, ((now / 200) % 2 == 0) ? HIGH : LOW);
  }
  else if (d.status == "PANEL_FAULT") {
    // Panel Fault: Red very fast alternating with buzzer
    digitalWrite(RED_LED_PIN, ((now / 250) % 2 == 0) ? LOW : HIGH);
  }
}

// ===================== OLED DISPLAY =====================
void updateOLED(const SensorData& d) {
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);

  // Row 1: Voltage & Current
  display.setCursor(0, 0);
  display.printf("V:%.1fV  I:%.0fmA", d.panelVoltageV, d.currentA * 1000);

  // Row 2: Power & Temperature
  display.setCursor(0, 10);
  display.printf("P:%.1fmW T:%.1fC", d.powerW * 1000, d.temperatureC);

  // Row 3: LDR status
  display.setCursor(0, 20);
  display.printf("L1:%s L2:%s",
    d.ldr1Light ? "ON" : "--",
    d.ldr2Light ? "ON" : "--");

  // Divider line
  display.drawLine(0, 29, 127, 29, SSD1306_WHITE);

  // Row 4: ML Prediction
  display.setCursor(0, 35);
  display.print("ML:");
  display.print(d.backendCondition);

  // Row 6: WiFi status
  display.setCursor(0, 55);
  display.printf("WiFi:%s", WiFi.status() == WL_CONNECTED ? "OK" : "NO");

  display.display();
}

void checkSystemErrors(const SensorData& d) {
  Serial.println("================================");
  Serial.printf("Voltage : %.2f V | Current : %.3f A | Power : %.3f W\n",
                d.panelVoltageV, d.currentA, d.powerW);
  Serial.printf("LDR1 : %s | LDR2 : %s | Temp : %s\n",
                d.ldr1Light ? "LIGHT" : "DARK",
                d.ldr2Light ? "LIGHT" : "DARK",
                d.tempValid ? String(d.temperatureC, 1).c_str() : "LAST_VALID_USED");
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

  // Active HIGH OFF state
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(RED_LED_PIN, LOW);
  noTone(BUZZER_PIN);

  analogReadResolution(12);
  
  Wire.begin(INA219_SDA_PIN, INA219_SCL_PIN);
  I2COLED.begin(OLED_SDA_PIN, OLED_SCL_PIN);

  // Initialize OLED display
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    Serial.println("WARNING: SSD1306 OLED not found!");
  } else {
    Serial.println("OLED display detected!");
    
    // Set to maximum brightness
    display.ssd1306_command(SSD1306_SETCONTRAST);
    display.ssd1306_command(255);

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(10, 20);
    display.println("SunSenseAI");
    display.setCursor(10, 35);
    display.println("Starting...");
    display.display();
  }

  if (!ina219.begin()) {
    Serial.println("ERROR: INA219 not detected!");
    while (true) {
      digitalWrite(RED_LED_PIN, LOW);
      delay(200);
      digitalWrite(RED_LED_PIN, HIGH);
      delay(200);
    }
  }
  Serial.println("INA219 detected! Calibration: 32V 2A (default)");
  ina219.setCalibration_32V_2A();  // Explicitly set calibration

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
  updateOLED(data);

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
