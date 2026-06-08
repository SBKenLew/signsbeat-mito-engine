// Signsbeat Multi-Input Mitochondrial Intelligence Engine
// TypeScript implementation — all 8 layers with bug fixes applied

export interface Intervention {
  name: string;
  load_hours?: number;
}

export interface MetricsDelta {
  pro_recovery?: number;
  pro_stress?: number;
  persistent_stress?: boolean;
}

export interface DailyProfile {
  interventions: Intervention[];
  metrics_delta: MetricsDelta;
  base_threshold_hours?: number;
  hrv_trend?: number;
  sleep_trend?: number;
  hrv_baseline?: number;
  previous_pro_recovery?: number;
  current_pro_recovery?: number;
  glucose_volatility?: number;
  substrate_shifts?: number;
}

export interface EngineResult {
  profile: string;
  composite_load: number;
  response_status: string;
  is_positive: boolean;
  reserve_capacity_score: string;
  adaptation_score: string;
  redox_resilience_score: string;
  metabolic_flexibility_score: string;
  dysfunction_probability: string;
  mitochondrial_health_score: string;
  layer_breakdown: LayerBreakdown;
}

export interface LayerBreakdown {
  layer1: { support_count: number; challenge_count: number; cumulative_load: number };
  layer2: { status: string; is_positive: boolean };
  layer3: { adaptation_score: number };
  layer4_reserve: { buffered_threshold: number; reserve_capacity: number };
  layer5_redox: { score: number; phenotype: string };
  layer6_metabolic: { score: number; flexibility_class: string };
  layer7_dysfunction: { score: number; risk_factors: string[] };
  layer8_health: { score: number };
}

const SUPPORT_INTERVENTIONS = new Set([
  "sleep", "coq10", "pqq", "creatine", "magnesium",
  "omega-3", "nac", "glycine", "protein_optimization",
]);

const CHALLENGE_INTERVENTIONS = new Set([
  "fasting", "ketogenic_diet", "exercise", "hiit",
  "sauna", "cold_plunge", "hbot", "red_light_therapy",
]);

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// Layer 1: Intervention Classification & Multi-Input Mixer
function layer1(interventions: Intervention[]) {
  let support_count = 0;
  let challenge_count = 0;
  let cumulative_challenge_load = 0;

  for (const item of interventions) {
    const key = item.name.toLowerCase().replace(/\s+/g, "_");
    const load = item.load_hours ?? 1.0;
    if (SUPPORT_INTERVENTIONS.has(key)) {
      support_count++;
    } else if (CHALLENGE_INTERVENTIONS.has(key)) {
      challenge_count++;
      cumulative_challenge_load += load;
    }
  }

  return {
    support_count,
    challenge_count,
    cumulative_challenge_load,
    has_support: support_count > 0,
    has_challenge: challenge_count > 0,
  };
}

// Layer 2: Response Validation Engine
function layer2(
  mix: ReturnType<typeof layer1>,
  delta: MetricsDelta
): { status: string; is_positive: boolean } {
  const pro_recovery_delta = delta.pro_recovery ?? 0;
  const is_persistent_stress = delta.persistent_stress ?? false;

  // No interventions — neutral baseline
  if (!mix.has_challenge && !mix.has_support) {
    return { status: "Baseline — No Active Intervention", is_positive: true };
  }

  if (mix.has_challenge && mix.has_support) {
    if (is_persistent_stress) {
      return {
        status: "Critical Limitation: Persistent Stress Despite Support Buffering",
        is_positive: false,
      };
    }
    if (pro_recovery_delta > 1.5) {
      return { status: "Optimized Co-Intervention Rebound", is_positive: true };
    }
    return { status: "Buffered Challenge — Monitor Trend", is_positive: true };
  }

  if (mix.has_challenge && !mix.has_support) {
    if (!is_persistent_stress && pro_recovery_delta > 0) {
      return { status: "Positive Adaptation Rebound", is_positive: true };
    }
    if (is_persistent_stress) {
      return { status: "Potential Mitochondrial Limitation", is_positive: false };
    }
    return { status: "Challenge Tolerated — No Rebound Yet", is_positive: false };
  }

  // Support only, no challenge
  if (pro_recovery_delta > 0 && (delta.pro_stress ?? 0) <= 0) {
    return { status: "Positive Pure Support Response", is_positive: true };
  }
  return { status: "Support Active — Insufficient Response Signal", is_positive: false };
}

