import type { EngineResult } from "@/lib/engine";

interface Props { result: EngineResult }

function DeltaTag({ val }: { val: number }) {
  if (val === 0) return <span className="text-white/30 text-xs">→ 0</span>;
  return (
    <span className={`text-xs font-semibold ${val > 0 ? "text-emerald-400" : "text-red-400"}`}>
      {val > 0 ? "↑" : "↓"} {Math.abs(val)}%
    </span>
  );
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all duration-700 ${color}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

const PRO_STATE_COLORS: Record<string, string> = {
  Pro_Positive:   "bg-emerald-400",
  Pro_Recovery:   "bg-sky-400",
  Pro_MildStress: "bg-yellow-400",
  Pro_Stress:     "bg-red-400",
};

const HORMETIC_COLORS: Record<string, string> = {
  "Optimal":        "text-emerald-400",
  "Under-Hormetic": "text-yellow-400",
  "Over-Hormetic":  "text-red-400",
  "No Challenge":   "text-white/40",
};

export default function LayerResults({ result }: Props) {
  const { pro_state_values: v, pro_state_deltas: d } = result;

  const proStates = [
    { label: "Pro_Positive",   value: v.pro_positive,   delta: d.pro_positive_delta,   color: "bg-emerald-400" },
    { label: "Pro_Recovery",   value: v.pro_recovery,   delta: d.pro_recovery_delta,   color: "bg-sky-400" },
    { label: "Pro_MildStress", value: v.pro_mild_stress, delta: d.pro_mild_stress_delta, color: "bg-yellow-400" },
    { label: "Pro_Stress",     value: v.pro_stress,     delta: d.pro_stress_delta,     color: "bg-red-400" },
  ];

  return (
    <div className="w-full flex flex-col gap-3">

      {/* Adaptation Verdict */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Adaptation Verdict</p>
        <p className={`text-sm font-semibold ${result.adaptation_verdict.startsWith("Full") || result.adaptation_verdict.startsWith("Positive") ? "text-emerald-400" : result.adaptation_verdict.includes("Over-hormetic") ? "text-red-400" : "text-yellow-300"}`}>
          {result.adaptation_verdict}
        </p>
      </div>

      {/* Hormetic Status + MildStress interpretation */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-white/40 uppercase tracking-wide">Hormetic Status</p>
          <span className={`text-sm font-bold ${HORMETIC_COLORS[result.hormetic_status]}`}>
            {result.hormetic_status}
          </span>
        </div>
        <p className="text-xs text-white/40 leading-relaxed">{result.mild_stress_interpretation}</p>
      </div>

      {/* Pro_State values with T-1 deltas */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Pro_State Values (vs yesterday)</p>
        <div className="flex flex-col gap-3">
          {proStates.map((ps) => (
            <div key={ps.label}>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-semibold ${ps.label === result.pro_state ? "text-white" : "text-white/50"}`}>
                  {ps.label === result.pro_state ? "▶ " : ""}{ps.label}
                </span>
                <div className="flex items-center gap-2">
                  <DeltaTag val={ps.delta} />
                  <span className="text-sm font-bold text-white">{ps.value}%</span>
                </div>
              </div>
              <Bar pct={ps.value} color={ps.label === result.pro_state ? ps.color : "bg-white/20"} />
            </div>
          ))}
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Mito Score Breakdown</p>
        <div className="flex flex-col gap-1 text-sm">
          {[
            { label: "Base (Pro_Positive × 40 + Pro_Recovery × 30)", val: result.score_breakdown.base_score, sign: "+" },
            { label: "Challenge adaptation bonus", val: result.score_breakdown.challenge_adaptation_bonus, sign: "+" },
            { label: "Resilience bonus (MildStress downgrade)", val: result.score_breakdown.resilience_bonus, sign: "+" },
            { label: "Support buffer bonus", val: result.score_breakdown.support_buffer_bonus, sign: "+" },
            { label: "Over-hormetic penalty", val: result.score_breakdown.over_hormetic_penalty, sign: "−" },
          ].map((row) => (
            <div key={row.label} className="flex justify-between items-center py-1 border-b border-white/5">
              <span className="text-white/40 text-xs flex-1 mr-2">{row.label}</span>
              <span className={`text-xs font-semibold tabular-nums ${row.sign === "−" && row.val > 0 ? "text-red-400" : row.val > 0 ? "text-emerald-400" : "text-white/30"}`}>
                {row.sign}{row.val}
              </span>
            </div>
          ))}
          <div className="flex justify-between items-center pt-2">
            <span className="text-white/60 text-xs font-semibold">Final Score</span>
            <span className="text-white font-bold">{result.score_breakdown.final}%</span>
          </div>
        </div>
      </div>

    </div>
  );
}
