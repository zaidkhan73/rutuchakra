// Mirrors the ML service's _classify_risk() thresholds exactly — keep these
// two in sync if either ever changes the boundaries.
export function classifyRisk(probability) {
  if (probability < 0.35) {
    return {
      risk_level: "Low",
      advice: "Your responses suggest a low likelihood of PCOS at this time. "
        + "Maintain a balanced diet, stay physically active, and keep track of any new symptoms.",
    };
  } else if (probability < 0.65) {
    return {
      risk_level: "Moderate",
      advice: "Some factors associated with PCOS are present. Start regular exercise, "
        + "reduce processed food, maintain a consistent sleep schedule, and consider a gynaecologist check-up.",
    };
  } else {
    return {
      risk_level: "High",
      advice: "Multiple strong indicators associated with PCOS were detected. Please consult "
        + "a qualified gynaecologist or endocrinologist for a thorough clinical evaluation. Do not self-medicate.",
    };
  }
}