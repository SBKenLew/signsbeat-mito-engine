// Signsbeat Multi-Input Mitochondrial Intelligence Engine v2
// Redesigned around ActionName classification, Pro_State evaluation, and T-1 hormetic response logic

export interface Action {
  name: string;
  classification: "support" | "challenge" | "unknown";
  load_hours: number;
}

export interface DayData {
  date: string;
  actions: Action[];
  pro_positive: number;    // 0–1
  pro_recovery: number;    // 0–1
  pro_mild_stress: number; // 0–1
  pro_stress: number;      // 0–1
}

export interface ProStateDelta {
  pro_positive_delta: number;
  pro_recovery_delta: number;
  pro_mild_stress_delta: number;
  pro_stress_delta: number;
}

export interface EngineResult {
  mito_health_score: number;          // 0–100
  pro_state: ProStateLabel;
  adaptation_verdict: string;
  hormetic_status: HormeticStatus;
  mild_stress_interpretation: string;
  support_actions: string[];
  challenge_actions: string[];
  unknown_actions: string[];
  pro_state_values: { pro_positive: number; pro_recovery: number; pro_mild_stress: number; pro_stress: number };
  pro_state_deltas: ProStateDelta;
  score_breakdown: ScoreBreakdown;
}

export type ProStateLabel = "Pro_Recovery" | "Pro_Positive" | "Pro_MildStress" | "Pro_Stress" | "Baseline";
export type HormeticStatus = "Optimal" | "Under-Hormetic" | "Over-Hormetic" | "No Challenge";

export interface ScoreBreakdown {
  base_score: number;
  challenge_adaptation_bonus: number;
  resilience_bonus: number;
  over_hormetic_penalty: number;
  support_buffer_bonus: number;
  final: number;
}

// ── Intervention Registry ─────────────────────────────────────────────────────

const SUPPORT_KEYWORDS = new Set([
  "sleep", "coq10", "pqq", "creatine", "magnesium", "omega-3", "omega3",
  "nac", "glycine", "protein", "protein_optimization", "zinc", "vitamin_d",
  "vitamin_c", "ashwagandha", "l-theanine", "ltheanine", "melatonin",
  "berberine", "nmn", "nad", "probiotics", "fish_oil", "multivitamin",
  "rest", "recovery", "meditation", "breathwork", "massage",
]);

const CHALLENGE_KEYWORDS = new Set([
  "exercise", "hiit", "fasting", "intermittent_fasting", "ketogenic", "keto",
  "ketogenic_diet", "sauna", "infrared_sauna", "cold_plunge", "cold_water",
  "cwi", "hbot", "hyperbaric", "red_light", "red_light_therapy",
  "resistance", "strength", "weight_training", "cardio", "aerobic",
  "running", "cycling", "swimming", "zone_2", "sprints", "crossfit",
  "vo2max", "tempo", "lactate_threshold",
]);

export function classifyAction(name: string): "support" | "challenge" | "unknown" {
  const key = name.toLowerCase().trim().replace(/[\s\-\/]+/g, "_");
  if (SUPPORT_KEYWORDS.has(key)) return "support";
  if (CHALLENGE_KEYWORDS.has(key)) return "challenge";
  // partial match
  const supportArr = Array.from(SUPPORT_KEYWORDS);
  const challengeArr = Array.from(CHALLENGE_KEYWORDS);
  for (const s of supportArr) { if (key.includes(s) || s.includes(key)) return "support"; }
  for (const c of challengeArr) { if (key.includes(c) || c.includes(key)) return "challenge"; }
  return "unknown";
}

// ── Pro_State label from values ───────────────────────────────────────────────

export function dominantProState(
  pro_positive: number,
  pro_recovery: number,
  pro_mild_stress: number,
  pro_stress: number,
): ProStateLabel {
  if (pro_positive === 0 && pro_recovery === 0 && pro_mild_stress === 0 && pro_stress === 0) return "Baseline";
  const candidates: [number, ProStateLabel][] = [
    [pro_positive,    "Pro_Positive"],
    [pro_recovery,    "Pro_Recovery"],
    [pro_mild_stress, "Pro_MildStress"],
    [pro_stress,      "Pro_Stress"],
  ];
  return candidates.reduce((best, cur) => (cur[0] > best[0] ? cur : best))[1];
}

