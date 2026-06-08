import { NextRequest, NextResponse } from "next/server";
import { evaluateDayData, classifyAction, DayData, Action } from "@/lib/engine";

export const runtime = "edge";

function normaliseHeader(h: string) {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(normaliseHeader);
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, (vals[i] ?? "").trim()]));
  });
}

// Resolve the date key from a row (tries common column names)
function rowDate(row: Record<string, string>): string {
  return row.date ?? row.day ?? row.timestamp ?? row.datetime ?? row.recorded_at ?? "unknown";
}

// Parse a Pro_State value — accepts 0–1 or 0–100, normalises to 0–1
function parsePro(val: string | undefined): number {
  if (!val) return 0;
  const n = parseFloat(val);
  if (isNaN(n)) return 0;
  return n > 1 ? n / 100 : n; // normalise 0–100 → 0–1
}

// Build DayData records grouped by date from all CSV rows
function buildDayDataMap(rows: Record<string, string>[]): Map<string, DayData> {
  const map = new Map<string, DayData>();

  for (const row of rows) {
    const date = rowDate(row);

    // ActionName is the intervention name
    const actionRaw = (row.actionname ?? row.action_name ?? row.action ?? "").trim();
    if (!actionRaw) continue;

    const action: Action = {
      name: actionRaw,
      classification: classifyAction(actionRaw),
      load_hours: parseFloat(row.load_hours ?? row.duration_hours ?? row.duration ?? "1") || 1,
    };

    // Pro_State columns (accepts various casings)
    const pro_positive    = parsePro(row.pro_positive    ?? row.pro_pos    ?? row.positive);
    const pro_recovery    = parsePro(row.pro_recovery    ?? row.pro_rec    ?? row.recovery);
    const pro_mild_stress = parsePro(row.pro_mildstress  ?? row.pro_mild_stress ?? row.pro_mild ?? row.mildstress);
    const pro_stress      = parsePro(row.pro_stress      ?? row.pro_str    ?? row.stress);

    if (map.has(date)) {
      const existing = map.get(date)!;
      existing.actions.push(action);
      // Take the latest (last row) Pro_State values for the day
      existing.pro_positive    = pro_positive    || existing.pro_positive;
      existing.pro_recovery    = pro_recovery    || existing.pro_recovery;
      existing.pro_mild_stress = pro_mild_stress || existing.pro_mild_stress;
      existing.pro_stress      = pro_stress      || existing.pro_stress;
    } else {
      map.set(date, { date, actions: [action], pro_positive, pro_recovery, pro_mild_stress, pro_stress });
    }
  }

  return map;
}

// Sort dates and return ordered DayData array
function sortedDays(map: Map<string, DayData>): DayData[] {
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];
    const manualJson = formData.get("profile") as string | null;

    let result;

    if (manualJson) {
      // Direct JSON profile (demo / test)
      const { current, prev } = JSON.parse(manualJson) as { current: DayData; prev: DayData | null };
      result = evaluateDayData(current, prev);
    } else if (files.length > 0) {
      const dayMap = new Map<string, DayData>();

      for (const file of files) {
        if (file.name.endsWith(".csv")) {
          const rows = parseCSV(await file.text());
          const fileMap = buildDayDataMap(rows);
          // Merge into dayMap
          for (const [date, dayData] of Array.from(fileMap.entries())) {
            if (dayMap.has(date)) {
              const existing = dayMap.get(date)!;
              existing.actions.push(...dayData.actions);
              existing.pro_positive    = dayData.pro_positive    || existing.pro_positive;
              existing.pro_recovery    = dayData.pro_recovery    || existing.pro_recovery;
              existing.pro_mild_stress = dayData.pro_mild_stress || existing.pro_mild_stress;
              existing.pro_stress      = dayData.pro_stress      || existing.pro_stress;
            } else {
              dayMap.set(date, dayData);
            }
          }
        }
      }

      if (dayMap.size === 0) {
        return NextResponse.json({ error: "No valid rows found. Ensure the CSV has an ActionName column." }, { status: 400 });
      }

      const days = sortedDays(dayMap);
      const current = days[days.length - 1];
      const prev    = days.length > 1 ? days[days.length - 2] : null;
      result = evaluateDayData(current, prev);
    } else {
      return NextResponse.json({ error: "No files or profile provided" }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
