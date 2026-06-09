// Signsbeat Multi-Input Mitochondrial Intelligence Engine
// TypeScript — exact port of the reference Python spec
// Terminology: "intervention" replaced with "ActionName" throughout

export interface ActionName {
  name: string;
  load_hours?: number;
}

export interface MetricsDelta {
  pro_recovery?: number;      // delta vs previous day (positive = improving)
  pro_mild_stress?: number;   // delta vs previous day for Pro_MildStress
  pro_stress?: number;        // current pro_stress value or delta
  persistent_stress?: boolean;
}

export interface DailyProfile {
  action_names: ActionName[];          // was: interventions
  metrics_delta: MetricsDelta;
  base_threshold_hours?: number;       // default 16.0
  hrv_trend?: number;
  sleep_trend?: number;
  // Raw Pro_State values for display
  pro_positive?: number;
  pro_recovery?: number;
  pro_mild_stress?: number;
  pro_stress?: number;
}

export interface EngineResult {
  // Layer outputs (matches Python return dict, with ActionName terminology)
  action_name_profile: string;            // was: "Intervention Profile"
  cumulative_challenge_load: string;
  dynamic_response_status: string;
  reserve_capacity_score: string;
  dysfunction_probability: string;
  final_mito_health_score: string;

  // Extended fields for UI
  is_positive: boolean;
  adaptation_score: number;
  support_action_names: string[];
  challenge_action_names: string[];
  unknown_action_names: string[];
  // ActionNames not in registry but reclassified via observed Pro_State response
  inferred_challenge_names: string[];   // promoted Pro_Recovery → inferred Challenge
  inferred_support_names: string[];     // promoted Pro_MildStress → inferred Support
  pro_state_values: {
    pro_positive: number;
    pro_recovery: number;
    pro_mild_stress: number;
    pro_stress: number;
  };
  layer_breakdown: {
    support_count: number;
    challenge_count: number;
    cumulative_load: number;
    buffered_threshold: number;
    reserve_capacity: number;
    dysfunction_score: number;
    health_score: number;
  };
}

// ── ActionName Registry (Layer 1) ─────────────────────────────────────────────

const ACTION_NAME_REGISTRY = {
  mitochondrial_support: new Set([
    "sleep", "coq10", "pqq", "creatine", "magnesium",
    "omega-3", "omega3", "nac", "glycine", "protein_optimization",
    "protein", "zinc", "vitamin_d", "vitamin_c", "ashwagandha",
    "l-theanine", "ltheanine", "melatonin", "berberine", "nmn",
    "nad", "probiotics", "fish_oil", "multivitamin",
    "rest", "recovery_session", "meditation", "breathwork", "massage",
  ]),
  mitochondrial_challenge: new Set([
    "fasting", "intermittent_fasting", "ketogenic_diet", "ketogenic", "keto",
    "exercise", "hiit", "resistance", "strength", "weight_training",
    "cardio", "aerobic", "running", "cycling", "swimming",
    "zone_2", "sprints", "crossfit", "vo2max", "tempo",
    "sauna", "infrared_sauna", "cold_plunge", "cold_water", "cwi",
    "hbot", "hyperbaric", "red_light_therapy", "red_light",
  ]),
};

export function classifyActionName(name: string): "support" | "challenge" | "unknown" {
  const key = name.toLowerCase().trim().replace(/[\s\-\/]+/g, "_");

  if (ACTION_NAME_REGISTRY.mitochondrial_support.has(key)) return "support";
  if (ACTION_NAME_REGISTRY.mitochondrial_challenge.has(key)) return "challenge";

  // Partial / substring match
  const supportArr   = Array.from(ACTION_NAME_REGISTRY.mitochondrial_support);
  const challengeArr = Array.from(ACTION_NAME_REGISTRY.mitochondrial_challenge);
  for (const s of supportArr)   { if (key.includes(s) || s.includes(key)) return "support"; }
  for (const c of challengeArr) { if (key.includes(c) || c.includes(key)) return "challenge"; }

  return "unknown";
}

