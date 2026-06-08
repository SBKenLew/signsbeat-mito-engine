import type { EngineResult } from "@/lib/engine";

interface Props { result: EngineResult }

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const ROW_CLASSES = "flex justify-between items-center py-1.5 border-b border-white/5";

export default function LayerResults({ result }: Props) {
  const lb = result.layer_breakdown;
  const pv = result.pro_state_values;

  const isPositive = result.is_positive;
  const verdictColor = isPositive ? "text-emerald-400" : "text-red-400";

  return (
    <div className="w-full flex flex-col gap-3">

      {/* Layer 2 — Dynamic Response Status */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Layer 2 — Dynamic Response Status</p>
        <p className={`text-sm font-semibold ${verdictColor}`}>{result.dynamic_response_status}</p>
      </div>

      {/* Layer 4 — Reserve Capacity */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/40 uppercase tracking-wide">Layer 4 — Reserve Capacity</p>
          <span className="text-white font-bold text-sm">{result.reserve_capacity_score}</span>
        </div>
        <Bar pct={lb.reserve_capacity * 100} color="bg-violet-400" />
        <div className={`${ROW_CLASSES} mt-2 text-xs`}>
          <span className="text-white/40">Cumulative Challenge Load</span>
          <span className="text-white/70">{result.cumulative_challenge_load}</span>
        </div>
        <div className={`${ROW_CLASSES} text-xs`}>
          <span className="text-white/40">Buffered Threshold</span>
          <span className="text-white/70">{lb.buffered_threshold.toFixed(1)} hrs</span>
        </div>
        <p className="text-xs text-white/30 mt-2">
          Each Support ActionName expands threshold by 10% — {lb.support_count} support item(s) active
        </p>
      </div>

      {/* Adaptation Score */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/40 uppercase tracking-wide">Adaptation Score</p>
          <span className="text-sky-400 font-bold text-sm">{result.adaptation_score}×</span>
        </div>
        <p className="text-xs text-white/30 mt-1">Pro_Recovery Gain ÷ Pro_Stress Generated</p>
        <Bar pct={Math.min(result.adaptation_score * 25, 100)} color="bg-sky-400" />
      </div>

      {/* Pro_State Values */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Pro_State Telemetry</p>
        {[
          { label: "Pro_Positive",   val: pv.pro_positive,   color: "bg-emerald-400", text: "text-emerald-400" },
          { label: "Pro_Recovery",   val: pv.pro_recovery,   color: "bg-sky-400",     text: "text-sky-400" },
          { label: "Pro_MildStress", val: pv.pro_mild_stress, color: "bg-yellow-400", text: "text-yellow-400" },
          { label: "Pro_Stress",     val: pv.pro_stress,     color: "bg-red-400",     text: "text-red-400" },
        ].map((ps) => (
          <div key={ps.label} className="mb-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-white/50">{ps.label}</span>
              <span className={`text-sm font-bold ${ps.text}`}>{ps.val}%</span>
            </div>
            <Bar pct={ps.val} color={ps.color} />
          </div>
        ))}
      </div>

      {/* Layer 7 — Dysfunction Probability */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between items-center">
          <p className="text-xs text-white/40 uppercase tracking-wide">Layer 7 — Dysfunction Probability</p>
          <span className={`text-sm font-bold ${lb.dysfunction_score >= 50 ? "text-red-400" : lb.dysfunction_score >= 20 ? "text-yellow-400" : "text-emerald-400"}`}>
            {result.dysfunction_probability}
          </span>
        </div>
        <Bar pct={lb.dysfunction_score} color={lb.dysfunction_score >= 50 ? "bg-red-400" : lb.dysfunction_score >= 20 ? "bg-yellow-400" : "bg-emerald-400"} />
      </div>

      {/* Layer 8 — Final Mito Health */}
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-3">Layer 8 — Score Breakdown</p>
        {[
          { label: "Rising Pro_Recovery",     active: (result.pro_state_values.pro_recovery > 50), pts: 25 },
          { label: "Improved HRV",            active: false, pts: 20 },
          { label: "Improved Sleep",          active: false, pts: 15 },
          { label: "Faster Recovery",         active: result.is_positive, pts: 20 },
          { label: "Multi-challenge synergy", active: lb.challenge_count >= 2 && result.is_positive, pts: 20 },
        ].map((row) => (
          <div key={row.label} className={`${ROW_CLASSES} text-xs`}>
            <span className={row.active ? "text-white/70" : "text-white/20"}>{row.label}</span>
            <span className={row.active ? "text-emerald-400 font-semibold" : "text-white/20"}>
              {row.active ? `+${row.pts}` : `—`}
            </span>
          </div>
        ))}
        <div className="flex justify-between items-center pt-2 mt-1">
          <span className="text-white/60 text-sm font-semibold">Final Mito Health Score</span>
          <span className="text-white font-bold text-base">{result.final_mito_health_score}</span>
        </div>
        <Bar pct={lb.health_score} color="bg-emerald-400" />
      </div>

    </div>
  );
}