// ── Hormetic status ───────────────────────────────────────────────────────────

function hormeticStatus(
  challenge_count: number,
  pro_stress: number,
  pro_stress_delta: number,
  pro_recovery_delta: number,
): HormeticStatus {
  if (challenge_count === 0) return "No Challenge";
  // Over-hormetic: many challenges AND stress rising/high
  if (challenge_count >= 3 && pro_stress > 0.30) return "Over-Hormetic";
  if (pro_stress_delta > 0.10 && pro_recovery_delta <= 0) return "Over-Hormetic";
  // Under-hormetic: challenges present but no meaningful stress OR recovery response
  if (pro_stress < 0.10 && pro_recovery_delta <= 0) return "Under-Hormetic";
  return "Optimal";
}

// ── MildStress dual interpretation ───────────────────────────────────────────

function interpretMildStress(
  pro_mild_stress_delta: number,
  prev_pro_stress: number,
  challenge_count: number,
): string {
  if (pro_mild_stress_delta <= 0) return "Pro_MildStress stable or decreasing — no active hormetic transition";
  if (prev_pro_stress > 0.25) {
    return "Resilience Building — same stressor previously triggered Pro_Stress; body now only reaches Pro_MildStress (positive adaptation)";
  }
  if (challenge_count > 0) {
    return "Under-Hormetic — challenge is sub-threshold; body is not fully stressed; consider increasing stressor intensity";
  }
  return "Pro_MildStress elevated without active challenge — monitor recovery inputs";
}

// ── Core Mito Health Scoring ──────────────────────────────────────────────────

function scoreMitoHealth(
  current: DayData,
  prev: DayData | null,
  delta: ProStateDelta,
  challenge_count: number,
  support_count: number,
  hormetic: HormeticStatus,
): ScoreBreakdown {
  // Base score: weighted sum of current Pro_State values
  // Pro_Positive is the ultimate positive signal → highest weight
  const base_score = clamp(
    current.pro_positive * 40 + current.pro_recovery * 30,
    0, 70
  );

  // Challenge adaptation bonus (T-1 response)
  let challenge_adaptation_bonus = 0;
  if (challenge_count > 0) {
    if (delta.pro_recovery_delta > 0 && delta.pro_positive_delta > 0) {
      // Full adaptation: both Recovery and Positive rising → best outcome
      challenge_adaptation_bonus = 20;
    } else if (delta.pro_recovery_delta > 0) {
      // Partial adaptation: Recovery rising
      challenge_adaptation_bonus = 12;
    } else if (delta.pro_positive_delta > 0) {
      // Positive rising without explicit recovery delta — still good
      challenge_adaptation_bonus = 10;
    }
    // Additional bonus: can the body tolerate higher load AND recover?
    if (challenge_count >= 2 && delta.pro_recovery_delta > 0.05 && hormetic === "Optimal") {
      challenge_adaptation_bonus += 10; // high stressor tolerance + recovery = highest score
    }
  }

  // Resilience bonus: MildStress ↑ from a previously high-stress state = positive adaptation
  let resilience_bonus = 0;
  if (
    delta.pro_mild_stress_delta > 0 &&
    prev !== null &&
    prev.pro_stress > 0.25 &&
    challenge_count > 0
  ) {
    resilience_bonus = 8; // same stressor, downgraded response = resilience gained
  }
  // Support + good recovery = buffer bonus
  const support_buffer_bonus = (support_count > 0 && current.pro_recovery > 0.50) ? 5 : 0;

  // Over-hormetic penalty: Pro_Stress spikes despite (or due to) challenges
  let over_hormetic_penalty = 0;
  if (hormetic === "Over-Hormetic") {
    over_hormetic_penalty = challenge_count >= 3 ? 30 : 20;
  }
  if (delta.pro_stress_delta > 0.15) {
    over_hormetic_penalty += 10; // acute stress spike adds extra penalty
  }

  const raw = base_score + challenge_adaptation_bonus + resilience_bonus + support_buffer_bonus - over_hormetic_penalty;
  return {
    base_score: round(base_score),
    challenge_adaptation_bonus: round(challenge_adaptation_bonus),
    resilience_bonus: round(resilience_bonus),
    over_hormetic_penalty: round(over_hormetic_penalty),
    support_buffer_bonus: round(support_buffer_bonus),
    final: round(clamp(raw, 0, 100)),
  };
}

