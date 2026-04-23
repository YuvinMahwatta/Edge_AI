#pragma once
#include <Arduino.h>

// =========================
// MODEL (YOUR EXACT MODEL)
// =========================
inline int predict_model(const float features[10]) {

    if (features[3] <= 0.25000000f) {
        if (features[0] <= 59.92000008f) {
            return 1;
        } else {
            return 3;
        }
    } else {
        if (features[3] <= 0.75000000f) {
            if (features[0] <= 60.04999924f) {
                return 2;
            } else {
                return 3;
            }
        } else {
            if (features[0] <= 59.37500000f) {

                if (features[5] <= 3.62045443f) {

                    if (features[7] <= 0.36308044f) {
                        return 4;
                    } else {
                        if (features[0] <= 53.32499886f) {
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

                if (features[9] <= 0.01137562f) {
                    if (features[9] <= 0.00832190f) {
                        return 4;
                    } else {
                        return 3;
                    }
                } else {
                    if (features[0] <= 60.00499916f) {
                        if (features[7] <= 0.20880000f) {
                            return 4;
                        } else {
                            return 3;
                        }
                    } else {
                        return 3;
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