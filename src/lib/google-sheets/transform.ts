// src/lib/google-sheets/transform.ts
import type { Row } from "./source";

/* =============================== Core MVP ops ============================== */

export function removeColumns(currentHeaders: string[], columnsToRemove: string[]) {
  const removeSet = new Set(columnsToRemove);
  return currentHeaders.filter((header) => !removeSet.has(header));
}

export function projectRows(
  rows: Row[],
  visibleHeaders: string[],
  removedColumns: Set<string>
): Row[] {
  return rows.map((row) => {
    const projected: Row = {};
    for (const headerName of visibleHeaders) {
      if (!removedColumns.has(headerName)) projected[headerName] = row[headerName];
    }
    return projected;
  });
}

export function removeRowsById<T extends Row & { __id: string }>(
  rows: T[],
  selectedIds: Set<string>
): T[] {
  return rows.filter((row) => !selectedIds.has(row.__id));
}

export function setCell<T extends Row & { __id: string }>(
  rows: T[],
  rowId: string,
  fieldName: string,
  newValue: unknown
): T[] {
  return rows.map((row) => (row.__id === rowId ? { ...row, [fieldName]: newValue } : row));
}

export function bulkSet<T extends Row & { __id: string }>(
  rows: T[],
  ids: string[],
  patch: Partial<Row>
): T[] {
  const idSet = new Set(ids);
  return rows.map((row) => (idSet.has(row.__id) ? { ...row, ...patch } : row));
}

export function sortRows(
  rows: Row[],
  sortBy: string,
  direction: "asc" | "desc" = "asc"
): Row[] {
  return [...rows].sort((left, right) => {
    const leftValue = left[sortBy] as any;
    const rightValue = right[sortBy] as any;
    const comparison = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0;
    return direction === "desc" ? -comparison : comparison;
  });
}

export function filterRows(rows: Row[], predicate: (row: Row) => boolean): Row[] {
  return rows.filter(predicate);
}
