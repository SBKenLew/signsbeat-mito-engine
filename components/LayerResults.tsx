import { EngineResult } from "@/lib/engine";

interface LayerResultsProps {
  result: EngineResult;
}

function bar(pct: number, color: string) {
  return (
    <div className="w-full bg-white/10 rounded-full h-2 mt-1">
      <div
        className={`h-2 rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

function parseNum(s: string) {
  return parseFloat(s.replace("%", "")) || 0;
}

export default function LayerResults({ result }: LayerResultsProps) {
  const layers = [
    {
      label: "L3 — Adaptation Score",
      value: result.adaptation_score,
      pct: parseNum(result.adaptation_score),
      color: "bg-sky-400",
      desc: "Recovery Gain / Stress Generated",
    },
    {
      label: "L5 — Redox Resilience",
      value: result.redox_resilience_score,
      pct: parseNum(result.redox_resilience_score),
      color: "bg-amber-400",
      desc: result.layer_breakdown.layer5_redox.phenotype,
    },
    {
      label: "L6 — Metabolic Flexibility",
      value: result.metabolic_flexibility_score,
      pct: parseNum(result.metabolic_flexibility_score),
      color: "bg-teal-400",
      desc: result.layer_breakdown.layer6_metabolic.flexibility_class,
    },
    {
      label: "L8 — Mito Health Score",
      value: result.mitochondrial_health_score,
      pct: parseNum(result.mitochondrial_health_score),
      color: "bg-emerald-400",
      desc: "Final composite intelligence score",
    },
  ];

  return (
    <div className="w-full flex flex-col gap-3">
      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Response Status</p>
        <p className={`text-sm font-semibold ${result.is_positive ? "text-emerald-400" : "text-red-400"}`}>
          {result.response_status}
        </p>
        <p className="text-xs text-white/40 mt-1">{result.profile} · Load: {result.composite_load.toFixed(1)}h</p>
      </div>

      {layers.map((l) => (
        <div key={l.label} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10">
          <div className="flex justify-between items-center">
            <span className="text-xs text-white/50 uppercase tracking-wide">{l.label}</span>
            <span className="text-sm font-bold text-white">{l.value}</span>
          </div>
          {bar(l.pct, l.color)}
          <p className="text-xs text-white/30 mt-1">{l.desc}</p>
        </div>
      ))}
    </div>
  );
}
