// src/lib/google-sheets/issues.ts
import type { Row } from "./source";
import type { CoercionIssue } from "./infer";

export type IssueLevel = "error" | "warning" | "info";
export type Issue = {
  level: IssueLevel;
  message: string;
  row: number;       // 0-based
  column: string;
  code: string;      // e.g., "NUMBER_INVALID"
};

export type QualityStats = {
  rows: number;
  columns: number;
  cells: number;
  errors: number;
  warnings: number;
};

// Keep the same signature your UI expects.
export function qualityFromIssues(rows: number, columns: number, issues: Issue[]): QualityStats {
  return {
    rows,
    columns,
    cells: rows * columns,
    errors: issues.filter(i => i.level === "error").length,
    warnings: issues.filter(i => i.level === "warning").length,
  };
}

/** Map infer.ts CoercionIssue -> UI Issue */
export function mapCoercionIssuesToUI(issues: CoercionIssue[]): Issue[] {
  return issues.map((it) => {
    const isError = it.targetType === "number" || it.targetType === "date";
    const code =
      it.targetType === "number"
        ? "NUMBER_INVALID"
        : it.targetType === "date"
        ? "DATE_PARSE_FAIL"
        : "VALUE_INVALID";
    const message =
      it.targetType === "number"
        ? "Invalid number"
        : it.targetType === "date"
        ? "Invalid date"
        : "Invalid value";
    return {
      level: isError ? "error" : "warning",
      message,
      row: it.rowIndex,
      column: it.columnName,
      code,
    };
  });
}

/** Simple required-field issues for rows already in object form */
export function buildRequiredIssues(rows: Row[], requiredColumns: string[]): Issue[] {
  const required = new Set(requiredColumns);
  const result: Issue[] = [];
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    for (const columnName of required) {
      const value = row[columnName];
      const blank = value == null || (typeof value === "string" && value.trim() === "");
      if (blank) {
        result.push({
          level: "error",
          message: "Required value is missing",
          row: rowIndex,
          column: columnName,
          code: "REQUIRED_MISSING",
        });
      }
    }
  }
  return result;
}
