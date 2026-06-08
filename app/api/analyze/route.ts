import { NextRequest, NextResponse } from "next/server";
import { evaluateDailyMitochondrialHealth, DailyProfile } from "@/lib/engine";

export const runtime = "edge";

// All known intervention keywords — used to scan CSV columns and cell values
const ALL_KNOWN_INTERVENTIONS = [
  // support
  "sleep", "coq10", "pqq", "creatine", "magnesium", "omega-3", "omega3",
  "nac", "glycine", "protein_optimization", "protein",
  // challenge
  "fasting", "ketogenic_diet", "ketogenic", "keto", "exercise", "hiit",
  "sauna", "cold_plunge", "cold_water", "cwi", "hbot", "red_light_therapy",
  "red_light", "resistance", "aerobic", "cardio", "strength", "running",
  "cycling", "swimming", "yoga", "meditation",
];

// Normalise a raw string to match known intervention keys
function normaliseKey(s: string): string {
  return s.toLowerCase().trim().replace(/[\s\-\/]+/g, "_");
}

// Returns matched intervention name (engine-canonical) or null
function matchIntervention(raw: string): string | null {
  const key = normaliseKey(raw);
  // exact match
  if (ALL_KNOWN_INTERVENTIONS.includes(key)) return key;
  // prefix / partial match (e.g. "omega_3" → "omega-3")
  const found = ALL_KNOWN_INTERVENTIONS.find(
    (k) => key.includes(normaliseKey(k)) || normaliseKey(k).includes(key)
  );
  return found ?? null;
}

function parseCSVRows(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

// Detect interventions from a single CSV row by:
//   1. Dedicated columns (interventions, activity, supplement, exercise_type, …)
//   2. Column name itself matches a known intervention and cell is truthy/positive
//   3. Free-text cell values that contain known keywords
function detectInterventions(
  row: Record<string, string>,
  loadHours: number
): Array<{ name: string; load_hours: number }> {
  const found = new Map<string, number>(); // name → load_hours

  // Pass 1 — explicit list columns (semicolon or comma-separated)
  const listCols = ["interventions", "activity", "activities", "supplements", "supplement", "drugs", "therapies"];
  for (const col of listCols) {
    if (row[col]) {
      for (const part of row[col].split(/[;,|]/)) {
        const match = matchIntervention(part.trim());
        if (match) found.set(match, loadHours);
      }
    }
  }

  // Pass 2 — column name IS a known intervention, cell is a truthy/positive marker
  const positiveCells = new Set(["1", "yes", "true", "x", "✓", "done", "taken"]);
  for (const [col, val] of Object.entries(row)) {
    const match = matchIntervention(col);
    if (match && (positiveCells.has(val.toLowerCase()) || parseFloat(val) > 0)) {
      const hrs = parseFloat(val) > 1 ? parseFloat(val) : loadHours;
      found.set(match, hrs);
    }
  }

  // Pass 3 — scan every cell value for embedded keyword mentions
  for (const val of Object.values(row)) {
    if (!val || val.length > 80) continue; // skip long freetext / numbers
    const match = matchIntervention(val);
    if (match && !found.has(match)) found.set(match, loadHours);
  }

  return Array.from(found.entries()).map(([name, load_hours]) => ({ name, load_hours }));
}

function buildProfileFromCSV(rows: Record<string, string>[]): DailyProfile {
  if (rows.length === 0) {
    return { interventions: [], metrics_delta: {} };
  }

  const current = rows[rows.length - 1];
  const previous = rows.length > 1 ? rows[rows.length - 2] : null;

  const loadHours =
    parseFloat(current.load_hours ?? current.duration_hours ?? current.duration ?? "1") || 1;

  const interventions = detectInterventions(current, loadHours);

  const pro_recovery = parseFloat(current.pro_recovery ?? current.pro_rec ?? "0") || 0;
  const prev_recovery = parseFloat(previous?.pro_recovery ?? previous?.pro_rec ?? "0") || 0;
  const pro_stress = parseFloat(current.pro_stress ?? "0") || 0;

  const hrv_current = parseFloat(current.hrv_trend ?? current.hrv ?? current.heart_rate_variability ?? "0");
  const hrv_previous = parseFloat(previous?.hrv_trend ?? previous?.hrv ?? previous?.heart_rate_variability ?? String(hrv_current));

  const sleep_current = parseFloat(current.sleep_efficiency ?? current.sleep_score ?? "0");
  const sleep_previous = parseFloat(previous?.sleep_efficiency ?? previous?.sleep_score ?? String(sleep_current));

  return {
    interventions,
    metrics_delta: {
      pro_recovery: pro_recovery - prev_recovery,
      pro_stress,
      persistent_stress: pro_stress > 0.6,
    },
    hrv_trend: hrv_current - hrv_previous,
    sleep_trend: sleep_current - sleep_previous,
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
    return NextResponse.json({
      success: true,
      result,
      detected_interventions: profile.interventions.map((i) => i.name),
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
