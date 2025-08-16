// src/integrations/google/hooks/useFinalDataset.ts
import { useMemo } from "react";
import type { SimpleType } from "@/lib/google/infer";
import { coerce } from "@/lib/google/infer";

// Reuse your Mapping shape: { map_from, name, type }
export type Mapping = { map_from: string; name: string; type: SimpleType };

export type FinalRecord = Record<string, any>;

export function useFinalDataset(
  rows: any[][],
  headers: string[],
  mapping: Mapping[]
) {
  const records = useMemo<FinalRecord[]>(() => {
    if (!rows?.length || !headers?.length || !mapping?.length) return [];

    // header → index
    const idx: Record<string, number> = {};
    headers.forEach((h, i) => (idx[h] = i));

    return rows.map((r) => {
      const obj: FinalRecord = {};
      for (const m of mapping) {
        const i = idx[m.map_from];
        const v = i >= 0 ? r[i] : null;
        obj[m.name] = coerce(v, m.type, { dayFirst: true });
      }
      return obj;
    });
  }, [rows, headers, mapping]);

  // also expose the available field names for UI pickers
  const availableFields = useMemo(() => mapping.map((m) => m.name), [mapping]);

  return { records, availableFields };
}
