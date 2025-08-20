// src/lib/google-sheets/grouping.ts
// -----------------------------------------------------------------------------
// Canonical API (keep long-term):
//   - groupRows(rows, config) -> { groups, groupIndex, flatWithParents }
//   - buildGroupKey(row, config)
//   - toggleGroupInFlat(flat, groupId, expanded)
//
// Legacy/compat API (temporary; remove after migration):
//   - inferParentChildRoles(records, groupBy, fields?)            @deprecated  TODO(AFT-MIGRATION): remove
//   - groupRecords(records, config)                                @deprecated  TODO(AFT-MIGRATION): remove
//
// Notes:
// - This file is front-end only, pure functions, no React deps.
// - Variable names are descriptive for readability.
// -----------------------------------------------------------------------------

/** Generic row shape */
export type Row = Record<string, unknown>;

/** Lightweight stable id (FNV-1a-ish) encoded base36.
 *  TODO(AFT-MIGRATION): replace with a single shared implementation from merge.ts (makeId).
 */
function makeStableId(keyText: string): string {
  let hash = 2166136261 >>> 0;
  for (let idx = 0; idx < keyText.length; idx++) {
    hash ^= keyText.charCodeAt(idx);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return (hash >>> 0).toString(36);
}

/* =============================== Canonical API =============================== */

export type NormalizeValue = (value: unknown) => unknown;

export interface GroupConfig {
  /** Key columns used to group rows, e.g. ["orderNumber"] or ["orderNumber","customerId"] */
  keys: string[];
  /** Only synthesize a parent row when group size >= minSizeForParent. Default: 2 */
  minSizeForParent?: number;
  /** Case-insensitive normalization for string key parts. Default: true */
  caseInsensitive?: boolean;
  /** Trim whitespace for string key parts. Default: true */
  trimStrings?: boolean;
  /** Treat null/undefined/empty string as the same key value. Default: true */
  treatNullUndefinedEmptyAsSame?: boolean;
}

export interface GroupedRow extends Row {
  /** Deterministic row id (external to grouping; keep whatever you already attach) */
  __id: string;
  /** Group identifier derived from key columns */
  __groupId?: string;
  /** True for the synthesized parent row in flat views */
  __isParent?: boolean;
  /** Number of children in the group (on synthetic parent rows) */
  __childrenCount?: number;
}

function defaultNormalize(config: GroupConfig): NormalizeValue {
  return (value: unknown) => {
    if (value == null && config.treatNullUndefinedEmptyAsSame !== false) return "";
    if (typeof value === "string") {
      let text = value;
      if (config.trimStrings !== false) text = text.trim();
      if (config.caseInsensitive !== false) text = text.toLowerCase();
      return text;
    }
    return value;
  };
}

/** Build a stable group key string from the row and configuration */
export function buildGroupKey(row: Row, config: GroupConfig, normalize: NormalizeValue = defaultNormalize(config)): string {
  const parts = config.keys.map((columnName) => normalize((row as any)[columnName]));
  return JSON.stringify(parts);
}

export interface Group {
  /** Stable id derived from the normalized key parts */
  groupId: string;
  /** The normalized key parts used to build the group */
  keyParts: unknown[];
  /** The child rows (original rows) belonging to the group */
  rows: GroupedRow[];
}

/** Group rows, return:
 *  - groups: array of groups with child rows
 *  - groupIndex: Map groupId -> group
 *  - flatWithParents: a flat array that includes synthetic parent rows followed by children
 */
export function groupRows<T extends Row & { __id: string }>(
  rows: T[],
  config: GroupConfig
): { groups: Group[]; groupIndex: Map<string, Group>; flatWithParents: GroupedRow[] } {
  const minSizeForParent = config.minSizeForParent ?? 2;
  const normalize = defaultNormalize(config);

  // 1) Bucket rows by normalized key
  const buckets = new Map<string, T[]>();
  for (const inputRow of rows) {
    const keyString = buildGroupKey(inputRow, config, normalize);
    const existing = buckets.get(keyString);
    if (existing) existing.push(inputRow);
    else buckets.set(keyString, [inputRow]);
  }

  // 2) Build groups with stable groupId
  const groups: Group[] = [];
  for (const [keyString, bucketRows] of buckets) {
    const keyParts = JSON.parse(keyString);
    const groupId = "g_" + makeStableId(keyString);
    const childRows: GroupedRow[] = bucketRows.map((r) => ({ ...r, __groupId: groupId }));
    groups.push({ groupId, keyParts, rows: childRows });
  }

  const groupIndex = new Map(groups.map((g) => [g.groupId, g]));

  // 3) Build flat list with optional synthetic parents
  const flatWithParents: GroupedRow[] = [];
  for (const group of groups) {
    if (group.rows.length >= minSizeForParent) {
      const representative = group.rows[0];
      const parentRow: GroupedRow = {
        __id: "p_" + group.groupId,
        __groupId: group.groupId,
        __isParent: true,
        __childrenCount: group.rows.length,
        // copy key columns to the parent for easy display
        ...Object.fromEntries(
          Object.keys(representative ?? {})
            .filter((columnName) => config.keys.includes(columnName))
            .map((columnName) => [columnName, (representative as any)[columnName]])
        ),
      };
      flatWithParents.push(parentRow, ...group.rows);
    } else {
      // no parent needed (singleton or below threshold)
      flatWithParents.push(...group.rows);
    }
  }

  return { groups, groupIndex, flatWithParents };
}

/** Toggle expand/collapse of a group in a previously built flat list.
 *  When collapsing, removes children; when expanding, you should rebuild from groups or
 *  re-insert children after the parent.
 *
 *  Note: This utility collapses; to expand reliably, prefer re-creating flatWithParents
 *  from { groups } to avoid drift.
 */
export function toggleGroupInFlat(
  currentFlat: GroupedRow[],
  groupId: string,
  expanded: boolean
): GroupedRow[] {
  if (expanded) {
    // Easiest and safest: leave expansion to a fresh build from groups.
    // Returning the currentFlat avoids accidental duplication.
    return currentFlat;
  }

  // Collapse: remove all children belonging to the group, keep the parent
  const collapsed: GroupedRow[] = [];
  for (const row of currentFlat) {
    if (row.__groupId === groupId && row.__isParent !== true) {
      // skip child
      continue;
    }
    collapsed.push(row);
  }
  return collapsed;
}

/* ============================ Legacy / Compat API =========================== */
/** Strategies for PARENT fields in legacy grouping. */
export type FieldStrategy =
  | "firstNonBlank"
  | "sameAcrossGroup"
  | { kind: "sum"; childField: string }; // e.g. sum of child.quantity_kg

/** Legacy grouping configuration. */
export type GroupingConfig = {
  groupBy: string[];                     // keys present in the mapped records
  parentFields: string[];                // fields to keep at parent level
  childFields: string[];                 // fields to keep at child level
  fieldStrategies?: Record<string, FieldStrategy>; // per PARENT field
};

export type GroupingResult = {
  parents: Record<string, unknown>[];
  children: Record<string, unknown>[];
  stats: { groups: number; parents: number; children: number };
};

const isBlank = (value: unknown) =>
  value === null || value === undefined || (typeof value === "string" && value.trim() === "");

/** @deprecated Use the canonical `groupRows` + your own UI rendering.
 *  Rule: field is Parent if constant within each group (ignoring blanks), otherwise Child.
 *  - groupBy fields are always Parent.
 *  TODO(AFT-MIGRATION): remove after all call sites are updated.
 */
export function inferParentChildRoles(
  records: Record<string, unknown>[],
  groupBy: string[],
  fields?: string[]
): { parentFields: string[]; childFields: string[] } {
  const parentFieldsSet = new Set<string>(groupBy);
  const childFieldsSet = new Set<string>();

  if (!records || records.length === 0) {
    return { parentFields: Array.from(parentFieldsSet), childFields: [] };
  }

  const allFieldNames =
    fields && fields.length
      ? fields.slice()
      : Array.from(
          records.reduce<Set<string>>((accumulator, record) => {
            Object.keys(record || {}).forEach((key) => accumulator.add(key));
            return accumulator;
          }, new Set<string>())
        );

  const separator = "¦¦";
  const makeGroupKey = (record: Record<string, unknown>) =>
    groupBy.map((key) => String(record?.[key] ?? "")).join(separator);

  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const record of records) {
    const groupKey = makeGroupKey(record);
    const bucket = buckets.get(groupKey);
    if (bucket) bucket.push(record);
    else buckets.set(groupKey, [record]);
  }

  for (const fieldName of allFieldNames) {
    if (groupBy.includes(fieldName)) continue;

    let variesWithinGroups = false;
    for (const [, rowsInGroup] of buckets) {
      const uniqueValues = new Set<string>();
      for (const row of rowsInGroup) {
        const value = row?.[fieldName];
        if (!isBlank(value)) uniqueValues.add(String(value));
        if (uniqueValues.size > 1) break;
      }
      if (uniqueValues.size > 1) {
        variesWithinGroups = true;
        break;
      }
    }

    if (variesWithinGroups) childFieldsSet.add(fieldName);
    else parentFieldsSet.add(fieldName);
  }

  for (const fieldName of allFieldNames) {
    if (groupBy.includes(fieldName)) continue;
    if (!parentFieldsSet.has(fieldName) && !childFieldsSet.has(fieldName)) {
      childFieldsSet.add(fieldName);
    }
  }

  const orderBy = (set: Set<string>) =>
    (fields && fields.length ? fields : Array.from(set)).filter((f) => set.has(f));

  const parentFields = orderBy(parentFieldsSet);
  const childFields = orderBy(childFieldsSet).filter((f) => !parentFieldsSet.has(f));

  return { parentFields, childFields };
}

