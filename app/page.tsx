"use client";

import { useState } from "react";
import ScoreGauge from "@/components/ScoreGauge";
import FileUpload from "@/components/FileUpload";
import LayerResults from "@/components/LayerResults";
import type { EngineResult, ProStateLabel } from "@/lib/engine";

type GaugeState = "Recovery" | "MildStress" | "Stress" | "Baseline";

function toGaugeState(pro: ProStateLabel): GaugeState {
  if (pro === "Pro_Positive" || pro === "Pro_Recovery") return "Recovery";
  if (pro === "Pro_MildStress") return "MildStress";
  if (pro === "Pro_Stress") return "Stress";
  return "Baseline";
}

function today() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const ACTION_CLASS_COLORS = {
  support:   "bg-sky-500/20 text-sky-200 border-sky-400/20",
  challenge: "bg-violet-500/20 text-violet-200 border-violet-400/20",
  unknown:   "bg-white/10 text-white/40 border-white/10",
};

export default function Home() {
  const [result, setResult] = useState<EngineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"upload" | "demo">("upload");

  async function handleFiles(files: File[]) {
    if (files.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json.result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  async function runDemo() {
    setLoading(true);
    setError(null);
    const payload = {
      current: {
        date: "2026-06-08",
        actions: [
          { name: "exercise",  classification: "challenge", load_hours: 1.5 },
          { name: "hiit",      classification: "challenge", load_hours: 0.5 },
          { name: "sleep",     classification: "support",   load_hours: 8 },
          { name: "magnesium", classification: "support",   load_hours: 1 },
          { name: "omega-3",   classification: "support",   load_hours: 1 },
        ],
        pro_positive:    0.72,
        pro_recovery:    0.68,
        pro_mild_stress: 0.18,
        pro_stress:      0.08,
      },
      prev: {
        date: "2026-06-07",
        actions: [],
        pro_positive:    0.55,
        pro_recovery:    0.52,
        pro_mild_stress: 0.22,
        pro_stress:      0.28,
      },
    };
    try {
      const fd = new FormData();
      fd.append("profile", JSON.stringify(payload));
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Demo failed");
      setResult(json.result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const gaugeState: GaugeState = result ? toGaugeState(result.pro_state) : "Baseline";
  const healthScore = result?.mito_health_score ?? 0;
  const allActions = result
    ? [
        ...result.support_actions.map((n) => ({ name: n, cls: "support" as const })),
        ...result.challenge_actions.map((n) => ({ name: n, cls: "challenge" as const })),
        ...result.unknown_actions.map((n) => ({ name: n, cls: "unknown" as const })),
      ]
    : [];

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-gradient-to-b from-[#4A3B8C] via-[#6B5EA8] to-[#8B7FC4]">

      {/* Header */}
      <div className="w-full max-w-md px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-sm">Your Longevity Assistant</p>
          <h1 className="text-white font-bold text-xl leading-tight">
            Signsbeat <span className="text-violet-300">MitoEngine</span>
          </h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white font-bold text-sm">
          SB
        </div>
      </div>

      {/* Score Card */}
      <div className="w-full max-w-md px-5">
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <ScoreGauge score={healthScore} state={gaugeState} />
            <p className="text-white/50 text-sm text-center">{today()}</p>

            {result && (
              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                {/* Pro_Positive */}
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col gap-1">
                  <span className="text-xs text-white/40 uppercase tracking-wide">Pro_Positive</span>
                  <span className="text-2xl font-bold text-emerald-400">{result.pro_state_values.pro_positive}%</span>
                  <span className={`text-xs font-semibold ${result.pro_state_deltas.pro_positive_delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.pro_state_deltas.pro_positive_delta >= 0 ? "↑" : "↓"} {Math.abs(result.pro_state_deltas.pro_positive_delta)}% vs yesterday
                  </span>
                </div>
                {/* Pro_Recovery */}
                <div className="bg-white/10 rounded-2xl p-3 border border-white/10 flex flex-col gap-1">
                  <span className="text-xs text-white/40 uppercase tracking-wide">Pro_Recovery</span>
                  <span className="text-2xl font-bold text-sky-400">{result.pro_state_values.pro_recovery}%</span>
                  <span className={`text-xs font-semibold ${result.pro_state_deltas.pro_recovery_delta >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {result.pro_state_deltas.pro_recovery_delta >= 0 ? "↑" : "↓"} {Math.abs(result.pro_state_deltas.pro_recovery_delta)}% vs yesterday
                  </span>
                </div>
              </div>
            )}

            {!result && (
              <p className="text-white/40 text-sm text-center">
                Upload your Signsbeat CSV or run the demo to see your scores
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detected Actions */}
      {result && allActions.length > 0 && (
        <div className="w-full max-w-md px-5 mt-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-4">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">
              Actions detected in dataset
            </p>
            <div className="flex flex-wrap gap-2">
              {allActions.map(({ name, cls }) => (
                <span key={name} className={`px-3 py-1 rounded-full text-xs font-medium border ${ACTION_CLASS_COLORS[cls]}`}>
                  {cls === "challenge" ? "⚡ " : cls === "support" ? "✦ " : ""}
                  {name.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <div className="flex gap-3 mt-3 text-xs text-white/30">
              <span>✦ Support</span>
              <span>⚡ Challenge (Hormetic)</span>
            </div>
          </div>
        </div>
      )}

      {result && allActions.length === 0 && (
        <div className="w-full max-w-md px-5 mt-4">
          <div className="bg-red-500/10 backdrop-blur-xl rounded-3xl border border-red-400/20 p-4">
            <p className="text-sm text-red-300">
              No actions detected. Ensure your CSV has an <span className="text-white/70">ActionName</span> column with intervention names.
            </p>
          </div>
        </div>
      )}

      {/* Input Section */}
      <div className="w-full max-w-md px-5 mt-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5">
          <div className="flex gap-2 mb-4">
            {(["upload", "demo"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all
                  ${tab === t ? "bg-white/20 text-white" : "text-white/40 hover:text-white/60"}`}
              >
                {t === "upload" ? "Upload Files" : "Run Demo"}
              </button>
            ))}
            {result && (
              <button
                onClick={() => { setResult(null); setError(null); }}
                className="py-2 px-3 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/15 transition-all border border-red-400/20"
              >
                Delete data
              </button>
            )}
          </div>

          {tab === "upload" ? (
            <FileUpload onFilesSelected={handleFiles} loading={loading} />
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              <p className="text-white/50 text-sm text-center">
                Demo: HIIT + exercise (Challenge) + sleep + magnesium + omega-3 (Support).
                Previous day had elevated Pro_Stress (0.28) — today shows resilience building.
              </p>
              <button
                onClick={runDemo}
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-semibold transition-all shadow-lg shadow-violet-900/40"
              >
                {loading ? "Analysing…" : "Run Demo Analysis"}
              </button>
            </div>
          )}

          {error && (
            <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-400/20 text-red-300 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Layer Analysis */}
      {result && (
        <div className="w-full max-w-md px-5 mt-6 mb-16">
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-3 font-semibold">
            Mitochondrial Analysis
          </h2>
          <LayerResults result={result} />
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-[#1A1535]/90 backdrop-blur-xl border-t border-white/10 flex justify-around py-3 px-4">
        {[
          { icon: "⊙", label: "Dashboard" },
          { icon: "↑", label: "Upload" },
          { icon: "≋", label: "Analysis" },
          { icon: "⚙", label: "Settings" },
        ].map((n) => (
          <button key={n.label} className="flex flex-col items-center gap-1 text-white/40 hover:text-white/80 transition-colors">
            <span className="text-lg leading-none">{n.icon}</span>
            <span className="text-[10px]">{n.label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}