// Layer 3: Mitochondrial Adaptation Engine (FIX — was missing from original)
function layer3(
  previous_pro_recovery: number,
  current_pro_recovery: number,
  stress_generated: number
): number {
  const recovery_gain = current_pro_recovery - previous_pro_recovery;
  if (stress_generated <= 0) return recovery_gain > 0 ? 100 : 50;
  const raw = recovery_gain / stress_generated;
  return clamp(raw * 50 + 50, 0, 100); // centre around 50
}

// Layer 4: Composite Reserve Capacity
function layer4_reserve(
  cumulative_load: number,
  base_threshold: number,
  support_count: number
): { buffered_threshold: number; reserve_capacity: number } {
  // FIX: guard against zero base_threshold
  const effective_base = base_threshold > 0 ? base_threshold : 16.0;
  const buffered_threshold = effective_base * (1.0 + support_count * 0.1);
  if (cumulative_load > buffered_threshold) {
    const decrement = Math.min(1.0, (cumulative_load - buffered_threshold) / buffered_threshold);
    return { buffered_threshold, reserve_capacity: Math.max(0, 1.0 - decrement) };
  }
  return { buffered_threshold, reserve_capacity: 1.0 };
}

// Layer 5: Redox Resilience Engine (FIX — was mislabelled "Layer 4" and not implemented)
function layer5_redox(
  hrv_trend: number,
  persistent_stress: boolean,
  pro_recovery_delta: number
): { score: number; phenotype: string } {
  let score = 50;
  if (hrv_trend > 0) score += 20;
  if (!persistent_stress) score += 15;
  if (pro_recovery_delta > 0) score += 15;
  if (persistent_stress) score -= 30;
  if (hrv_trend < -1) score -= 20;
  const clamped = clamp(score, 0, 100);
  const phenotype =
    clamped >= 70
      ? "Healthy — Rapid Over-Compensatory Rebound"
      : clamped >= 40
      ? "Transitional — Partial ROS Clearance"
      : "Dysfunctional — Sustained Unmitigated Stress";
  return { score: clamped, phenotype };
}

// Layer 6: Metabolic Flexibility Engine (FIX — was missing from original)
function layer6_metabolic(
  substrate_shifts: number,
  glucose_volatility: number,
  hrv_trend: number
): { score: number; flexibility_class: string } {
  let score = 50;
  score += Math.min(substrate_shifts * 10, 30); // reward substrate switching
  score -= Math.min(glucose_volatility * 5, 30); // penalise high glucose swings
  if (hrv_trend > 0) score += 10;
  const clamped = clamp(score, 0, 100);
  const flexibility_class =
    clamped >= 70 ? "Flexible" : clamped >= 40 ? "Moderately Flexible" : "Inflexible";
  return { score: clamped, flexibility_class };
}

// Layer 7: Mitochondrial Dysfunction Probability
function layer7_dysfunction(
  risk_factors: { persistent_pro_stress: boolean; declining_hrv: boolean; poor_sleep: boolean },
  mix: ReturnType<typeof layer1>,
  validation_status: string
): { score: number; risk_factors: string[] } {
  let score = 0;
  const active: string[] = [];
  if (risk_factors.persistent_pro_stress) { score += 30; active.push("Persistent Pro_Stress"); }
  if (risk_factors.declining_hrv) { score += 20; active.push("Declining HRV Baseline"); }
  if (risk_factors.poor_sleep) { score += 20; active.push("Degraded Sleep Architecture"); }
  if (mix.has_support && validation_status.includes("Critical Limitation")) {
    score += 30;
    active.push("Adaptation Failure Despite Support Stack");
  }
  return { score: clamp(score, 0, 100), risk_factors: active };
}

// Layer 8: Mitochondrial Health Probability Score
function layer8_health(
  metrics: {
    rising_pro_recovery: boolean;
    improved_hrv: boolean;
    improved_sleep: boolean;
    faster_recovery: boolean;
    recovery_suppression: boolean;
    persistent_pro_stress: boolean;
  },
  mix: ReturnType<typeof layer1>
): number {
  let pos = 0;
  if (metrics.rising_pro_recovery) pos += 25;
  if (metrics.improved_hrv) pos += 20;
  if (metrics.improved_sleep) pos += 15;
  if (metrics.faster_recovery) pos += 20;

  // FIX: only award multi-challenge bonus if recovery is NOT suppressed
  if (mix.challenge_count >= 2 && metrics.faster_recovery && !metrics.recovery_suppression) {
    pos += 20;
  }

  let neg = 0;
  if (metrics.persistent_pro_stress) neg += 35;
  if (metrics.recovery_suppression) neg += 35;
  // FIX: do not double-penalise suppression under multi-challenge — already captured above
  if (mix.challenge_count >= 2 && metrics.recovery_suppression && !metrics.persistent_pro_stress) {
    neg += 10; // reduced from original 20 to avoid stacking
  }

  return clamp(pos - neg, 0, 100);
}

