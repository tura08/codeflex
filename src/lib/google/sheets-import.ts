// src/lib/google/sheets-import.ts
import { supabase } from "../supabase-client";
import type { SimpleType } from "./infer";

/* ── Types ─────────────────────────────────────────────────── */
export type TransformRule =
  | { kind: "trim"; columns?: string[] }                         // trims strings
  | { kind: "parseDate"; columns: string[]; dayFirst?: boolean } // dd/mm/yyyy if dayFirst
  | { kind: "parseCurrency"; columns: string[] };                // "€1.234,56" -> 1234.56

export type IssueLevel = "error" | "warning" | "info";
export type Issue = {
  level: IssueLevel;
  message: string;
  row: number;
  column: string;
  code: string;
};

export type QualityStats = {
  rows: number;
  columns: number;
  cells: number;
  errors: number;
  warnings: number;
};

export type SheetSource = {
  id: string;
  user_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  header_row: number;
};

/* ── Helpers ────────────────────────────────────────────────── */
function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function parseCurrencyLoose(input: unknown): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : null;
  const s0 = String(input).trim();
  if (!s0) return null;

  // keep digits, separators, minus
  const s = s0.replace(/[^\d.,-]/g, "");
  if (!s) return null;

  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  let normalized = s;

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      normalized = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = s.replace(/,/g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Parse strings like ISO, dd/mm/yyyy, mm/dd/yyyy. No numeric serial support. */
function parseDateLoose(v: unknown, dayFirst = true): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  const s = String(v).trim();
  if (!s) return null;

  // ISO or native Date.parse for common formats
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);

  // dd/mm/yyyy or mm/dd/yyyy with preference, fallback to opposite
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    const a = parseInt(m[1], 10);
    const b = parseInt(m[2], 10);
    const y = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);

    const tryOrder = (d: number, M: number, Y: number) => {
      if (M < 1 || M > 12 || d < 1 || d > 31) return null;
      const dt = new Date(Date.UTC(Y, M - 1, d));
      return isNaN(dt.getTime()) ? null : dt;
    };

    const pref = dayFirst ? tryOrder(a, b, y) : tryOrder(b, a, y);
    const alt  = dayFirst ? tryOrder(b, a, y) : tryOrder(a, b, y);
    return pref ?? alt;
  }

  return null;
}

/* ── Transforms ─────────────────────────────────────────────── */
export function applyRules(
  rows: any[][],
  headers: string[],
  rules: TransformRule[]
): any[][] {
  if (!rules.length || !rows.length) return rows;

  const colIndex = (name: string) => headers.findIndex(h => h === name);

  return rows.map((row) => {
    let out = [...row];

    for (const rule of rules) {
      if (rule.kind === "trim") {
        const cols = rule.columns ?? headers;
        for (const c of cols) {
          const i = colIndex(c);
          if (i >= 0 && typeof out[i] === "string") {
            out[i] = (out[i] as string).trim();
          }
        }
      }

      if (rule.kind === "parseCurrency") {
        for (const c of rule.columns) {
          const i = colIndex(c);
          if (i >= 0) {
            const n = parseCurrencyLoose(out[i]);
            if (n !== null) out[i] = n;
          }
        }
      }

      if (rule.kind === "parseDate") {
        for (const c of rule.columns) {
          const i = colIndex(c);
          if (i >= 0) {
            const dt = parseDateLoose(out[i], rule.dayFirst ?? true);
            if (dt) out[i] = dt.toISOString(); // normalize to ISO string for preview
          }
        }
      }
    }

    return out;
  });
}

/* ── Validation ─────────────────────────────────────────────── */
export function validate(
  rows: any[][],
  headers: string[],
  types: SimpleType[],
  required?: string[]
): Issue[] {
  const issues: Issue[] = [];
  const idx = (name: string) => headers.findIndex(h => h === name);
  const requiredIdx = (required ?? []).map(idx).filter(i => i >= 0);

  rows.forEach((row, r) => {
    // required empties
    for (const i of requiredIdx) {
      if (isBlank(row[i])) {
        issues.push({ level: "error", message: "Required value is missing", row: r, column: headers[i], code: "REQUIRED_MISSING" });
      }
    }

    // type checks
    types.forEach((t, i) => {
      const v = row[i];
      if (isBlank(v)) return;

      if (t === "number") {
        const n = typeof v === "number" ? v : parseCurrencyLoose(v);
        if (n === null) {
          issues.push({ level: "error", message: "Invalid number", row: r, column: headers[i], code: "NUMBER_INVALID" });
        }
      }

      if (t === "date") {
        let ok = false;
        if (v instanceof Date && !isNaN(v.getTime())) ok = true;
        else if (typeof v === "string") {
          // accept ISO or either dd/mm/yyyy or mm/dd/yyyy
          ok = !!(parseDateLoose(v, true) || parseDateLoose(v, false));
        }
        // NOTE: numeric serials are NOT accepted anymore
        if (!ok) {
          issues.push({ level: "error", message: "Invalid date", row: r, column: headers[i], code: "DATE_PARSE_FAIL" });
        }
      }

      if (t === "boolean") {
        const s = String(v).toLowerCase();
        const ok = typeof v === "boolean" || ["true", "false", "1", "0", "yes", "no"].includes(s);
        if (!ok) {
          issues.push({ level: "warning", message: "Suspicious boolean", row: r, column: headers[i], code: "BOOLEAN_SUSPECT" });
        }
      }
    });
  });

  return issues;
}

/* ── Quality aggregation ────────────────────────────────────── */
export function qualityFromIssues(rows: number, columns: number, issues: Issue[]): QualityStats {
  return {
    rows,
    columns,
    cells: rows * columns,
    errors: issues.filter(i => i.level === "error").length,
    warnings: issues.filter(i => i.level === "warning").length,
  };
}

export async function listSheetSources(): Promise<SheetSource[]> {
  const { data, error } = await supabase
    .from("sheet_sources")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