// ── Layer 1: ActionName Classification & Multi-Input Mixer ───────────────────
// Unknown ActionNames are reclassified via observed Pro_State promotion:
//   • Pro_Recovery delta > 0  → inferred Challenge (hormetic adaptation signal)
//   • Pro_MildStress delta > 0 → inferred Support   (mild modulation signal)
//   Exception: items already in the hormetic registry stay as Challenge regardless.

function layer1_process_daily_mix(
  action_names: ActionName[],
  pro_recovery_delta: number = 0,
  pro_mild_stress_delta: number = 0,
): {
  support_count: number;
  challenge_count: number;
  cumulative_challenge_load: number;
  has_support: boolean;
  has_challenge: boolean;
  support_names: string[];
  challenge_names: string[];
  unknown_names: string[];
  inferred_challenge_names: string[];
  inferred_support_names: string[];
} {
  const support_names:          string[] = [];
  const challenge_names:        string[] = [];
  const unknown_names:          string[] = [];
  const inferred_challenge_names: string[] = [];
  const inferred_support_names:   string[] = [];
  let cumulative_challenge_load = 0.0;

  for (const item of action_names) {
    const load = item.load_hours ?? 1.0;
    const cls  = classifyActionName(item.name);

    if (cls === "support") {
      support_names.push(item.name);
    } else if (cls === "challenge") {
      challenge_names.push(item.name);
      cumulative_challenge_load += load;
    } else {
      // Unknown — reclassify from observed Pro_State promotion
      if (pro_recovery_delta > 0) {
        // Pro_Recovery promoted → hormetic/challenge response inferred
        inferred_challenge_names.push(item.name);
        challenge_names.push(item.name);          // counted as challenge
        cumulative_challenge_load += load;
      } else if (pro_mild_stress_delta > 0) {
        // Pro_MildStress promoted → supportive/modulating response inferred
        inferred_support_names.push(item.name);
        support_names.push(item.name);            // counted as support
      } else {
        // No observable Pro_State signal — stays truly unknown
        unknown_names.push(item.name);
      }
    }
  }

  return {
    support_count: support_names.length,
    challenge_count: challenge_names.length,
    cumulative_challenge_load,
    has_support:   support_names.length > 0,
    has_challenge: challenge_names.length > 0,
    support_names,
    challenge_names,
    unknown_names,
    inferred_challenge_names,
    inferred_support_names,
  };
}

// ── Layer 2: Composite Response Validation ───────────────────────────────────

function layer2_validate_composite_response(
  mix_meta: ReturnType<typeof layer1_process_daily_mix>,
  metrics_delta: MetricsDelta,
): { status: string; is_positive: boolean } {
  const pro_recovery_delta  = metrics_delta.pro_recovery  ?? 0.0;
  const pro_stress_delta    = metrics_delta.pro_stress    ?? 0.0;
  const is_persistent_stress = metrics_delta.persistent_stress ?? false;

  // Challenge + Support deployed together
  if (mix_meta.has_challenge && mix_meta.has_support) {
    if (is_persistent_stress) {
      return { status: "Critical Limitation: Persistent Stress despite Support Buffering", is_positive: false };
    }
    if (pro_recovery_delta > 1.5) {
      return { status: "Optimized Co-ActionName Rebound", is_positive: true };
    }
    // Has both but response is moderate — still positive direction
    if (pro_recovery_delta > 0) {
      return { status: "Buffered Challenge — Positive Trend", is_positive: true };
    }
  }

  // Challenge only, no support
  if (mix_meta.has_challenge && !mix_meta.has_support) {
    if (!is_persistent_stress && pro_recovery_delta > 0) {
      return { status: "Positive Adaptation Rebound", is_positive: true };
    }
    if (is_persistent_stress) {
      return { status: "Potential Mitochondrial Limitation", is_positive: false };
    }
  }

  // Support only, no challenge
  if (mix_meta.has_support && !mix_meta.has_challenge) {
    if (pro_recovery_delta > 0 && pro_stress_delta <= 0) {
      return { status: "Positive Pure Support Response", is_positive: true };
    }
    return { status: "Support Active — Insufficient Response Signal", is_positive: false };
  }

  // No ActionNames at all
  if (!mix_meta.has_challenge && !mix_meta.has_support) {
    return { status: "No ActionName Data — Score is 0", is_positive: false };
  }

  return { status: "Investigate Dynamic Mismatch", is_positive: false };
}

