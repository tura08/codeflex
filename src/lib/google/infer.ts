// src/lib/google/infer.ts

export type SimpleType = "string" | "number" | "boolean" | "date";

/* -----------------------------------------------------------
 * Helpers
 * ---------------------------------------------------------*/
function isBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

function isLooseNumber(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  const s = String(v).trim();
  if (!s) return false;

  // Reject if contains any letter
  if (/[a-zA-Z]/.test(s)) return false;

  // integers / decimals with , or . thousand/decimal separators
  return /^-?\d{1,3}([.,]\d{3})*([.,]\d+)?$|-?\d+([.,]\d+)?$/.test(s);
}


function isLooseBoolean(v: unknown): boolean {
  if (typeof v === "boolean") return true;
  const s = String(v).trim().toLowerCase();
  return ["true", "false", "1", "0", "yes", "no", "y", "n"].includes(s);
}

function looksLikeDateString(v: unknown): boolean {
  if (v instanceof Date) return !isNaN(v.getTime());
  const s = String(v).trim();
  if (!s) return false;
  // don't treat long integers as dates
  if (/^\d{5,}$/.test(s)) return false;
  // ISO-ish
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) return true;
  // dd/mm/yyyy or mm/dd/yyyy
  if (/^\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}$/.test(s)) return true;
  const t = Date.parse(s);
  return !Number.isNaN(t) && /[\/\-\.]/.test(s);
}

/* ---------- ID-like (long integer) heuristic ----------------- */
function isLongIntegerLike(val: unknown): boolean {
  if (typeof val === "number" && Number.isFinite(val)) {
    if (!Number.isInteger(val)) return false;
    const digits = Math.floor(Math.log10(Math.abs(val))) + 1;
    return digits >= 9;
  }
  const s = String(val).trim();
  const digitsOnly = s.replace(/[^\d]/g, "");
  const hasDecimal = /[.,]\d+$/.test(s);
  return !hasDecimal && digitsOnly.length >= 9;
}

/* -----------------------------------------------------------
 * Public: type inference
 * ---------------------------------------------------------*/
export function inferType(values: any[]): SimpleType {
  const sample = values.filter(v => !isBlank(v)).slice(0, 50);
  if (!sample.length) return "string";

  // All numbers → number (or string if ID-like). Never infer "date" from numbers.
  if (sample.every(v => typeof v === "number")) {
    if (sample.some(isLongIntegerLike)) return "string";
    return "number";
  }

  // Mixed strings: check booleans/dates first
  if (sample.every(isLooseBoolean)) return "boolean";
  if (sample.every(looksLikeDateString)) return "date";

  // Mostly numeric strings? guard against long IDs
  if (sample.every(isLooseNumber)) {
    if (sample.some(isLongIntegerLike)) return "string";
    return "number";
  }

  return "string";
}

/* -----------------------------------------------------------
 * Public: robust inference (tolerates outliers)
 * ---------------------------------------------------------*/
function classifyValue(v: any): SimpleType | null {
  if (v == null || (typeof v === "string" && v.trim() === "")) return null;
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number" && Number.isFinite(v)) return "number";

  const s = String(v).trim();
  const low = s.toLowerCase();

  if (["true","false","1","0","yes","no","y","n"].includes(low)) return "boolean";
  if (isLooseNumber(s) && !isLongIntegerLike(s)) return "number";
  if (looksLikeDateString(s)) return "date";

  return "string";
}

export function inferTypeRobust(values: any[], opts?: { tolerance?: number; minSample?: number }): SimpleType {
  const tolerance = opts?.tolerance ?? 0.2;  // allow up to 20% outliers
  const minSample = opts?.minSample ?? 8;    // need at least N non-blank samples

  const sample: SimpleType[] = [];
  for (const v of values) {
    const t = classifyValue(v);
    if (t) sample.push(t);
    if (sample.length >= 200) break; // cap work
  }
  if (sample.length < minSample) return "string";

  const counts: Record<SimpleType, number> = { string:0, number:0, boolean:0, date:0 };
  for (const t of sample) counts[t]++;

  // prefer non-string when close; order gives a slight bias
  const order: SimpleType[] = ["date", "number", "boolean", "string"];
  const top = order.slice().sort((a,b) => counts[b]-counts[a])[0];
  const share = counts[top] / sample.length;

  if (share < 1 - tolerance) return "string";
  return top;
}

