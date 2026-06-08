"use client";

interface ScoreGaugeProps {
  score: number; // 0-100
  state: "Recovery" | "MildStress" | "Stress" | "Baseline";
}

const STATE_COLORS: Record<string, { ring: string; badge: string; text: string }> = {
  Recovery:   { ring: "#4ADE80", badge: "bg-emerald-400/20 text-emerald-300", text: "text-emerald-300" },
  MildStress: { ring: "#FACC15", badge: "bg-yellow-400/20 text-yellow-300",  text: "text-yellow-300" },
  Stress:     { ring: "#F87171", badge: "bg-red-400/20 text-red-300",         text: "text-red-300" },
  Baseline:   { ring: "#94A3B8", badge: "bg-slate-400/20 text-slate-300",     text: "text-slate-300" },
};

export default function ScoreGauge({ score, state }: ScoreGaugeProps) {
  const colors = STATE_COLORS[state] ?? STATE_COLORS.Baseline;
  const radius = 80;
  const stroke = 10;
  const circumference = 2 * Math.PI * radius;
  const dash = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-48 h-48 flex items-center justify-center">
        <svg
          className="absolute inset-0 w-full h-full -rotate-90"
          viewBox="0 0 200 200"
        >
          {/* Track */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={stroke}
          />
          {/* Progress */}
          <circle
            cx="100" cy="100" r={radius}
            fill="none"
            stroke={colors.ring}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            style={{ transition: "stroke-dasharray 0.8s ease" }}
          />
        </svg>
        <div className="flex flex-col items-center z-10">
          <span className="text-5xl font-bold text-white leading-none">{Math.round(score)}</span>
          <span className="text-sm text-white/60 mt-1">Health Score</span>
        </div>
      </div>

      {/* State badge */}
      <span className={`px-4 py-1 rounded-full text-sm font-semibold ${colors.badge} backdrop-blur-sm border border-white/10`}>
        {state}
      </span>
    </div>
  );
}