// ── Layer 4: Composite Reserve Capacity ──────────────────────────────────────
// Every support ActionName expands total daily reserve capacity threshold by 10%

function layer4_composite_reserve_capacity(
  cumulative_load: number,
  base_threshold: number,
  support_count: number,
): { buffered_threshold: number; reserve_capacity: number } {
  const effective_base   = base_threshold > 0 ? base_threshold : 16.0;
  const buffered_threshold = effective_base * (1.0 + support_count * 0.10);

  if (cumulative_load > buffered_threshold) {
    const decrement = Math.min(1.0, (cumulative_load - buffered_threshold) / buffered_threshold);
    return { buffered_threshold, reserve_capacity: Math.max(0.0, 1.0 - decrement) };
  }
  return { buffered_threshold, reserve_capacity: 1.0 };
}

// ── Layer 7: Composite Dysfunction Probability ───────────────────────────────
// Elevates dysfunction probability if system fails to adapt despite heavy support stacks

function layer7_calculate_composite_dysfunction(
  risk_factors: { persistent_pro_stress: boolean; declining_hrv: boolean; poor_sleep: boolean },
  mix_meta: ReturnType<typeof layer1_process_daily_mix>,
  validation_status: string,
): number {
  let score = 0.0;

  if (risk_factors.persistent_pro_stress) score += 30.0;
  if (risk_factors.declining_hrv)         score += 20.0;
  if (risk_factors.poor_sleep)            score += 20.0;

  // High penalty: failing to recover even with support optimisation
  if (mix_meta.has_support && validation_status.includes("Critical Limitation")) {
    score += 30.0;
  }

  return Math.min(100.0, Math.max(0.0, score));
}

// ── Layer 8: Composite Health Score ──────────────────────────────────────────
// Aggregates multi-ActionName telemetry vectors into a final scaled probability

function layer8_calculate_composite_health(
  metrics: {
    rising_pro_recovery: boolean;
    improved_hrv: boolean;
    improved_sleep: boolean;
    faster_recovery: boolean;
    recovery_suppression: boolean;
    persistent_pro_stress: boolean;
  },
  mix_meta: ReturnType<typeof layer1_process_daily_mix>,
): number {
  let pos_score = 0.0;

  if (metrics.rising_pro_recovery) pos_score += 25.0;
  if (metrics.improved_hrv)        pos_score += 20.0;
  if (metrics.improved_sleep)      pos_score += 15.0;
  if (metrics.faster_recovery)     pos_score += 20.0;

  // Synergistic bonus for stacking multiple successfully tolerated ActionNames
  if (mix_meta.challenge_count >= 2 && metrics.faster_recovery) {
    pos_score += 20.0;
  }

  let neg_penalty = 0.0;

  if (metrics.persistent_pro_stress)  neg_penalty += 35.0;
  if (metrics.recovery_suppression)   neg_penalty += 35.0;

  // Extra penalty if multi-challenge stacking causes unmitigated collapse
  if (mix_meta.challenge_count >= 2 && metrics.recovery_suppression) {
    neg_penalty += 20.0;
  }

  return Math.min(100.0, Math.max(0.0, pos_score - neg_penalty));
}

// ── Main Orchestrator ─────────────────────────────────────────────────────────

