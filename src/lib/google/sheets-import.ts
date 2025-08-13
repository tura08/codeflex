// src/lib/google/sheets-import.ts
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
  row: number;       // 0-based row index in preview
  column: string;    // header name (normalized or original)
  code: string;      // e.g., DATE_PARSE_FAIL, NUMBER_INVALID
};

export type QualityStats = {
  rows: number;
  columns: number;
  cells: number;
  errors: number;
  warnings: number;
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
    // both present → decimal is the rightmost of the two
    if (lastComma > lastDot) {
      // comma decimal → remove dots (thousands), replace comma with dot
      normalized = s.replace(/\./g, "").replace(",", ".");
    } else {
      // dot decimal → remove commas (thousands)
      normalized = s.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    // only comma → assume decimal
    normalized = s.replace(/\./g, "").replace(",", ".");
  } else {
    // only dot or only digits → dot is decimal (or integer)
    normalized = s.replace(/,/g, "");
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

function parseDateLoose(v: unknown, dayFirst = true): Date | null {
  if (v === null || v === undefined) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;

  const s = String(v).trim();
  if (!s) return null;

  // ISO or native Date.parse for common formats
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return new Date(iso);

  // dd/mm/yyyy or mm/dd/yyyy
  const m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (m) {
    let d = parseInt(m[1], 10);
    let M = parseInt(m[2], 10);
    const y = parseInt(m[3].length === 2 ? `20${m[3]}` : m[3], 10);
    if (!dayFirst) [d, M] = [M, d];
    // month is 1..12, day 1..31 (basic sanity)
    if (M >= 1 && M <= 12 && d >= 1 && d <= 31) {
      const dt = new Date(Date.UTC(y, M - 1, d));
      if (!isNaN(dt.getTime())) return dt;
    }
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
        const ok = v instanceof Date
          ? !isNaN(v.getTime())
          : (typeof v === "string" && !isNaN(Date.parse(v)));
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
