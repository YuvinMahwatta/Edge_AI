"""
Lightweight rule-based fault classifier.

In production, the TFLite model runs ON the ESP32 and sends the condition
with each reading. This module is a server-side fallback that can re-classify
readings if the ESP32 doesn't include a condition, or for batch re-analysis.

Rules are derived from the project's sensor thresholds:
  - Normal:             voltage > 3V, avg_light > 400, light_diff < 150, temp < 55
    - Low Light:          avg_light < 200
    - Shadow:             light_diff > 200
    - Panel Fault:        voltage < 1V or current < 5mA while avg_light > 500
    - Over Heat:          temperature > 55
"""


def classify_condition(
    voltage: float,
    current: float,
    power: float,
    temperature: float,
    ldr1: int,
    ldr2: int,
) -> tuple[str, float]:
    """Return (condition, confidence) tuple."""
    avg_light = (ldr1 + ldr2) / 2
    light_diff = abs(ldr1 - ldr2)

    # Panel Fault — hardware issue indicators
    if voltage < 1.0 or (current < 5 and avg_light > 500):
        return "Panel Fault", 95.0

    # Low Light — environmental
    if avg_light < 200:
        return "Low Light", 90.0 + min(avg_light / 20, 8)

    # Shadow — significant difference between the two LDR zones
    if light_diff > 200:
        return "Shadow", 85.0 + min(light_diff / 100, 12)

    # Over Heat warning
    if temperature > 55:
        return "Over Heat", 75.0

    return "Normal", 94.0 + min(voltage, 5) * 1.0
