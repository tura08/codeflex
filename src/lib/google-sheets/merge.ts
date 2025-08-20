// merge.ts
import type { Row } from "./source";

export type IdKey = (r: Row) => string;

// example identity: orderNumber + productCode
export const defaultIdKey: IdKey = r => `${r.orderNumber ?? ""}|${r.productCode ?? ""}`;

// simple fast hash → base36
export function makeId(key: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h += (h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24); }
  return (h >>> 0).toString(36);
}

export type LocalPreserve = string[]; // e.g., ["status", "notes"]

export interface IdentifiedRow extends Row { __id: string }

export function attachIds(rows: Row[], idKey: IdKey = defaultIdKey): IdentifiedRow[] {
  return rows.map(r => ({ ...r, __id: makeId(idKey(r)) }));
}

export function upsertMerge(
  existing: IdentifiedRow[],
  incoming: Row[],
  options?: { idKey?: IdKey; preserve?: LocalPreserve; dropMissing?: boolean }
): IdentifiedRow[] {
  const idKey = options?.idKey ?? defaultIdKey;
  const preserve = new Set(options?.preserve ?? []);
  const keepOnlyIncoming = !!options?.dropMissing;

  const map = new Map(existing.map(r => [r.__id, r]));
  const incomingWithId = attachIds(incoming, idKey);

  for (const row of incomingWithId) {
    const prev = map.get(row.__id);
    if (!prev) {
      map.set(row.__id, row);
    } else {
      const merged = { ...row };
      for (const f of preserve) if (prev[f] !== undefined) (merged as any)[f] = prev[f];
      map.set(row.__id, merged);
    }
  }

  if (keepOnlyIncoming) return Array.from(map.values()).filter(r =>
    incomingWithId.some(n => n.__id === r.__id)
  );
  return Array.from(map.values());
}
