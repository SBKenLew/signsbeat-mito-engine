import { NextRequest, NextResponse } from "next/server";
import { evaluateDailyMitochondrialHealth, DailyProfile, ActionName } from "@/lib/engine";

export const runtime = "edge";

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

function rowDate(row: Record<string, string>): string {
  return row.date ?? row.day ?? row.timestamp ?? row.datetime ?? row.recorded_at ?? "unknown";
}

function parsePro(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n; // normalise 0–100 → 0–1
}

interface DayAccumulator {
  date: string;
  action_names: ActionName[];
  pro_positive: number;
  pro_recovery: number;
  pro_mild_stress: number;
  pro_stress: number;
  hrv: number;
  sleep_efficiency: number;
  base_threshold_hours: number;
}

function buildDayMap(rows: Record<string, string>[]): Map<string, DayAccumulator> {
  const map = new Map<string, DayAccumulator>();

  for (const row of rows) {
    const date = rowDate(row);

    // ActionName column is the intervention name
    const actionRaw = (
      row.actionname ?? row.action_name ?? row.action ?? ""
    ).trim();

    if (!actionRaw) continue;

    const load = parseFloat(row.load_hours ?? row.duration_hours ?? row.duration ?? "1") || 1;
    const action: ActionName = { name: actionRaw, load_hours: load };

    // Pro_State values — accept various casings
    const pro_positive    = parsePro(row.pro_positive    ?? row.pro_pos);
    const pro_recovery    = parsePro(row.pro_recovery    ?? row.pro_rec);
    const pro_mild_stress = parsePro(row.pro_mildstress  ?? row.pro_mild_stress ?? row.pro_mild);
    const pro_stress      = parsePro(row.pro_stress      ?? row.pro_str);
    const hrv             = parseFloat(row.hrv ?? row.heart_rate_variability ?? "0") || 0;
    const sleep_eff       = parseFloat(row.sleep_efficiency ?? row.sleep_score ?? "0") || 0;
    const base_threshold  = parseFloat(row.base_threshold_hours ?? "16") || 16;

    if (map.has(date)) {
      const d = map.get(date)!;
      d.action_names.push(action);
      // Keep latest non-zero Pro_State values for the day
      if (pro_positive)    d.pro_positive    = pro_positive;
      if (pro_recovery)    d.pro_recovery    = pro_recovery;
      if (pro_mild_stress) d.pro_mild_stress = pro_mild_stress;
      if (pro_stress)      d.pro_stress      = pro_stress;
      if (hrv)             d.hrv             = hrv;
      if (sleep_eff)       d.sleep_efficiency = sleep_eff;
    } else {
      map.set(date, {
        date, action_names: [action],
        pro_positive, pro_recovery, pro_mild_stress, pro_stress,
        hrv, sleep_efficiency: sleep_eff, base_threshold_hours: base_threshold,
      });
    }
  }

  return map;
}

function sortedDays(map: Map<string, DayAccumulator>): DayAccumulator[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

function buildProfile(current: DayAccumulator, prev: DayAccumulator | null): DailyProfile {
  // metrics_delta: differences between current and previous day Pro_State values
  const pro_recovery_delta    = current.pro_recovery    - (prev?.pro_recovery    ?? current.pro_recovery);
  const pro_mild_stress_delta = current.pro_mild_stress - (prev?.pro_mild_stress ?? current.pro_mild_stress);
  const pro_stress_delta      = current.pro_stress      - (prev?.pro_stress      ?? current.pro_stress);
  const hrv_trend             = current.hrv             - (prev?.hrv             ?? current.hrv);
  const sleep_trend           = current.sleep_efficiency - (prev?.sleep_efficiency ?? current.sleep_efficiency);

  return {
    action_names: current.action_names,
    metrics_delta: {
      pro_recovery:      pro_recovery_delta,
      pro_mild_stress:   pro_mild_stress_delta,   // NEW — used for unknown ActionName reclassification
      pro_stress:        pro_stress_delta,
      persistent_stress: current.pro_stress > 0.40,
    },
    base_threshold_hours: current.base_threshold_hours,
    hrv_trend,
    sleep_trend,
    // Raw Pro_State values for display
    pro_positive:    current.pro_positive,
    pro_recovery:    current.pro_recovery,
    pro_mild_stress: current.pro_mild_stress,
    pro_stress:      current.pro_stress,
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
      const dayMap = new Map<string, DayAccumulator>();

      for (const file of files) {
        if (file.name.endsWith(".csv")) {
          const rows = parseCSV(await file.text());
          const fileMap = buildDayMap(rows);
          for (const [date, day] of Array.from(fileMap.entries())) {
            if (dayMap.has(date)) {
              const existing = dayMap.get(date)!;
              existing.action_names.push(...day.action_names);
              if (day.pro_positive)    existing.pro_positive    = day.pro_positive;
              if (day.pro_recovery)    existing.pro_recovery    = day.pro_recovery;
              if (day.pro_mild_stress) existing.pro_mild_stress = day.pro_mild_stress;
              if (day.pro_stress)      existing.pro_stress      = day.pro_stress;
            } else {
              dayMap.set(date, day);
            }
          }
        }
      }

      if (dayMap.size === 0) {
        return NextResponse.json(
          { error: "No valid rows found. Ensure your CSV has an ActionName column." },
          { status: 400 }
        );
      }

      const days    = sortedDays(dayMap);
      const current = days[days.length - 1];
      const prev    = days.length > 1 ? days[days.length - 2] : null;
      profile = buildProfile(current, prev);
    } else {
      return NextResponse.json({ error: "No files or profile provided" }, { status: 400 });
    }

    const result = evaluateDailyMitochondrialHealth(profile);
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