/* -----------------------------------------------------------
 * Public: value coercion to target type
 * ---------------------------------------------------------*/
export function coerce(value: any, t: SimpleType, opts?: { dayFirst?: boolean }) {
  const dayFirst = opts?.dayFirst ?? true;
  if (isBlank(value)) return null;

  switch (t) {
    case "number": {
      if (typeof value === "number") return Number.isFinite(value) ? value : null;
      let s = String(value).trim();
      s = s.replace(/[^\d.,-]/g, "");
      if (!s) return null;
      const lastDot = s.lastIndexOf(".");
      const lastComma = s.lastIndexOf(",");
      const decimalIsComma = lastComma > lastDot;
      if (decimalIsComma) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else {
        s = s.replace(/,/g, "");
      }
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }

    case "boolean": {
      if (typeof value === "boolean") return value;
      const s = String(value).trim().toLowerCase();
      if (["true", "1", "yes", "y"].includes(s)) return true;
      if (["false", "0", "no", "n"].includes(s)) return false;
      return null;
    }

    case "date": {
      if (value instanceof Date && !isNaN(value.getTime())) {
        return value.toISOString();
      }
      const raw = String(value).trim();
      if (!raw) return null;

      // Accept ISO
      const native = Date.parse(raw);
      if (!Number.isNaN(native)) return new Date(native).toISOString();

      // dd/mm/yyyy or mm/dd/yyyy with preference via dayFirst, fallback to opposite
      const m = raw.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
      if (m) {
        const tryOrder = (d: number, M: number, y: number) => {
          const Y = y < 100 ? 2000 + y : y;
          const dt = new Date(Date.UTC(Y, M - 1, d));
          return isNaN(dt.getTime()) ? null : dt;
        };

        const a = parseInt(m[1], 10), b = parseInt(m[2], 10), y = parseInt(m[3], 10);
        const pref = dayFirst ? tryOrder(a, b, y) : tryOrder(b, a, y);
        const alt  = dayFirst ? tryOrder(b, a, y) : tryOrder(a, b, y);
        const dt = pref ?? alt;
        return dt ? dt.toISOString() : null;
      }
      return null;
    }

    default:
      return String(value);
  }
}

/* -----------------------------------------------------------
 * Public: header normalization (unique names)
 * ---------------------------------------------------------*/
export function normalizeHeader(h: string, i: number, used: Set<string>) {
  let base = (h || "").trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "");
  if (!base) base = `col_${i + 1}`;

  let name = base;
  let n = 2;
  while (used.has(name)) {
    name = `${base}_${n}`;
    n += 1;
  }
  used.add(name);
  return name;
}

export function normalizeHeaders(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map((h, i) => normalizeHeader(h, i, used));
}

/* -----------------------------------------------------------
 * Optional helpers
 * ---------------------------------------------------------*/
export function detectColumnTypes(
  rows: any[][],
  headers: string[],
  sample = 50
): Record<string, SimpleType> {
  const out: Record<string, SimpleType> = {};
  const limit = Math.min(sample, rows.length);
  headers.forEach((h, colIdx) => {
    const colVals = [];
    for (let i = 0; i < limit; i++) colVals.push(rows[i]?.[colIdx]);
    out[h] = inferType(colVals);
  });
  return out;
}

// export function buildInitialMapping(
//   headers: string[],
//   inferred: Record<string, SimpleType>
// ) {
//   const used = new Set<string>();
//   return headers.map((h, i) => ({
//     map_from: h,
//     name: normalizeHeader(h, i, used),
//     type: inferred[h] || "string",
//   }));
// }
