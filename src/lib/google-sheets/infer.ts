// src/lib/google-sheets/infer.ts
// Unified inference & coercion utilities for Google Sheets data.
// -----------------------------------------------------------------------------
// Canonical API (keep long-term):
//   - inferSchema(rows, options)
//   - coerceRowsToSchema(rows, schema, options)
//   - buildColumnStats(rows, columnName, options)
//   - parseNumeric, parseBoolean, tryParseDate
//   - normalizeHeader, normalizeHeaders
//
// Legacy/compat API (temporary; remove after migration):
//   - inferType(values)                        @deprecated  TODO(AFT-MIGRATION): remove
//   - coerce(value, targetType, options?)     @deprecated  TODO(AFT-MIGRATION): remove
//   - detectColumnTypes(rawRows, headers, n?) @deprecated  TODO(AFT-MIGRATION): remove
//   - buildInitialMapping(headers, inferred)  @deprecated  TODO(AFT-MIGRATION): remove
// -----------------------------------------------------------------------------

// ------------------------------- Shared Types -------------------------------

/** @deprecated Use InferredType + ColumnSchema instead.
 *  TODO(AFT-MIGRATION): delete SimpleType once all call sites use the canonical API.
 */
export type SimpleType = "string" | "number" | "boolean" | "date";

export type Row = Record<string, unknown>;

export type InferredType =
  | "string"
  | "number"
  | "boolean"
  | "date"
  | "null"
  | "mixed"
  | "unknown";

export interface ColumnStats {
  columnName: string;
  sampleCount: number;
  nullCount: number;
  numberCount: number;
  booleanCount: number;
  dateCount: number;
  stringCount: number;
  distinctValues: number;
  exampleValues: unknown[];
}

export interface ColumnSchema {
  columnName: string;
  inferredType: InferredType;
  /** Optional enum-like hint if small cardinality (approximate) */
  allowedValues?: unknown[];
}

export interface InferenceOptions {
  maxSamples?: number;                         // default 1000
  dateParsers?: ((value: unknown) => Date | null)[]; // custom parsers
  stringAsBoolean?: boolean;                   // treat "true"/"false"/"yes"/"no"/"1"/"0" as booleans
  trimStrings?: boolean;                       // default true
  caseInsensitiveBooleans?: boolean;           // default true
  enumCardinalityThreshold?: number;           // default 25 (<= threshold => allowedValues)
  dayFirst?: boolean;                          // for dd/mm vs mm/dd in coerce()
}

export interface CoercionIssue {
  rowIndex: number;
  columnName: string;
  originalValue: unknown;
  targetType: InferredType;
  message: string;
}

export interface CoercionResult {
  coercedRows: Row[];
  issues: CoercionIssue[];
}

// ------------------------------- Base Helpers -------------------------------

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function isLooseNumber(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  const stringValue = String(value).trim();
  if (!stringValue) return false;

  // reject if letters present
  if (/[a-zA-Z]/.test(stringValue)) return false;

  // integers / decimals with , or . thousand/decimal separators
  const numericPattern =
    /^-?\d{1,3}([.,]\d{3})*([.,]\d+)?$|-?\d+([.,]\d+)?$/;
  return numericPattern.test(stringValue);
}

function isLongIntegerLike(value: unknown): boolean {
  if (typeof value === "number" && Number.isFinite(value)) {
    if (!Number.isInteger(value)) return false;
    const digitCount = Math.floor(Math.log10(Math.abs(value))) + 1;
    return digitCount >= 9;
  }
  const stringValue = String(value).trim();
  const digitsOnly = stringValue.replace(/[^\d]/g, "");
  const hasDecimal = /[.,]\d+$/.test(stringValue);
  return !hasDecimal && digitsOnly.length >= 9;
}

function looksLikeDateString(value: unknown): boolean {
  if (value instanceof Date) return !isNaN(value.getTime());
  const stringValue = String(value).trim();
  if (!stringValue) return false;
  // don't treat long integers as dates
  if (/^\d{5,}$/.test(stringValue)) return false;
  // ISO-ish
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(stringValue)) return true;
  // dd/mm/yyyy or mm/dd/yyyy
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(stringValue)) return true;
  const timestamp = Date.parse(stringValue);
  return !Number.isNaN(timestamp) && /[\/\-\.]/.test(stringValue);
}

// ---------------------- Rich detection/coercion helpers ---------------------

