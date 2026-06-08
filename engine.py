"""
Signsbeat Multi-Input Mitochondrial Intelligence Engine
Fixed reference implementation — all 8 layers corrected.

Fixes applied vs PDF spec:
  1. Layer numbering: second "Layer 4" renamed to Layer 5 (Redox Resilience).
  2. Layer 3 (Adaptation Score) — implemented (was specified but absent from code).
  3. Layer 5 (Redox Resilience) — implemented (was missing).
  4. Layer 6 (Metabolic Flexibility) — implemented (was missing).
  5. layer4_composite_reserve_capacity: division-by-zero guard on buffered_threshold.
  6. layer2_validate_composite_response: explicit no-intervention branch (was a silent fall-through).
  7. layer8_calculate_composite_health: multi-challenge bonus only awarded when recovery
     is NOT suppressed; double-penalty for suppression under multi-challenge reduced.
"""

import numpy as np
from typing import Dict, Any, List


class SignsbeatMultiInputMitochondrialEngine:

    def __init__(self):
        self.intervention_registry = {
            "mitochondrial_support": [
                "sleep", "coq10", "pqq", "creatine", "magnesium",
                "omega-3", "nac", "glycine", "protein_optimization",
            ],
            "mitochondrial_challenge": [
                "fasting", "ketogenic_diet", "exercise", "hiit",
                "sauna", "cold_plunge", "hbot", "red_light_therapy",
            ],
        }

    # ── Layer 1 ───────────────────────────────────────────────────────────────
    def layer1_process_daily_mix(self, interventions: List[Dict[str, Any]]) -> Dict[str, Any]:
        support_items, challenge_items = [], []
        cumulative_challenge_load = 0.0

        for item in interventions:
            name_lower = item["name"].lower().replace(" ", "_")
            load = item.get("load_hours", 1.0)
            if name_lower in self.intervention_registry["mitochondrial_support"]:
                support_items.append(name_lower)
            elif name_lower in self.intervention_registry["mitochondrial_challenge"]:
                challenge_items.append(name_lower)
                cumulative_challenge_load += load

        return {
            "support_count": len(support_items),
            "challenge_count": len(challenge_items),
            "cumulative_challenge_load": cumulative_challenge_load,
            "has_support": len(support_items) > 0,
            "has_challenge": len(challenge_items) > 0,
        }

    # ── Layer 2 ───────────────────────────────────────────────────────────────
    def layer2_validate_composite_response(
        self,
        mix_meta: Dict[str, Any],
        metrics_delta: Dict[str, float],
    ) -> Dict[str, Any]:
        pro_recovery_delta = metrics_delta.get("pro_recovery", 0.0)
        is_persistent_stress = metrics_delta.get("persistent_stress", False)

        # FIX: explicit no-intervention branch (original fell through silently)
        if not mix_meta["has_challenge"] and not mix_meta["has_support"]:
            return {"status": "Baseline — No Active Intervention", "is_positive": True}

        if mix_meta["has_challenge"] and mix_meta["has_support"]:
            if is_persistent_stress:
                return {
                    "status": "Critical Limitation: Persistent Stress Despite Support Buffering",
                    "is_positive": False,
                }
            if pro_recovery_delta > 1.5:
                return {"status": "Optimized Co-Intervention Rebound", "is_positive": True}
            return {"status": "Buffered Challenge — Monitor Trend", "is_positive": True}

        if mix_meta["has_challenge"] and not mix_meta["has_support"]:
            if not is_persistent_stress and pro_recovery_delta > 0:
                return {"status": "Positive Adaptation Rebound", "is_positive": True}
            if is_persistent_stress:
                return {"status": "Potential Mitochondrial Limitation", "is_positive": False}
            return {"status": "Challenge Tolerated — No Rebound Yet", "is_positive": False}

        # Support only, no challenge
        if pro_recovery_delta > 0 and metrics_delta.get("pro_stress", 0.0) <= 0:
            return {"status": "Positive Pure Support Response", "is_positive": True}
        return {"status": "Support Active — Insufficient Response Signal", "is_positive": False}

    # ── Layer 3 (FIX: was specified but not implemented) ──────────────────────
    def layer3_adaptation_score(
        self,
        previous_pro_recovery: float,
        current_pro_recovery: float,
        stress_generated: float,
    ) -> float:
        """Adaptation Score = Recovery Gain / Stress Generated (centred to 0–100)."""
        recovery_gain = current_pro_recovery - previous_pro_recovery
        if stress_generated <= 0:
            return 100.0 if recovery_gain > 0 else 50.0
        raw_ratio = recovery_gain / stress_generated
        return float(np.clip(raw_ratio * 50 + 50, 0.0, 100.0))

    # ── Layer 4: Reserve Capacity ─────────────────────────────────────────────
    def layer4_composite_reserve_capacity(
        self,
        cumulative_load: float,
        base_threshold: float,
        support_count: int,
    ) -> float:
        # FIX: guard against zero base_threshold
        effective_base = base_threshold if base_threshold > 0 else 16.0
        buffered_threshold = effective_base * (1.0 + support_count * 0.10)
        if cumulative_load > buffered_threshold:
            decrement = min(1.0, (cumulative_load - buffered_threshold) / buffered_threshold)
            return float(max(0.0, 1.0 - decrement))
        return 1.0

    # ── Layer 5: Redox Resilience (FIX: was mislabelled Layer 4 and not coded) ──
    def layer5_redox_resilience(
        self,
        hrv_trend: float,
        persistent_stress: bool,
        pro_recovery_delta: float,
    ) -> Dict[str, Any]:
        score = 50.0
        if hrv_trend > 0:         score += 20.0
        if not persistent_stress: score += 15.0
        if pro_recovery_delta > 0: score += 15.0
        if persistent_stress:      score -= 30.0
        if hrv_trend < -1:         score -= 20.0
        clamped = float(np.clip(score, 0.0, 100.0))
        if clamped >= 70:
            phenotype = "Healthy — Rapid Over-Compensatory Rebound"
        elif clamped >= 40:
            phenotype = "Transitional — Partial ROS Clearance"
        else:
            phenotype = "Dysfunctional — Sustained Unmitigated Stress"
        return {"score": clamped, "phenotype": phenotype}

    # ── Layer 6: Metabolic Flexibility (FIX: was specified but not implemented) ──
    def layer6_metabolic_flexibility(
        self,
        substrate_shifts: int,
        glucose_volatility: float,
        hrv_trend: float,
    ) -> Dict[str, Any]:
        score = 50.0
        score += min(substrate_shifts * 10, 30)
        score -= min(glucose_volatility * 5, 30)
        if hrv_trend > 0: score += 10.0
        clamped = float(np.clip(score, 0.0, 100.0))
        flexibility_class = (
            "Flexible" if clamped >= 70
            else "Moderately Flexible" if clamped >= 40
            else "Inflexible"
        )
        return {"score": clamped, "flexibility_class": flexibility_class}

    # ── Layer 7 ───────────────────────────────────────────────────────────────
    def layer7_calculate_composite_dysfunction(
        self,
        risk_factors: Dict[str, Any],
        mix_meta: Dict[str, Any],
        validation_status: str,
    ) -> float:
        score = 0.0
        if risk_factors.get("persistent_pro_stress", False): score += 30.0
        if risk_factors.get("declining_hrv", False):         score += 20.0
        if risk_factors.get("poor_sleep", False):            score += 20.0
        if mix_meta["has_support"] and "Critical Limitation" in validation_status:
            score += 30.0
        return float(np.clip(score, 0.0, 100.0))

    # ── Layer 8 ───────────────────────────────────────────────────────────────
    def layer8_calculate_composite_health(
        self,
        metrics: Dict[str, Any],
        mix_meta: Dict[str, Any],
    ) -> float:
        pos_score = 0.0
        if metrics.get("rising_pro_recovery", False): pos_score += 25.0
        if metrics.get("improved_hrv", False):        pos_score += 20.0
        if metrics.get("improved_sleep", False):      pos_score += 15.0
        if metrics.get("faster_recovery", False):     pos_score += 20.0

        # FIX: bonus only when recovery is NOT suppressed
        if (
            mix_meta["challenge_count"] >= 2
            and metrics.get("faster_recovery", False)
            and not metrics.get("recovery_suppression", False)
        ):
            pos_score += 20.0

        neg_penalty = 0.0
        if metrics.get("persistent_pro_stress", False): neg_penalty += 35.0
        if metrics.get("recovery_suppression", False):   neg_penalty += 35.0

        # FIX: reduced from 20 to 10 to avoid excessive stacking
        if (
            mix_meta["challenge_count"] >= 2
            and metrics.get("recovery_suppression", False)
            and not metrics.get("persistent_pro_stress", False)
        ):
            neg_penalty += 10.0

        return float(np.clip(pos_score - neg_penalty, 0.0, 100.0))

    # ── Orchestrator ──────────────────────────────────────────────────────────
    def evaluate_daily_mitochondrial_health(self, daily_profile: Dict[str, Any]) -> Dict[str, Any]:
        interventions = daily_profile.get("interventions", [])
        metrics_delta = daily_profile.get("metrics_delta", {})

        mix_meta = self.layer1_process_daily_mix(interventions)
        validation = self.layer2_validate_composite_response(mix_meta, metrics_delta)

        prev_rec = daily_profile.get("previous_pro_recovery", 0.0)
        curr_rec = daily_profile.get("current_pro_recovery", prev_rec + metrics_delta.get("pro_recovery", 0.0))
        adaptation = self.layer3_adaptation_score(prev_rec, curr_rec, abs(metrics_delta.get("pro_stress", 0.0)))

        reserve_cap = self.layer4_composite_reserve_capacity(
            cumulative_load=mix_meta["cumulative_challenge_load"],
            base_threshold=daily_profile.get("base_threshold_hours", 16.0),
            support_count=mix_meta["support_count"],
        )

        hrv = daily_profile.get("hrv_trend", 0.0)
        sleep = daily_profile.get("sleep_trend", 0.0)
        redox = self.layer5_redox_resilience(hrv, metrics_delta.get("persistent_stress", False), metrics_delta.get("pro_recovery", 0.0))
        metabolic = self.layer6_metabolic_flexibility(daily_profile.get("substrate_shifts", 1), daily_profile.get("glucose_volatility", 0.0), hrv)

        risk_factors = {
            "persistent_pro_stress": metrics_delta.get("persistent_stress", False),
            "declining_hrv": hrv < 0,
            "poor_sleep": sleep < 0,
        }
        dysfunction_prob = self.layer7_calculate_composite_dysfunction(risk_factors, mix_meta, validation["status"])

        health_inputs = {
            "rising_pro_recovery": metrics_delta.get("pro_recovery", 0.0) > 0,
            "improved_hrv": hrv > 0,
            "improved_sleep": sleep > 0,
            "faster_recovery": validation["is_positive"],
            "recovery_suppression": metrics_delta.get("pro_recovery", 0.0) < -0.5,
            "persistent_pro_stress": metrics_delta.get("persistent_stress", False),
        }
        final_health = self.layer8_calculate_composite_health(health_inputs, mix_meta)

        return {
            "Profile": f"Challenges: {mix_meta['challenge_count']} | Supports: {mix_meta['support_count']}",
            "Composite Load": mix_meta["cumulative_challenge_load"],
            "Response Status": validation["status"],
            "Adaptation Score (L3)": f"{adaptation:.1f}%",
            "Reserve Capacity Score (L4)": f"{round(reserve_cap * 100, 1)}%",
            "Redox Resilience Score (L5)": f"{redox['score']:.1f}% — {redox['phenotype']}",
            "Metabolic Flexibility Score (L6)": f"{metabolic['score']:.1f}% — {metabolic['flexibility_class']}",
            "Dysfunction Probability (L7)": f"{dysfunction_prob:.1f}%",
            "Mitochondrial Health Score (L8)": f"{final_health:.1f}%",
        }


# ── Quick smoke test ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    engine = SignsbeatMultiInputMitochondrialEngine()
    profile = {
        "interventions": [
            {"name": "exercise", "load_hours": 1.5},
            {"name": "hiit", "load_hours": 0.5},
            {"name": "sleep", "load_hours": 8},
            {"name": "magnesium", "load_hours": 1},
            {"name": "omega-3", "load_hours": 1},
        ],
        "metrics_delta": {"pro_recovery": 2.1, "pro_stress": 0.3, "persistent_stress": False},
        "hrv_trend": 3.5,
        "sleep_trend": 0.8,
        "base_threshold_hours": 16,
        "previous_pro_recovery": 5.0,
        "current_pro_recovery": 7.1,
        "substrate_shifts": 2,
        "glucose_volatility": 0.5,
    }
    result = engine.evaluate_daily_mitochondrial_health(profile)
    for k, v in result.items():
        print(f"{k:40s} {v}")