export function evaluateDailyMitochondrialHealth(profile: DailyProfile): EngineResult {
  const action_names  = profile.action_names ?? [];
  const metrics_delta = profile.metrics_delta ?? {};

  // Layer 1 — classify all ActionNames
  // Pass Pro_State deltas so unknown ActionNames can be reclassified by observed response
  const pro_recovery_delta    = metrics_delta.pro_recovery    ?? 0;
  const pro_mild_stress_delta = metrics_delta.pro_mild_stress ?? 0;
  const mix_meta = layer1_process_daily_mix(action_names, pro_recovery_delta, pro_mild_stress_delta);

  // Layer 2 — validate composite physiological signatures
  const validation = layer2_validate_composite_response(mix_meta, metrics_delta);

  // Adaptation score: Recovery Gain / Stress Generated
  const adaptation_score =
    (metrics_delta.pro_recovery ?? 0) /
    Math.max(0.1, metrics_delta.pro_stress ?? 0.1);

  // Layer 4 — adaptive buffering equation
  const { buffered_threshold, reserve_capacity } = layer4_composite_reserve_capacity(
    mix_meta.cumulative_challenge_load,
    profile.base_threshold_hours ?? 16.0,
    mix_meta.support_count,
  );

  // Layer 7 — dysfunction risk
  const risk_factors = {
    persistent_pro_stress: metrics_delta.persistent_stress ?? false,
    declining_hrv:         (profile.hrv_trend ?? 0) < 0,
    poor_sleep:            (profile.sleep_trend ?? 0) < 0,
  };
  const dysfunction_score = layer7_calculate_composite_dysfunction(risk_factors, mix_meta, validation.status);

  // Layer 8 — final health probability
  const health_inputs = {
    rising_pro_recovery:  (metrics_delta.pro_recovery ?? 0) > 0,
    improved_hrv:         (profile.hrv_trend ?? 0) > 0,
    improved_sleep:       (profile.sleep_trend ?? 0) > 0,
    faster_recovery:      validation.is_positive,
    recovery_suppression: (metrics_delta.pro_recovery ?? 0) < -0.5,
    persistent_pro_stress: metrics_delta.persistent_stress ?? false,
  };
  const health_score = layer8_calculate_composite_health(health_inputs, mix_meta);

  return {
    // Python-equivalent output keys (ActionName terminology)
    action_name_profile:      `Challenges: ${mix_meta.challenge_count} | Supports: ${mix_meta.support_count}`,
    cumulative_challenge_load: `${mix_meta.cumulative_challenge_load.toFixed(1)} Factor-Hours`,
    dynamic_response_status:  validation.status,
    reserve_capacity_score:   `${(reserve_capacity * 100).toFixed(1)}%`,
    dysfunction_probability:  `${dysfunction_score.toFixed(1)}%`,
    final_mito_health_score:  `${health_score.toFixed(1)}%`,

    // UI extensions
    is_positive:              validation.is_positive,
    adaptation_score:         parseFloat(adaptation_score.toFixed(2)),
    support_action_names:     mix_meta.support_names.filter(n => !mix_meta.inferred_support_names.includes(n)),
    challenge_action_names:   mix_meta.challenge_names.filter(n => !mix_meta.inferred_challenge_names.includes(n)),
    unknown_action_names:     mix_meta.unknown_names,
    inferred_challenge_names: mix_meta.inferred_challenge_names,
    inferred_support_names:   mix_meta.inferred_support_names,
    pro_state_values: {
      pro_positive:    Math.round((profile.pro_positive    ?? 0) * 100),
      pro_recovery:    Math.round((profile.pro_recovery    ?? 0) * 100),
      pro_mild_stress: Math.round((profile.pro_mild_stress ?? 0) * 100),
      pro_stress:      Math.round((profile.pro_stress      ?? 0) * 100),
    },
    layer_breakdown: {
      support_count:     mix_meta.support_count,
      challenge_count:   mix_meta.challenge_count,
      cumulative_load:   mix_meta.cumulative_challenge_load,
      buffered_threshold,
      reserve_capacity,
      dysfunction_score,
      health_score,
    },
  };
}