const DEFAULT_BOOLEAN_TRUE = new Set(["true", "1", "yes", "y", "si", "sí"]);
const DEFAULT_BOOLEAN_FALSE = new Set(["false", "0", "no", "n"]);

export function isNumericLike(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", "."); // tolerate comma decimals
    if (normalized === "") return false;
    const numeric = Number(normalized);
    return Number.isFinite(numeric);
  }
  return false;
}

export function parseNumeric(value: unknown): number | null {
  if (!isNumericLike(value)) return null;
  if (typeof value === "number") return value;
  const numeric = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(numeric) ? numeric : null;
}

export function isBooleanLike(
  value: unknown,
  options?: InferenceOptions
): boolean {
  if (typeof value === "boolean") return true;
  if (!options?.stringAsBoolean) return false;
  if (typeof value === "string") {
    const normalized =
      options.caseInsensitiveBooleans === false
        ? value
        : value.toLowerCase();
    return (
      DEFAULT_BOOLEAN_TRUE.has(normalized) ||
      DEFAULT_BOOLEAN_FALSE.has(normalized)
    );
  }
  if (typeof value === "number") return value === 0 || value === 1;
  return false;
}

export function parseBoolean(
  value: unknown,
  options?: InferenceOptions
): boolean | null {
  if (typeof value === "boolean") return value;
  if (!isBooleanLike(value, options)) return null;
  if (typeof value === "number") return value === 1;
  const normalized =
    options?.caseInsensitiveBooleans === false
      ? String(value)
      : String(value).toLowerCase();
  if (DEFAULT_BOOLEAN_TRUE.has(normalized)) return true;
  if (DEFAULT_BOOLEAN_FALSE.has(normalized)) return false;
  return null;
}

export function tryParseDate(
  value: unknown,
  options?: InferenceOptions
): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date && !isNaN(value.getTime())) return value;

  const customParsers = options?.dateParsers ?? [];
  for (const parseFunction of customParsers) {
    const parsed = parseFunction(value);
    if (parsed instanceof Date && !isNaN(parsed.getTime())) return parsed;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    // Native Date parse (catches ISO-like)
    const nativeDate = new Date(trimmed);
    if (!isNaN(nativeDate.getTime())) return nativeDate;

    // DD/MM/YYYY or DD-MM-YYYY
    const european = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/;
    const match = trimmed.match(european);
    if (match) {
      const day = Number(match[1]);
      const month = Number(match[2]);
      const year = Number(match[3].length === 2 ? "20" + match[3] : match[3]);
      const dt = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(dt.getTime())) return dt;
    }
  }
  return null;
}

// --------------------------- Column-level inference -------------------------

export function buildColumnStats(
  rows: Row[],
  columnName: string,
  options?: InferenceOptions
): ColumnStats {
  const maxSamples = options?.maxSamples ?? 1000;
  const seenFingerprints = new Set<string>();
  const exampleValues: unknown[] = [];
  let sampleCount = 0;
  let nullCount = 0;
  let numberCount = 0;
  let booleanCount = 0;
  let dateCount = 0;
  let stringCount = 0;

  for (
    let rowIndex = 0;
    rowIndex < rows.length && sampleCount < maxSamples;
    rowIndex++
  ) {
    const value = rows[rowIndex][columnName];
    sampleCount++;

    if (value === null || value === undefined || value === "") {
      nullCount++;
      continue;
    }

    if (isNumericLike(value)) numberCount++;
    else if (isBooleanLike(value, options)) booleanCount++;
    else if (tryParseDate(value, options)) dateCount++;
    else stringCount++;

    const fingerprint = JSON.stringify(value);
    if (!seenFingerprints.has(fingerprint)) {
      seenFingerprints.add(fingerprint);
      if (exampleValues.length < 5) exampleValues.push(value);
    }
  }

  return {
    columnName,
    sampleCount,
    nullCount,
    numberCount,
    booleanCount,
    dateCount,
    stringCount,
    distinctValues: seenFingerprints.size,
    exampleValues,
  };
}

export function inferColumnType(stats: ColumnStats): InferredType {
  const {
    numberCount,
    booleanCount,
    dateCount,
    stringCount,
    sampleCount,
    nullCount,
  } = stats;

  const nonNullSamples = Math.max(1, sampleCount - nullCount);

  const numericRatio = numberCount / nonNullSamples;
  const booleanRatio = booleanCount / nonNullSamples;
  const dateRatio = dateCount / nonNullSamples;
  const stringRatio = stringCount / nonNullSamples;

  if (numericRatio >= 0.9) return "number";
  if (booleanRatio >= 0.9) return "boolean";
  if (dateRatio >= 0.9) return "date";
  if (stringRatio >= 0.9) return "string";
  if (nullCount === sampleCount) return "null";
  return "mixed";
}

