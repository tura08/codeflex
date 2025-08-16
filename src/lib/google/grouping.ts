// src/lib/google/grouping.ts
export type FieldStrategy =
  | "firstNonBlank"
  | "sameAcrossGroup"
  | { kind: "sum"; childField: string }; // e.g. sum of child.quantita_kg

export type GroupingConfig = {
  groupBy: string[];                     // keys present in the mapped records
  parentFields: string[];                // fields to keep at parent level
  childFields: string[];                 // fields to keep at child level
  fieldStrategies?: Record<string, FieldStrategy>; // per PARENT field
};

export type GroupingResult = {
  parents: Record<string, any>[];
  children: Record<string, any>[];
  stats: { groups: number; parents: number; children: number };
};

const isBlank = (v: any) =>
  v === null || v === undefined || (typeof v === "string" && v.trim() === "");


/**
 * Infer Parent vs Child roles automatically given a group key.
 * Rule: a field is "Parent" if it is constant within each group (ignoring blanks). Otherwise "Child".
 * - groupBy fields are always Parent.
 * - If `fields` is provided, result ordering follows `fields`. Otherwise we derive keys from records.
 */
export function inferParentChildRoles(
  records: Record<string, any>[],
  groupBy: string[],
  fields?: string[]
): { parentFields: string[]; childFields: string[] } {
  const parent = new Set<string>(groupBy);
  const child = new Set<string>();

  if (!records || records.length === 0) {
    return { parentFields: Array.from(parent), childFields: [] };
  }

  // Determine the universe of fields
  const allFields = fields && fields.length
    ? fields.slice()
    : Array.from(
        records.reduce<Set<string>>((acc, r) => {
          Object.keys(r || {}).forEach((k) => acc.add(k));
          return acc;
        }, new Set<string>())
      );

  // Build groups
  const SEP = "¦¦";
  const keyOf = (r: Record<string, any>) => groupBy.map((k) => String(r?.[k] ?? "")).join(SEP);
  const buckets = new Map<string, Record<string, any>[]>();
  for (const r of records) {
    const k = keyOf(r);
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }

  // Classify each non-key field by constancy within groups
  for (const f of allFields) {
    if (groupBy.includes(f)) continue;

    let varies = false;

    for (const [, rows] of buckets) {
      const uniq = new Set<string>();
      for (const row of rows) {
        const v = row?.[f];
        if (!isBlank(v)) uniq.add(String(v));
        if (uniq.size > 1) break; // early exit: this field varies within the group
      }
      if (uniq.size > 1) {
        varies = true;
        break;
      }
    }

    if (varies) child.add(f);
    else parent.add(f);
  }

  // Ensure everything is classified and consistent
  for (const f of allFields) {
    if (groupBy.includes(f)) continue;
    if (!parent.has(f) && !child.has(f)) child.add(f);
  }

  // Respect original order if `fields` provided, else default to set order
  const ordered = (s: Set<string>) =>
    (fields && fields.length ? fields : Array.from(s)).filter((f) => s.has(f));

  const parentFields = ordered(parent);
  const childFields = ordered(child).filter((f) => !parent.has(f)); // guard against overlaps

  return { parentFields, childFields };
}

export function groupRecords(
  records: Record<string, any>[],
  cfg: GroupingConfig
): GroupingResult {
  if (!cfg?.groupBy?.length) {
    // grouping is "off" if no keys provided
    return {
      parents: [],
      children: [],
      stats: { groups: 0, parents: 0, children: 0 },
    };
  }

  // 1) bucket rows by group key
  const sep = "¦¦"; // unlikely to appear in data
  const keyOf = (r: Record<string, any>) => cfg.groupBy.map((k) => String(r[k] ?? "")).join(sep);

  const buckets = new Map<string, Record<string, any>[]>();
  for (const r of records) {
    const k = keyOf(r);
    const arr = buckets.get(k);
    if (arr) arr.push(r);
    else buckets.set(k, [r]);
  }

  const parents: Record<string, any>[] = [];
  const children: Record<string, any>[] = [];

  // 2) build parent & children per group
  for (const [, rows] of buckets) {
    // children: copy groupBy + childFields from each row
    for (const row of rows) {
      const child: Record<string, any> = {};
      for (const f of cfg.groupBy) child[f] = row[f];
      for (const f of cfg.childFields) child[f] = row[f];
      children.push(child);
    }

    // parent: for each parent field, apply strategy
    const parent: Record<string, any> = {};
    const first = rows[0];

    // always include group keys in parent
    for (const f of cfg.groupBy) parent[f] = first?.[f];

    for (const f of cfg.parentFields) {
      const strategy = cfg.fieldStrategies?.[f];

      if (typeof strategy === "object" && strategy?.kind === "sum") {
        const childField = strategy.childField;
        const total = rows.reduce((acc, r) => acc + (Number(r?.[childField]) || 0), 0);
        parent[f] = total;
        continue;
      }

      if (strategy === "sameAcrossGroup") {
        const base = first?.[f];
        const allSame = rows.every((r) => String(r?.[f] ?? "") === String(base ?? ""));
        // if not all same, we still take first (or set null if you prefer strictness)
        parent[f] = allSame ? base : base;
        continue;
      }

      // default & "firstNonBlank"
      const nonBlank = rows.find((r) => !isBlank(r?.[f]));
      parent[f] = nonBlank?.[f] ?? first?.[f] ?? null;
    }

    parents.push(parent);
  }

  return {
    parents,
    children,
    stats: { groups: buckets.size, parents: parents.length, children: children.length },
  };
}