/** @deprecated Prefer canonical `groupRows` and compute rollups in a dedicated step.
 *  This legacy function returns separate `parents` and `children` arrays according to
 *  the provided strategies.
 *  TODO(AFT-MIGRATION): remove after all call sites are updated.
 */
export function groupRecords(
  records: Record<string, unknown>[],
  config: GroupingConfig
): GroupingResult {
  if (!config?.groupBy?.length) {
    return {
      parents: [],
      children: [],
      stats: { groups: 0, parents: 0, children: 0 },
    };
  }

  // 1) Bucket rows by group key
  const separator = "¦¦";
  const makeGroupKey = (record: Record<string, unknown>) =>
    config.groupBy.map((key) => String(record[key] ?? "")).join(separator);

  const buckets = new Map<string, Record<string, unknown>[]>();
  for (const record of records) {
    const groupKey = makeGroupKey(record);
    const bucket = buckets.get(groupKey);
    if (bucket) bucket.push(record);
    else buckets.set(groupKey, [record]);
  }

  const parentRows: Record<string, unknown>[] = [];
  const childRows: Record<string, unknown>[] = [];

  // 2) Build parents and children
  for (const [, rowsInGroup] of buckets) {
    // children: copy groupBy + childFields from each row
    for (const row of rowsInGroup) {
      const childRecord: Record<string, unknown> = {};
      for (const keyColumn of config.groupBy) childRecord[keyColumn] = row[keyColumn];
      for (const childField of config.childFields) childRecord[childField] = row[childField];
      childRows.push(childRecord);
    }

    // parent: apply strategies per parent field
    const parentRecord: Record<string, unknown> = {};
    const firstRow = rowsInGroup[0];

    // always include group keys in parent
    for (const keyColumn of config.groupBy) parentRecord[keyColumn] = firstRow?.[keyColumn];

    for (const parentField of config.parentFields) {
      const strategy = config.fieldStrategies?.[parentField];

      if (typeof strategy === "object" && strategy?.kind === "sum") {
        const childFieldName = strategy.childField;
        const total = rowsInGroup.reduce((accumulator, row) => {
          const numericValue = Number(row?.[childFieldName]) || 0;
          return accumulator + numericValue;
        }, 0);
        parentRecord[parentField] = total;
        continue;
      }

      if (strategy === "sameAcrossGroup") {
        const baseValue = firstRow?.[parentField];
        const allSame = rowsInGroup.every(
          (row) => String(row?.[parentField] ?? "") === String(baseValue ?? "")
        );
        parentRecord[parentField] = allSame ? baseValue : baseValue;
        continue;
      }

      // default & "firstNonBlank"
      const nonBlankRow = rowsInGroup.find((row) => !isBlank(row?.[parentField]));
      parentRecord[parentField] = nonBlankRow?.[parentField] ?? firstRow?.[parentField] ?? null;
    }

    parentRows.push(parentRecord);
  }

  return {
    parents: parentRows,
    children: childRows,
    stats: { groups: buckets.size, parents: parentRows.length, children: childRows.length },
  };
}
