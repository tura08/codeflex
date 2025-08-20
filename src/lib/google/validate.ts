// src/lib/tabular/validate.ts
import type { SimpleType } from "@/lib/google/infer"; // keep your current infer file
import { coerce } from "@/lib/google/infer";

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

function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

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

export function validate(
  rows: any[][],
  headers: string[],
  types: SimpleType[],
  required?: string[]
): Issue[] {
  const issues: Issue[] = [];
  const idx = (name: string) => headers.findIndex((h) => h === name);
  const requiredIdx = (required ?? []).map(idx).filter((i) => i >= 0);

  rows.forEach((row, r) => {
    // required empties
    for (const i of requiredIdx) {
      if (isBlank(row[i])) {
        issues.push({
          level: "error",
          message: "Required value is missing",
          row: r,
          column: headers[i],
          code: "REQUIRED_MISSING",
        });
      }
    }

    // type checks
    types.forEach((t, i) => {
      const v = row[i];
      if (isBlank(v)) return;

      if (t === "number") {
        const n = coerce(v, "number");
        if (n === null) {
          issues.push({
            level: "error",
            message: "Invalid number",
            row: r,
            column: headers[i],
            code: "NUMBER_INVALID",
          });
        }
      }

      if (t === "date") {
        let ok = false;
        if (v instanceof Date && !isNaN(v.getTime())) ok = true;
        else if (typeof v === "string") {
          ok = !!(parseDateLoose(v, true) || parseDateLoose(v, false));
        }
        if (!ok) {
          issues.push({
            level: "error",
            message: "Invalid date",
            row: r,
            column: headers[i],
            code: "DATE_PARSE_FAIL",
          });
        }
      }

      if (t === "boolean") {
        const s = String(v).trim().toLowerCase();
        const ok = typeof v === "boolean" || ["true", "false", "1", "0", "yes", "no", "y", "n"].includes(s);
        if (!ok) {
          issues.push({
            level: "warning",
            message: "Suspicious boolean",
            row: r,
            column: headers[i],
            code: "BOOLEAN_SUSPECT",
          });
        }
      }
    });
  });

  return issues;
}

export function qualityFromIssues(rows: number, columns: number, issues: Issue[]): QualityStats {
  return {
    rows,
    columns,
    cells: rows * columns,
    errors: issues.filter((i) => i.level === "error").length,
    warnings: issues.filter((i) => i.level === "warning").length,
  };
}