// Main orchestrator
export function evaluateDailyMitochondrialHealth(profile: DailyProfile): EngineResult {
  const mix = layer1(profile.interventions);
  const validation = layer2(mix, profile.metrics_delta);

  // No interventions detected — score is 0; caller should prompt user to log data
  if (!mix.has_challenge && !mix.has_support) {
    return {
      profile: "Challenges: 0 | Supports: 0",
      composite_load: 0,
      response_status: validation.status,
      is_positive: false,
      reserve_capacity_score: "0.0%",
      adaptation_score: "0.0%",
      redox_resilience_score: "0.0%",
      metabolic_flexibility_score: "0.0%",
      dysfunction_probability: "0.0%",
      mitochondrial_health_score: "0.0%",
      layer_breakdown: {
        layer1: { support_count: 0, challenge_count: 0, cumulative_load: 0 },
        layer2: validation,
        layer3: { adaptation_score: 0 },
        layer4_reserve: { buffered_threshold: 16, reserve_capacity: 0 },
        layer5_redox: { score: 0, phenotype: "No intervention data detected in dataset" },
        layer6_metabolic: { score: 0, flexibility_class: "No data" },
        layer7_dysfunction: { score: 0, risk_factors: ["No intervention data detected"] },
        layer8_health: { score: 0 },
      },
    };
  }

  const prev_rec = profile.previous_pro_recovery ?? 0;
  const curr_rec = profile.current_pro_recovery ?? (prev_rec + (profile.metrics_delta.pro_recovery ?? 0));
  const stress_gen = profile.metrics_delta.pro_stress ?? 0;
  const adaptation_score = layer3(prev_rec, curr_rec, Math.abs(stress_gen));

  const { buffered_threshold, reserve_capacity } = layer4_reserve(
    mix.cumulative_challenge_load,
    profile.base_threshold_hours ?? 16,
    mix.support_count
  );

  const hrv = profile.hrv_trend ?? 0;
  const sleep = profile.sleep_trend ?? 0;
  const redox = layer5_redox(hrv, profile.metrics_delta.persistent_stress ?? false, profile.metrics_delta.pro_recovery ?? 0);
  const metabolic = layer6_metabolic(profile.substrate_shifts ?? 1, profile.glucose_volatility ?? 0, hrv);

  const risk_factors = {
    persistent_pro_stress: profile.metrics_delta.persistent_stress ?? false,
    declining_hrv: hrv < 0,
    poor_sleep: sleep < 0,
  };
  const dysfunction = layer7_dysfunction(risk_factors, mix, validation.status);

  const health_inputs = {
    rising_pro_recovery: (profile.metrics_delta.pro_recovery ?? 0) > 0,
    improved_hrv: hrv > 0,
    improved_sleep: sleep > 0,
    faster_recovery: validation.is_positive,
    recovery_suppression: (profile.metrics_delta.pro_recovery ?? 0) < -0.5,
    persistent_pro_stress: profile.metrics_delta.persistent_stress ?? false,
  };
  const health_score = layer8_health(health_inputs, mix);

  return {
    profile: `Challenges: ${mix.challenge_count} | Supports: ${mix.support_count}`,
    composite_load: mix.cumulative_challenge_load,
    response_status: validation.status,
    is_positive: validation.is_positive,
    reserve_capacity_score: `${(reserve_capacity * 100).toFixed(1)}%`,
    adaptation_score: `${adaptation_score.toFixed(1)}%`,
    redox_resilience_score: `${redox.score.toFixed(1)}%`,
    metabolic_flexibility_score: `${metabolic.score.toFixed(1)}%`,
    dysfunction_probability: `${dysfunction.score.toFixed(1)}%`,
    mitochondrial_health_score: `${health_score.toFixed(1)}%`,
    layer_breakdown: {
      layer1: { support_count: mix.support_count, challenge_count: mix.challenge_count, cumulative_load: mix.cumulative_challenge_load },
      layer2: validation,
      layer3: { adaptation_score },
      layer4_reserve: { buffered_threshold, reserve_capacity },
      layer5_redox: redox,
      layer6_metabolic: metabolic,
      layer7_dysfunction: dysfunction,
      layer8_health: { score: health_score },
    },
  };
}