// ── Adaptation verdict ────────────────────────────────────────────────────────

function adaptationVerdict(
  challenge_count: number,
  delta: ProStateDelta,
  hormetic: HormeticStatus,
  pro_state: ProStateLabel,
): string {
  if (challenge_count === 0 && pro_state === "Baseline") return "No interventions logged — score is 0";
  if (challenge_count === 0) return "Support-only protocol — no hormetic stimulus applied";

  if (hormetic === "Over-Hormetic") {
    return `Over-hormetic: ${challenge_count} challenge(s) exceeded mitochondrial tolerance → Pro_Stress elevated. Reduce challenge load or add support interventions.`;
  }
  if (delta.pro_recovery_delta > 0 && delta.pro_positive_delta > 0) {
    return "Full adaptation cycle: Challenge → Pro_Recovery ↑ → Pro_Positive ↑ — optimal mitochondrial response";
  }
  if (delta.pro_recovery_delta > 0) {
    return "Positive adaptation: Challenge → Pro_Recovery ↑ — continue current protocol";
  }
  if (delta.pro_mild_stress_delta > 0 && delta.pro_stress_delta <= 0) {
    return "Transitional response: Challenge → Pro_MildStress ↑ — body building resilience or stressor is sub-threshold";
  }
  if (delta.pro_stress_delta > 0) {
    return "Acute stress response: Pro_Stress ↑ — monitor T-1; expected recovery rebound if mitochondria are healthy";
  }
  return "Neutral response — no significant Pro_State shift detected";
}

// ── Main evaluator ────────────────────────────────────────────────────────────

export function evaluateDayData(current: DayData, prev: DayData | null): EngineResult {
  const support_actions   = current.actions.filter(a => a.classification === "support").map(a => a.name);
  const challenge_actions = current.actions.filter(a => a.classification === "challenge").map(a => a.name);
  const unknown_actions   = current.actions.filter(a => a.classification === "unknown").map(a => a.name);

  const challenge_count = challenge_actions.length;
  const support_count   = support_actions.length;

  const delta: ProStateDelta = prev
    ? {
        pro_positive_delta:    current.pro_positive    - prev.pro_positive,
        pro_recovery_delta:    current.pro_recovery    - prev.pro_recovery,
        pro_mild_stress_delta: current.pro_mild_stress - prev.pro_mild_stress,
        pro_stress_delta:      current.pro_stress      - prev.pro_stress,
      }
    : { pro_positive_delta: 0, pro_recovery_delta: 0, pro_mild_stress_delta: 0, pro_stress_delta: 0 };

  const hormetic = hormeticStatus(challenge_count, current.pro_stress, delta.pro_stress_delta, delta.pro_recovery_delta);
  const mild_stress_interpretation = interpretMildStress(delta.pro_mild_stress_delta, prev?.pro_stress ?? 0, challenge_count);
  const score_breakdown = scoreMitoHealth(current, prev, delta, challenge_count, support_count, hormetic);
  const pro_state = dominantProState(current.pro_positive, current.pro_recovery, current.pro_mild_stress, current.pro_stress);
  const adaptation_verdict = adaptationVerdict(challenge_count, delta, hormetic, pro_state);

  return {
    mito_health_score: score_breakdown.final,
    pro_state,
    adaptation_verdict,
    hormetic_status: hormetic,
    mild_stress_interpretation,
    support_actions,
    challenge_actions,
    unknown_actions,
    pro_state_values: {
      pro_positive:    round(current.pro_positive * 100),
      pro_recovery:    round(current.pro_recovery * 100),
      pro_mild_stress: round(current.pro_mild_stress * 100),
      pro_stress:      round(current.pro_stress * 100),
    },
    pro_state_deltas: {
      pro_positive_delta:    round(delta.pro_positive_delta * 100),
      pro_recovery_delta:    round(delta.pro_recovery_delta * 100),
      pro_mild_stress_delta: round(delta.pro_mild_stress_delta * 100),
      pro_stress_delta:      round(delta.pro_stress_delta * 100),
    },
    score_breakdown,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) { return Math.min(max, Math.max(min, v)); }
function round(v: number) { return Math.round(v * 10) / 10; }
