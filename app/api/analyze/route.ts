import { NextRequest, NextResponse } from "next/server";
import { evaluateDailyMitochondrialHealth, DailyProfile } from "@/lib/engine";

export const runtime = "edge";

function parseCSVRows(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

function buildProfileFromCSV(rows: Record<string, string>[]): DailyProfile {
  if (rows.length === 0) {
    return { interventions: [], metrics_delta: {} };
  }

  // Use last row as current day, second-to-last as previous
  const current = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;

  const interventionNames = (current.interventions ?? current.activity ?? "").split(";").map((s) => s.trim()).filter(Boolean);
  const interventions = interventionNames.map((name) => ({
    name,
    load_hours: parseFloat(current.load_hours ?? current.duration_hours ?? "1") || 1,
  }));

  const pro_recovery = parseFloat(current.pro_recovery ?? "0") || 0;
  const prev_recovery = parseFloat(previous?.pro_recovery ?? "0") || 0;
  const pro_stress = parseFloat(current.pro_stress ?? "0") || 0;

  return {
    interventions,
    metrics_delta: {
      pro_recovery: pro_recovery - prev_recovery,
      pro_stress,
      persistent_stress: pro_stress > 0.6,
    },
    hrv_trend: parseFloat(current.hrv_trend ?? current.hrv ?? "0") - parseFloat(previous?.hrv ?? current.hrv ?? "0"),
    sleep_trend: parseFloat(current.sleep_efficiency ?? "0") - parseFloat(previous?.sleep_efficiency ?? "0"),
    base_threshold_hours: 16,
    previous_pro_recovery: prev_recovery,
    current_pro_recovery: pro_recovery,
    glucose_volatility: parseFloat(current.glucose_volatility ?? "0") || 0,
    substrate_shifts: parseFloat(current.substrate_shifts ?? "1") || 1,
  };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const manualJson = formData.get("profile") as string | null;

    let profile: DailyProfile;

    if (manualJson) {
      profile = JSON.parse(manualJson) as DailyProfile;
    } else if (files.length > 0) {
      const allRows: Record<string, string>[] = [];
      for (const file of files) {
        if (file.name.endsWith(".csv")) {
          const text = await file.text();
          allRows.push(...parseCSVRows(text));
        }
      }
      profile = buildProfileFromCSV(allRows);
    } else {
      return NextResponse.json({ error: "No files or profile provided" }, { status: 400 });
    }

    const result = evaluateDailyMitochondrialHealth(profile);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
