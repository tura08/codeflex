export type SimpleType = "string" | "number" | "boolean" | "date";

export function inferType(values: any[]): SimpleType {
  const sample = values.slice(0, 50).filter(v => v !== "" && v !== null && v !== undefined);
  if (sample.length && sample.every(v => typeof v === "number" || (!isNaN(Number(v)) && v !== true && v !== false))) return "number";
  if (sample.length && sample.every(v => typeof v === "boolean" || ["true","false"].includes(String(v).toLowerCase()))) return "boolean";
  if (sample.length && sample.every(v => !isNaN(Date.parse(String(v))))) return "date";
  return "string";
}

export function coerce(value: any, t: SimpleType) {
  if (value === "" || value === undefined) return null;
  switch (t) {
    case "number": return value === null ? null : Number(value);
    case "boolean": {
      if (typeof value === "boolean") return value;
      const s = String(value).toLowerCase();
      return s === "true" ? true : s === "false" ? false : null;
    }
    case "date": {
      const ts = Date.parse(String(value));
      return isNaN(ts) ? null : new Date(ts).toISOString();
    }
    default: return String(value);
  }
}

export function normalizeHeader(h: string, i: number, used: Set<string>) {
  let s = (h || "").trim().toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")  // spaces & symbols → _
    .replace(/^_+|_+$/g, "")          // trim _
    || `col_${i+1}`;
  while (used.has(s)) s = `${s}_2`;
  used.add(s);
  return s;
}