export function inferSchema(
  rows: Row[],
  options?: InferenceOptions
): ColumnSchema[] {
  const columnNames = Object.keys(rows[0] ?? {});
  const enumThreshold = options?.enumCardinalityThreshold ?? 25;

  return columnNames.map((columnName) => {
    const stats = buildColumnStats(rows, columnName, options);
    const inferredType = inferColumnType(stats);
    const schema: ColumnSchema = { columnName, inferredType };

    if (stats.distinctValues > 0 && stats.distinctValues <= enumThreshold) {
      // approximate: top few exampleValues
      schema.allowedValues = stats.exampleValues;
    }
    return schema;
  });
}

export function coerceRowsToSchema(
  rows: Row[],
  schema: ColumnSchema[],
  options?: InferenceOptions
): CoercionResult {
  const issues: CoercionIssue[] = [];

  const coercedRows = rows.map((inputRow, rowIndex) => {
    const outputRow: Row = { ...inputRow };

    for (const column of schema) {
      const columnName = column.columnName;
      const targetType = column.inferredType;
      const originalValue = inputRow[columnName];

      switch (targetType) {
        case "number": {
          const parsed = parseNumeric(originalValue);
          if (parsed === null && originalValue != null && originalValue !== "") {
            issues.push({
              rowIndex,
              columnName,
              originalValue,
              targetType: "number",
              message: "Value is not a valid number",
            });
          }
          outputRow[columnName] = parsed;
          break;
        }

        case "boolean": {
          const parsed = parseBoolean(originalValue, {
            stringAsBoolean: true,
            ...options,
          });
          if (parsed === null && originalValue != null && originalValue !== "") {
            issues.push({
              rowIndex,
              columnName,
              originalValue,
              targetType: "boolean",
              message: "Value is not a valid boolean",
            });
          }
          outputRow[columnName] = parsed;
          break;
        }

        case "date": {
          const parsed = tryParseDate(originalValue, options);
          if (parsed === null && originalValue != null && originalValue !== "") {
            issues.push({
              rowIndex,
              columnName,
              originalValue,
              targetType: "date",
              message: "Value is not a valid date",
            });
          }
          // Store ISO strings for consistency on the frontend
          outputRow[columnName] = parsed ? parsed.toISOString() : null;
          break;
        }

        case "string": {
          const stringValue =
            (originalValue as string | null | undefined) ?? null;
          if (stringValue === null) {
            outputRow[columnName] = null;
          } else {
            const trimmed =
              options?.trimStrings === false
                ? String(stringValue)
                : String(stringValue).trim();
            outputRow[columnName] = trimmed;
          }
          break;
        }

        case "null": {
          outputRow[columnName] = null;
          break;
        }

        case "mixed":
        case "unknown":
        default: {
          outputRow[columnName] = originalValue ?? null;
        }
      }
    }

    return outputRow;
  });

  return { coercedRows, issues };
}

// ----------------------- Backwards-Compatible API --------------------------
// These preserve your previous public surface so nothing breaks downstream.
// Marked @deprecated with TODOs to delete post-migration.

/** @deprecated Use inferSchema(rows) + buildColumnStats instead.
 *  TODO(AFT-MIGRATION): remove after all call sites are updated.
 *  Search & replace: inferType(...) -> inferSchema(rows) + select column type.
 */
export function inferType(values: unknown[]): SimpleType {
  const nonBlankSample = values.filter((value) => !isBlank(value)).slice(0, 50);
  if (nonBlankSample.length === 0) return "string";

  // All numbers → number (unless ID-like). Never infer date from numbers alone.
  if (nonBlankSample.every((value) => typeof value === "number")) {
    if (nonBlankSample.some(isLongIntegerLike)) return "string";
    return "number";
  }

  // All look like booleans?
  if (
    nonBlankSample.every((value) =>
      isBooleanLike(value, { stringAsBoolean: true })
    )
  )
    return "boolean";

  // All look like dates?
  if (nonBlankSample.every((value) => looksLikeDateString(value)))
    return "date";

  // All numeric-like strings? (guard IDs)
  if (nonBlankSample.every((value) => isLooseNumber(value))) {
    if (nonBlankSample.some(isLongIntegerLike)) return "string";
    return "number";
  }

  return "string";
}

