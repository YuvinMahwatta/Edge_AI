// Auto-generated from the DO-only retraining notebook
#pragma once

// Class mapping:
// 0 = NORMAL
// 1 = LOW_LIGHT
// 2 = SHADOW
// 3 = OVERHEAT
// 4 = PANEL_FAULT

// Feature order:
// features[0] = temperature_c
// features[1] = voltage_v
// features[2] = current_a
// features[3] = power_w
// features[4] = ldr1_state
// features[5] = ldr2_state
// features[6] = light_count
// features[7] = light_mismatch

inline int predict_digital_model(const float features[8]) {
  if (features[6] <= 0.50000000f) {
    if (features[2] <= 1.29499996f) {
      if (features[1] <= 9.71000004f) {
        if (features[0] <= 28.10999966f) {
          return 1;
        } else {
          if (features[3] <= 0.87695000f) {
            if (features[1] <= 8.73999977f) {
              return 2;
            } else {
              return 1;
            }
          } else {
            return 2;
          }
        }
      } else {
        if (features[2] <= 1.03499997f) {
          if (features[1] <= 11.04500008f) {
            if (features[0] <= 21.28499985f) {
              return 2;
            } else {
              if (features[0] <= 46.79500008f) {
                if (features[1] <= 10.26500034f) {
                  return 1;
                } else {
                  return 1;
                }
              } else {
                if (features[2] <= 0.23500000f) {
                  return 2;
                } else {
                  return 1;
                }
              }
            }
          } else {
            if (features[1] <= 19.66499996f) {
              if (features[2] <= 0.93500000f) {
                if (features[1] <= 12.47499990f) {
                  return 1;
                } else {
                  return 1;
                }
              } else {
                if (features[3] <= 12.79760027f) {
                  return 1;
                } else {
                  return 1;
                }
              }
            } else {
              return 4;
            }
          }
        } else {
          if (features[1] <= 11.03499985f) {
            if (features[0] <= 42.28499985f) {
              if (features[0] <= 37.40999985f) {
                return 2;
              } else {
                if (features[0] <= 37.53999901f) {
                  return 1;
                } else {
                  return 2;
                }
              }
            } else {
              return 1;
            }
          } else {
            if (features[0] <= 40.39500046f) {
              if (features[1] <= 12.59999990f) {
                if (features[1] <= 12.52999973f) {
                  return 1;
                } else {
                  return 1;
                }
              } else {
                if (features[0] <= 27.01500034f) {
                  return 1;
                } else {
                  return 1;
                }
              }
            } else {
              if (features[1] <= 12.99000025f) {
                if (features[0] <= 43.22000122f) {
                  return 2;
                } else {
                  return 1;
                }
              } else {
                if (features[3] <= 16.20094967f) {
                  return 1;
                } else {
                  return 1;
                }
              }
            }
          }
        }
      }
    } else {
      if (features[1] <= 13.85500002f) {
        if (features[2] <= 2.58499992f) {
          if (features[1] <= 11.56500006f) {
            return 2;
          } else {
            if (features[2] <= 1.59500003f) {
              if (features[3] <= 18.61745071f) {
                if (features[3] <= 16.46635008f) {
                  return 1;
                } else {
                  return 2;
                }
              } else {
                return 1;
              }
            } else {
              return 2;
            }
          }
        } else {
          return 4;
        }
      } else {
        if (features[0] <= 35.51500130f) {
          if (features[3] <= 20.51055050f) {
            return 1;
          } else {
            return 2;
          }
        } else {
          return 1;
        }
      }
    }
  } else {
    if (features[7] <= 0.50000000f) {
      if (features[0] <= 59.37500000f) {
        if (features[1] <= 13.30500031f) {
          if (features[3] <= 39.93885040f) {
            if (features[2] <= 1.25500000f) {
              if (features[1] <= 7.64999986f) {
                if (features[1] <= 6.27000022f) {
                  return 4;
                } else {
                  return 4;
                }
              } else {
                if (features[1] <= 12.30500031f) {
                  return 4;
                } else {
                  return 4;
                }
              }
            } else {
              if (features[1] <= 12.57499981f) {
                if (features[1] <= 6.58500004f) {
                  return 4;
                } else {
                  return 4;
                }
              } else {
                if (features[0] <= 52.79500008f) {
                  return 4;
                } else {
                  return 4;
                }
              }
            }
          } else {
            if (features[1] <= 12.58500004f) {
              if (features[3] <= 49.27699852f) {
                if (features[2] <= 3.48000002f) {
                  return 4;
                } else {
                  return 4;
                }
              } else {
                return 3;
              }
            } else {
              if (features[0] <= 51.54999924f) {
                if (features[2] <= 3.19000006f) {
                  return 0;
                } else {
                  return 4;
                }
              } else {
                if (features[1] <= 13.11499977f) {
                  return 3;
                } else {
                  return 0;
                }
              }
            }
          }
        } else {
          if (features[2] <= 0.62500000f) {
            if (features[1] <= 16.80000019f) {
              if (features[0] <= 48.47999954f) {
                if (features[2] <= 0.24999999f) {
                  return 1;
                } else {
                  return 0;
                }
              } else {
                return 4;
              }
            } else {
              if (features[2] <= 0.52499998f) {
                if (features[0] <= 27.03999996f) {
                  return 0;
                } else {
                  return 4;
                }
              } else {
                if (features[0] <= 40.82000160f) {
                  return 0;
                } else {
                  return 4;
                }
              }
            }
          } else {
            if (features[0] <= 54.32500076f) {
              if (features[1] <= 13.89499998f) {
                if (features[3] <= 34.96360016f) {
                  return 4;
                } else {
                  return 0;
                }
              } else {
                if (features[1] <= 19.70499992f) {
                  return 0;
                } else {
                  return 4;
                }
              }
            } else {
              if (features[1] <= 15.91499996f) {
                if (features[0] <= 56.49500084f) {
                  return 0;
                } else {
                  return 3;
                }
              } else {
                if (features[1] <= 18.66499996f) {
                  return 0;
                } else {
                  return 4;
                }
              }
            }
          }
        }
      } else {
        if (features[1] <= 11.03999996f) {
          if (features[1] <= 10.37500000f) {
            if (features[1] <= 9.98000002f) {
              if (features[2] <= 2.26499999f) {
                if (features[2] <= 2.25500000f) {
                  return 4;
                } else {
                  return 4;
                }
              } else {
                return 4;
              }
            } else {
              if (features[1] <= 9.99499989f) {
                return 3;
              } else {
                if (features[0] <= 60.07999992f) {
                  return 4;
                } else {
                  return 4;
                }
              }
            }
          } else {
            if (features[0] <= 74.02500153f) {
              return 4;
            } else {
              if (features[2] <= 2.88499999f) {
                if (features[0] <= 84.83499908f) {
                  return 4;
                } else {
                  return 3;
                }
              } else {
                if (features[2] <= 4.11000013f) {
                  return 3;
                } else {
                  return 3;
                }
              }
            }
          }
        } else {
          if (features[3] <= 18.90215015f) {
            if (features[2] <= 0.73000002f) {
              return 4;
            } else {
              if (features[1] <= 13.59000015f) {
                if (features[2] <= 1.17000002f) {
                  return 2;
                } else {
                  return 4;
                }
              } else {
                return 0;
              }
            }
          } else {
            if (features[0] <= 63.32500076f) {
              if (features[1] <= 12.86000013f) {
                if (features[3] <= 33.02254868f) {
                  return 4;
                } else {
                  return 3;
                }
              } else {
                if (features[1] <= 15.54500008f) {
                  return 3;
                } else {
                  return 3;
                }
              }
            } else {
              if (features[0] <= 67.80500031f) {
                if (features[1] <= 12.27500010f) {
                  return 3;
                } else {
                  return 3;
                }
              } else {
                if (features[1] <= 11.28500032f) {
                  return 3;
                } else {
                  return 3;
                }
              }
            }
          }
        }
      }
    } else {
      if (features[1] <= 15.60500002f) {
        if (features[1] <= 5.06500006f) {
          if (features[2] <= 1.06500000f) {
            return 2;
          } else {
            return 4;
          }
        } else {
          if (features[2] <= 2.75500000f) {
            if (features[1] <= 14.96499968f) {
              if (features[0] <= 68.43000031f) {
                if (features[3] <= 29.45040035f) {
                  return 2;
                } else {
                  return 2;
                }
              } else {
                return 4;
              }
            } else {
              if (features[0] <= 28.35999966f) {
                return 0;
              } else {
                if (features[3] <= 31.21915054f) {
                  return 2;
                } else {
                  return 0;
                }
              }
            }
          } else {
            if (features[0] <= 37.85500145f) {
              return 4;
            } else {
              if (features[0] <= 56.02000046f) {
                if (features[3] <= 37.51469994f) {
                  return 2;
                } else {
                  return 4;
                }
              } else {
                return 4;
              }
            }
          }
        }
      } else {
        if (features[1] <= 18.39499950f) {
          if (features[3] <= 10.84584999f) {
            if (features[1] <= 17.00999928f) {
              if (features[0] <= 33.57500076f) {
                if (features[2] <= 0.11500000f) {
                  return 1;
                } else {
                  return 2;
                }
              } else {
                return 1;
              }
            } else {
              if (features[1] <= 17.24499989f) {
                return 4;
              } else {
                return 0;
              }
            }
          } else {
            if (features[1] <= 15.82999992f) {
              if (features[3] <= 23.74100018f) {
                return 2;
              } else {
                if (features[2] <= 1.91999996f) {
                  return 0;
                } else {
                  return 0;
                }
              }
            } else {
              if (features[0] <= 47.18999863f) {
                if (features[0] <= 45.57499886f) {
                  return 0;
                } else {
                  return 0;
                }
              } else {
                return 1;
              }
            }
          }
        } else {
          return 4;
        }
      }
    }
  }
}

inline const char* digital_class_name(int class_id) {
  switch (class_id) {
    case 0: return "NORMAL";
    case 1: return "LOW_LIGHT";
    case 2: return "SHADOW";
    case 3: return "OVERHEAT";
    case 4: return "PANEL_FAULT";
    default: return "UNKNOWN";
  }
}
