"use client";

import { useState } from "react";
import ScoreGauge from "@/components/ScoreGauge";
import MetricCard from "@/components/MetricCard";
import FileUpload from "@/components/FileUpload";
import LayerResults from "@/components/LayerResults";
import type { EngineResult } from "@/lib/engine";

type ProState = "Recovery" | "MildStress" | "Stress" | "Baseline";

function deriveState(result: EngineResult): ProState {
  const health = parseFloat(result.mitochondrial_health_score);
  const dysfunction = parseFloat(result.dysfunction_probability);
  if (!result.is_positive && dysfunction >= 50) return "Stress";
  if (!result.is_positive || dysfunction >= 30) return "MildStress";
  if (health >= 55) return "Recovery";
  return "Baseline";
}

function today() {
  return new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

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
    const profile = {
      interventions: [
        { name: "exercise", load_hours: 1.5 },
        { name: "hiit", load_hours: 0.5 },
        { name: "sleep", load_hours: 8 },
        { name: "magnesium", load_hours: 1 },
        { name: "omega-3", load_hours: 1 },
      ],
      metrics_delta: { pro_recovery: 2.1, pro_stress: 0.3, persistent_stress: false },
      hrv_trend: 3.5,
      sleep_trend: 0.8,
      base_threshold_hours: 16,
      previous_pro_recovery: 5.0,
      current_pro_recovery: 7.1,
      glucose_volatility: 0.5,
      substrate_shifts: 2,
    };
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: (() => { const fd = new FormData(); fd.append("profile", JSON.stringify(profile)); return fd; })(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Demo failed");
      setResult(json.result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  const state: ProState = result ? deriveState(result) : "Baseline";
  const healthScore = result ? parseFloat(result.mitochondrial_health_score) : 50;

  return (
    <main className="min-h-screen w-full flex flex-col items-center bg-gradient-to-b from-[#4A3B8C] via-[#6B5EA8] to-[#8B7FC4]">

      {/* Header */}
      <div className="w-full max-w-md px-5 pt-12 pb-4 flex items-center justify-between">
        <div>
          <p className="text-white/50 text-sm">Your Longevity Assistant</p>
          <h1 className="text-white font-bold text-xl leading-tight">Signsbeat <span className="text-violet-300">MitoEngine</span></h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white font-bold text-sm">
          SB
        </div>
      </div>

      {/* Score Card */}
      <div className="w-full max-w-md px-5">
        <div className="bg-white/15 backdrop-blur-xl rounded-3xl border border-white/20 p-6 shadow-2xl">
          <div className="flex flex-col items-center gap-4">
            <ScoreGauge score={healthScore} state={state} />
            <p className="text-white/50 text-sm text-center">{today()}</p>

            {result && (
              <div className="grid grid-cols-2 gap-3 w-full mt-1">
                <MetricCard
                  label="Adaptation"
                  value={result.adaptation_score}
                  sublabel="Recovery / Stress ratio"
                  color="blue"
                />
                <MetricCard
                  label="Redox Resilience"
                  value={result.redox_resilience_score}
                  sublabel="ROS clearance efficiency"
                  color="green"
                />
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

      {/* Input Section */}
      <div className="w-full max-w-md px-5 mt-6">
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
                title="Delete data"
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
                Runs a pre-loaded scenario: HIIT + sleep + magnesium + omega-3 with positive HRV trend.
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

      {/* Layer Results */}
      {result && (
        <div className="w-full max-w-md px-5 mt-6 mb-10">
          <h2 className="text-white/60 text-xs uppercase tracking-widest mb-3 font-semibold">Layer Analysis</h2>
          <LayerResults result={result} />
        </div>
      )}

      {/* Today's Tips */}
      {result && (
        <div className="w-full max-w-md px-5 mb-16">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-400">♥</span>
              <h3 className="text-white/80 text-sm font-semibold">Today&apos;s Health Tips</h3>
            </div>
            <ul className="flex flex-col gap-2">
              {state === "Recovery" && <>
                <li className="text-white/60 text-sm">Your mitochondria are adapting well — maintain current protocol.</li>
                <li className="text-white/60 text-sm">Consider progressive overload on your next challenge day (T+1 rule).</li>
              </>}
              {state === "MildStress" && <>
                <li className="text-white/60 text-sm">Adjust nutrition timing before increasing training load.</li>
                <li className="text-white/60 text-sm">Add magnesium or omega-3 support to buffer current challenge load.</li>
              </>}
              {state === "Stress" && <>
                <li className="text-warning text-red-300 text-sm font-medium">Reduce intensity or pause intervention — persistent stress detected.</li>
                <li className="text-white/60 text-sm">Prioritise sleep and mitochondrial support interventions today.</li>
              </>}
              {state === "Baseline" && <>
                <li className="text-white/60 text-sm">Engage endurance or strength training to activate AMPK signalling.</li>
                <li className="text-white/60 text-sm">Upload your Signsbeat CSV for personalised layer analysis.</li>
              </>}
            </ul>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-[#1A1535]/90 backdrop-blur-xl border-t border-white/10 flex justify-around py-3 px-4">
        {[
          { icon: "⊙", label: "Dashboard" },
          { icon: "↑", label: "Upload" },
          { icon: "≋", label: "Layers" },
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