/** @deprecated Use coerceRowsToSchema(rows, schema) for row-level coercion.
 *  TODO(AFT-MIGRATION): remove after migration.
 *  Search & replace: coerce(v, t) -> handled inside coerceRowsToSchema.
 */
export function coerce(
  value: unknown,
  targetType: SimpleType,
  options?: { dayFirst?: boolean }
): string | number | boolean | null {
  const preferDayFirst = options?.dayFirst ?? true;

  if (isBlank(value)) return null;

  switch (targetType) {
    case "number": {
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      let numericString = String(value).trim();
      numericString = numericString.replace(/[^\d.,-]/g, "");
      if (!numericString) return null;

      const lastDotIndex = numericString.lastIndexOf(".");
      const lastCommaIndex = numericString.lastIndexOf(",");
      const decimalIsComma = lastCommaIndex > lastDotIndex;

      if (decimalIsComma) {
        numericString = numericString.replace(/\./g, "").replace(",", ".");
      } else {
        numericString = numericString.replace(/,/g, "");
      }

      const numeric = Number(numericString);
      return Number.isFinite(numeric) ? numeric : null;
    }

    case "boolean": {
      if (typeof value === "boolean") return value;
      const normalized = String(value).trim().toLowerCase();
      if (["true", "1", "yes", "y", "si", "sí"].includes(normalized)) return true;
      if (["false", "0", "no", "n"].includes(normalized)) return false;
      return null;
    }

    case "date": {
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString();
      }
      const raw = String(value).trim();
      if (!raw) return null;

      // Accept ISO via native Date
      const native = Date.parse(raw);
      if (!Number.isNaN(native)) return new Date(native).toISOString();

      // dd/mm/yyyy or mm/dd/yyyy with preference via dayFirst, fallback to opposite
      const match = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (match) {
        const toDate = (day: number, month: number, year: number) => {
          const fullYear = year < 100 ? 2000 + year : year;
          const dt = new Date(Date.UTC(fullYear, month - 1, day));
          return isNaN(dt.getTime()) ? null : dt;
        };

        const a = parseInt(match[1], 10);
        const b = parseInt(match[2], 10);
        const y = parseInt(match[3], 10);

        const preferred = preferDayFirst ? toDate(a, b, y) : toDate(b, a, y);
        const fallback = preferDayFirst ? toDate(b, a, y) : toDate(a, b, y);
        const parsed = preferred ?? fallback;
        return parsed ? parsed.toISOString() : null;
      }
      return null;
    }

    default:
      return String(value);
  }
}

/** @deprecated Use inferSchema(rows) instead.
 *  TODO(AFT-MIGRATION): remove after migration.
 */
export function detectColumnTypes(
  rawRows: unknown[][],
  headers: string[],
  sampleSize = 50
): Record<string, SimpleType> {
  const result: Record<string, SimpleType> = {};
  const limit = Math.min(sampleSize, rawRows.length);

  headers.forEach((headerName, columnIndex) => {
    const sampleValues: unknown[] = [];
    for (let rowIndex = 0; rowIndex < limit; rowIndex++) {
      sampleValues.push(rawRows[rowIndex]?.[columnIndex]);
    }
    result[headerName] = inferType(sampleValues);
  });

  return result;
}

/** @deprecated Prefer explicit mapping built from inferSchema + normalizeHeaders.
 *  TODO(AFT-MIGRATION): remove after migration.
 */
export function buildInitialMapping(
  headers: string[],
  inferred: Record<string, SimpleType>
) {
  const usedNames = new Set<string>();
  return headers.map((headerText, index) => ({
    map_from: headerText,
    name: normalizeHeader(headerText, index, usedNames),
    type: inferred[headerText] || "string",
  }));
}

// --------------------------- Header normalization --------------------------

/** Normalize a single header to a safe, unique name (lowercase, separated with underscores). */
export function normalizeHeader(
  headerText: string,
  headerIndex: number,
  usedNames: Set<string>
): string {
  let base =
    (headerText || "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_")
      .replace(/^_+|_+$/g, "") || `col_${headerIndex + 1}`;

  let candidate = base;
  let suffix = 2;
  while (usedNames.has(candidate)) {
    candidate = `${base}_${suffix}`;
    suffix += 1;
  }
  usedNames.add(candidate);
  return candidate;
}

export function normalizeHeaders(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map((headerText, index) =>
    normalizeHeader(headerText, index, used)
  );
}


