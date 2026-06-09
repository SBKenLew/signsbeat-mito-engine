"use client";

import { useState } from "react";
import ScoreGauge from "@/components/ScoreGauge";
import FileUpload from "@/components/FileUpload";
import LayerResults from "@/components/LayerResults";
import type { EngineResult } from "@/lib/engine";

type GaugeState = "Recovery" | "MildStress" | "Stress" | "Baseline";

function deriveGaugeState(result: EngineResult): GaugeState {
  const score = parseFloat(result.final_mito_health_score);
  const dysfunc = parseFloat(result.dysfunction_probability);
  if (!result.is_positive && dysfunc >= 50) return "Stress";
  if (!result.is_positive || dysfunc >= 30)  return "MildStress";
  if (score >= 55) return "Recovery";
  return "Baseline";
}

function today() {
  return new Date().toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

const CLS_STYLES = {
  challenge: "bg-violet-500/20 text-violet-200 border-violet-400/20",
  support:   "bg-sky-500/20   text-sky-200   border-sky-400/20",
  unknown:   "bg-white/10     text-white/40  border-white/10",
};

export default function Home() {
  const [result, setResult]   = useState<EngineResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [tab, setTab]         = useState<"upload" | "demo">("upload");

  async function runAnalysis(body: FormData) {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/analyze", { method: "POST", body });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Analysis failed");
      setResult(json.result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  function handleFiles(files: File[]) {
    if (!files.length) return;
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    runAnalysis(fd);
  }

  function runDemo() {
    // Mirrors the Python __main__ test: Fasting(16h) + HIIT(1h) + CoQ10 + Magnesium
    const profile = {
      action_names: [
        { name: "fasting",   load_hours: 16.0 },
        { name: "hiit",      load_hours: 1.0 },
        { name: "coq10",     load_hours: 1.0 },
        { name: "magnesium", load_hours: 1.0 },
      ],
      base_threshold_hours: 16.0,
      metrics_delta: {
        pro_recovery:      3.2,
        pro_stress:        1.4,
        persistent_stress: false,
      },
      hrv_trend:   2.1,
      sleep_trend: 1.1,
      pro_positive:    0.68,
      pro_recovery:    0.72,
      pro_mild_stress: 0.18,
      pro_stress:      0.09,
    };
    const fd = new FormData();
    fd.append("profile", JSON.stringify(profile));
    runAnalysis(fd);
  }

  const gaugeState  = result ? deriveGaugeState(result) : "Baseline";
  const healthScore = result ? parseFloat(result.final_mito_health_score) : 0;

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
                {[
                  { label: "Pro_Positive", val: result.pro_state_values.pro_positive,   color: "text-emerald-400" },
                  { label: "Pro_Recovery", val: result.pro_state_values.pro_recovery,   color: "text-sky-400" },
                  { label: "Pro_MildStress", val: result.pro_state_values.pro_mild_stress, color: "text-yellow-400" },
                  { label: "Pro_Stress",   val: result.pro_state_values.pro_stress,     color: "text-red-400" },
                ].map((ps) => (
                  <div key={ps.label} className="bg-white/10 rounded-2xl p-3 border border-white/10">
                    <span className="text-xs text-white/40 uppercase tracking-wide block">{ps.label}</span>
                    <span className={`text-2xl font-bold ${ps.color}`}>{ps.val}%</span>
                  </div>
                ))}
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

      {/* ActionName Tags */}
      {result && (
        result.support_action_names.length > 0 ||
        result.challenge_action_names.length > 0 ||
        result.inferred_challenge_names.length > 0 ||
        result.inferred_support_names.length > 0 ||
        result.unknown_action_names.length > 0
      ) && (
        <div className="w-full max-w-md px-5 mt-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/15 p-4">
            <p className="text-xs text-white/40 uppercase tracking-widest mb-2 font-semibold">
              ActionNames detected — {result.action_name_profile}
            </p>
            <div className="flex flex-wrap gap-2">
              {/* Registry-matched Challenges */}
              {result.challenge_action_names.map((n) => (
                <span key={n} className={`px-3 py-1 rounded-full text-xs font-medium border ${CLS_STYLES.challenge}`}>
                  ⚡ {n.replace(/_/g, " ")}
                </span>
              ))}
              {/* Registry-matched Support */}
              {result.support_action_names.map((n) => (
                <span key={n} className={`px-3 py-1 rounded-full text-xs font-medium border ${CLS_STYLES.support}`}>
                  ✦ {n.replace(/_/g, " ")}
                </span>
              ))}
              {/* Inferred Challenge — not in registry, Pro_Recovery promoted */}
              {result.inferred_challenge_names.map((n) => (
                <span key={n} className="px-3 py-1 rounded-full text-xs font-medium border border-violet-400/40 bg-violet-500/10 text-violet-300 italic">
                  ⚡~ {n.replace(/_/g, " ")}
                </span>
              ))}
              {/* Inferred Support — not in registry, Pro_MildStress promoted */}
              {result.inferred_support_names.map((n) => (
                <span key={n} className="px-3 py-1 rounded-full text-xs font-medium border border-sky-400/40 bg-sky-500/10 text-sky-300 italic">
                  ✦~ {n.replace(/_/g, " ")}
                </span>
              ))}
              {/* Still truly unknown */}
              {result.unknown_action_names.map((n) => (
                <span key={n} className={`px-3 py-1 rounded-full text-xs font-medium border ${CLS_STYLES.unknown}`}>
                  ? {n.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-white/30">
              <span>✦ Support</span>
              <span>⚡ Challenge (Hormetic)</span>
              <span className="italic">✦~ Inferred Support (Pro_MildStress ↑)</span>
              <span className="italic">⚡~ Inferred Challenge (Pro_Recovery ↑)</span>
              <span>? Unclassified</span>
            </div>
          </div>
        </div>
      )}

      {result && result.support_action_names.length === 0 && result.challenge_action_names.length === 0 && (
        <div className="w-full max-w-md px-5 mt-4">
          <div className="bg-red-500/10 backdrop-blur-xl rounded-3xl border border-red-400/20 p-4">
            <p className="text-sm text-red-300">
              No ActionNames detected. Ensure your CSV has an{" "}
              <span className="text-white/70 font-semibold">ActionName</span> column containing
              intervention names (e.g. fasting, hiit, magnesium, sleep).
            </p>
          </div>
        </div>
      )}

      {/* Input Controls */}
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
            <div className="flex flex-col gap-3 py-2">
              <p className="text-white/50 text-sm text-center">
                Demo mirrors the Python test case: <strong className="text-white/70">Fasting (16h) + HIIT (1h)</strong>{" "}
                (Challenge) + <strong className="text-white/70">CoQ10 + Magnesium</strong> (Support).
                Pro_Recovery delta: +3.2, Pro_Stress: 1.4 — massive rebound with support buffering.
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
            Mitochondrial Layer Analysis
          </h2>
          <LayerResults result={result} />
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full max-w-md left-1/2 -translate-x-1/2 bg-[#1A1535]/90 backdrop-blur-xl border-t border-white/10 flex justify-around py-3 px-4">
        {[
          { icon: "⊙", label: "Dashboard" },
          { icon: "↑",  label: "Upload" },
          { icon: "≋",  label: "Analysis" },
          { icon: "⚙",  label: "Settings" },
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
