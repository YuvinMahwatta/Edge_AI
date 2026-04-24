#pragma once
#include <Arduino.h>

// =========================
// MODEL (YOUR EXACT MODEL)
// =========================
inline int predict_model(const float features[10]) {

    if (features[3] <= 0.25000000f) {
        if (features[0] <= 45.00000000f) {
            return 1;
        } else {
            return 3;
        }
    } else {
        if (features[3] <= 0.75000000f) {
            if (features[0] <= 45.00000000f) {
                return 2;
            } else {
                return 3;
            }
        } else {
            if (features[0] <= 45.00000000f) {

                if (features[5] <= 3.62045443f) {

                    if (features[7] <= 0.36308044f) {
                        return 4;
                    } else {
                        if (features[0] <= 40.00000000f) {
                            return 4;
                        } else {
                            return 3;
                        }
                    }

                } else {

                    if (features[8] <= 0.00420626f) {
                        if (features[5] <= 4.57909083f) {
                            return 0;
                        } else {
                            return 4;
                        }
                    } else {
                        return 0;
                    }
                }

            } else {

                // temp > 45°C — Overheat zone
                if (features[9] <= 0.02000000f) {     // power_efficiency low (panel struggling)
                    if (features[9] <= 0.01200000f) {  // very low efficiency
                        return 4;                      // PANEL_FAULT (overheating + no output)
                    } else {
                        return 3;                      // OVERHEAT (hot but still some output)
                    }
                } else {
                    if (features[7] <= 0.15000000f) {  // power_w very low despite good efficiency
                        return 4;                      // PANEL_FAULT
                    } else {
                        return 3;                      // OVERHEAT (hot but producing power)
                    }
                }
            }
        }
    }
}

// =========================
// LABEL MAPPING
// =========================
inline const char* class_name(int class_id) {
    switch (class_id) {
        case 0: return "NORMAL";
        case 1: return "LOW_LIGHT";
        case 2: return "SHADOW";
        case 3: return "OVERHEAT";
        case 4: return "PANEL_FAULT";
        default: return "UNKNOWN";
    }
}

// (Example main loop removed to prevent multiple definition errors with main.cpp)