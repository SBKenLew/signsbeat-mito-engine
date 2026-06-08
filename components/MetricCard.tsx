interface MetricCardProps {
  label: string;
  value: string;
  sublabel?: string;
  color?: "green" | "yellow" | "red" | "blue" | "purple";
}

const COLOR_MAP = {
  green:  "text-emerald-400",
  yellow: "text-yellow-400",
  red:    "text-red-400",
  blue:   "text-sky-400",
  purple: "text-violet-400",
};

export default function MetricCard({ label, value, sublabel, color = "purple" }: MetricCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex flex-col gap-1">
      <span className="text-xs text-white/50 uppercase tracking-wide">{label}</span>
      <span className={`text-2xl font-bold ${COLOR_MAP[color]}`}>{value}</span>
      {sublabel && <span className="text-xs text-white/40">{sublabel}</span>}
    </div>
  );
}
