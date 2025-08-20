// src/lib/google/transform.ts
import { normalizeHeader, coerce, inferTypeRobust, type SimpleType } from "@/lib/google/infer";

/** A cell is blank if it's null/undefined or a whitespace-only string. */
export function isCellBlank(v: unknown) {
  return v == null || (typeof v === "string" && v.trim() === "");
}

export function isRowBlank(row: any[]) {
  return Array.isArray(row) && row.every(isCellBlank);
}

/** Normalize raw Sheets values into { headers, rows } with fixed width by headers. */
export function normalizeSheetValues(values: string[][], headerRow: number, maxRows: number) {
  const hr = Math.max(1, headerRow) - 1; // 0-based
  const headers = (values[hr] ?? []).map((v) => String(v ?? ""));
  const raw = values.slice(hr + 1, hr + 1 + Math.max(1, maxRows));
  const rows = raw.map((r) => {
    const out = r.slice(0, headers.length);
    while (out.length < headers.length) out.push("");
    return out;
  });
  return { headers, rows };
}

/** Remove fully blank rows. */
export function filterBlankRows(rows: any[][]) {
  return rows.filter((r) => !isRowBlank(r));
}

/** Remove rows by a Set of indexes (pure). */
export function removeRowsByIndex(rows: any[][], idxSet: Set<number>) {
  if (!idxSet.size) return rows;
  const out: any[][] = [];
  for (let i = 0; i < rows.length; i++) if (!idxSet.has(i)) out.push(rows[i]);
  return out;
}

/** Remove columns by indices (pure). Returns { headers, rows }. */
export function removeColumnsByIndex(headers: string[], rows: any[][], indices: number[]) {
  const keep = new Set(headers.map((_, i) => i).filter((i) => !indices.includes(i)));
  const newHeaders = headers.filter((_, i) => keep.has(i));
  const newRows = rows.map((r) => r.filter((_, i) => keep.has(i)));
  return { headers: newHeaders, rows: newRows };
}

/** Fast column index lookup. */
export function buildHeaderIndex(headers: string[]) {
  const idx: Record<string, number> = {};
  headers.forEach((h, i) => (idx[h] = i));
  return idx;
}

/** Map preview rows to typed records using mapping + coerce (pure). */
export function mapRowsToRecords(
  rows: any[][],
  headers: string[],
  mapping: Array<{ name: string; map_from: string; type: SimpleType }>
) {
  if (!rows.length || !headers.length || !mapping.length) return [];
  const idx = buildHeaderIndex(headers);
  return rows.map((r) => {
    const obj: Record<string, any> = {};
    for (const m of mapping) {
      const i = idx[m.map_from];
      const v = i >= 0 ? r?.[i] : null;
      obj[m.name] = coerce(v, m.type, { dayFirst: true });
    }
    return obj;
  });
}

/** Build initial mapping (unique names + robust type inference from the *current rows*). */
export function buildInitialMappingFromRows(headers: string[], rows: any[][]) {
  const used = new Set<string>();
  return headers.map((h, i) => ({
    map_from: h || "col",
    name: normalizeHeader(h || "col", i, used),
    type: inferTypeRobust(rows.map((r) => r?.[i])),
  }));
}

/**
 * Reconcile mapping types with current data:
 * - Only update columns that are NOT "locked"
 *   (you can mark columns as locked when the user manually changes its type)
 */
export function reconcileMappingTypes<T extends { name: string; map_from: string; type: SimpleType; locked?: boolean }>(
  mapping: T[],
  headers: string[],
  rows: any[][]
): T[] {
  if (!rows.length || !headers.length || !mapping.length) return mapping;
  // infer per column
  const inferredByFrom: Record<string, SimpleType> = {};
  headers.forEach((h, colIdx) => {
    const colVals = rows.map((r) => r?.[colIdx]);
    inferredByFrom[h] = inferTypeRobust(colVals);
  });
  return mapping.map((m) =>
    m.locked ? m : ({ ...m, type: inferredByFrom[m.map_from] ?? m.type })
  );
}
