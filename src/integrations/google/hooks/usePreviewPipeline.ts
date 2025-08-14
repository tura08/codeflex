// src/integrations/google/hooks/usePreviewPipeline.ts
import { useCallback, useMemo, useRef, useState } from "react";
import {
  applyRules,
  validate,
  qualityFromIssues,
  type TransformRule,
  type Issue,
} from "@/lib/google/sheets-import";
import {
  inferType,
  normalizeHeader,
  type SimpleType,
} from "@/lib/google/infer";

type FetchPreviewFn = (
  spreadsheetId: string,
  sheetName: string,
  headerRow: number,
  maxRows: number
) => Promise<{ headers: string[]; rows: any[][] }>;

export type Mapping = { map_from: string; name: string; type: SimpleType };

// pick map_from headers for a given type
function pickColumnsByType(mapping: Mapping[], t: SimpleType): string[] {
  return mapping.filter((m) => m.type === t).map((m) => m.map_from);
}

/* ───────── helpers per “blank” ───────── */
function isCellBlank(v: unknown) {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}
function isRowBlank(row: any[]) {
  return row.every(isCellBlank);
}
function isRowMostlyBlank(row: any[], threshold = 0.8) {
  const blanks = row.filter(isCellBlank).length;
  return row.length > 0 && blanks / row.length >= threshold;
}

export function usePreviewPipeline(fetchPreview: FetchPreviewFn) {
  const fetchPreviewRef = useRef(fetchPreview);
  fetchPreviewRef.current = fetchPreview;

  // data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Mapping[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  // toggles (già esistenti)
  const [trimSpaces, setTrimSpaces] = useState(false);
  const [normalizeDates, setNormalizeDates] = useState(false);
  const [normalizeCurrency, setNormalizeCurrency] = useState(false);

  // NEW: skip righe vuote / quasi-vuote
  const [removeEmptyRows, setRemoveEmptyRows] = useState<boolean>(true);
  const [removeMostlyEmptyRows, setRemoveMostlyEmptyRows] = useState<boolean>(false);
  const [mostlyThreshold, setMostlyThreshold] = useState<number>(0.8);

  // NEW: conteggi skip per UI
  const [skipped, setSkipped] = useState<{ empty: number; mostly: number }>({ empty: 0, mostly: 0 });

  const buildRules = useCallback(
    (mappingRef: Mapping[]): TransformRule[] => {
      if (!headers.length) return [];
      const rules: TransformRule[] = [];

      if (trimSpaces) rules.push({ kind: "trim", columns: headers });

      if (!mappingRef.length) return rules;

      const dateCols = pickColumnsByType(mappingRef, "date");
      const numCols = pickColumnsByType(mappingRef, "number");

      if (normalizeDates && dateCols.length) {
        rules.push({ kind: "parseDate", columns: dateCols, dayFirst: true });
      }
      if (normalizeCurrency && numCols.length) {
        rules.push({ kind: "parseCurrency", columns: numCols });
      }
      return rules;
    },
    [headers, trimSpaces, normalizeDates, normalizeCurrency]
  );

  // NEW: funzione che applica gli skip
  const filterBySkipOptions = useCallback((base: any[][]) => {
    let empty = 0, mostly = 0;
    let out = base;

    if (removeEmptyRows) {
      out = out.filter((r) => {
        const skip = isRowBlank(r);
        if (skip) empty += 1;
        return !skip;
      });
    }

    if (removeMostlyEmptyRows) {
      out = out.filter((r) => {
        const skip = isRowMostlyBlank(r, mostlyThreshold);
        if (skip) mostly += 1;
        return !skip;
      });
    }

    setSkipped({ empty, mostly });
    return out;
  }, [removeEmptyRows, removeMostlyEmptyRows, mostlyThreshold]);

  const recompute = useCallback(
    (baseRows?: any[][], opts?: { keepMapping?: boolean }) => {
      if (!headers.length) return;
      const raw = baseRows ?? rawRows;

      // 0) applica skip (undo naturale = togliere i check)
      const afterSkip = filterBySkipOptions(raw);

      // 1) transforms con mapping corrente
      const rules = buildRules(mapping);
      const transformed = applyRules(afterSkip, headers, rules);
      setRows(transformed);

      // 2) mapping
      let cols = mapping;
      if (!opts?.keepMapping) {
        const used = new Set<string>();
        cols = headers.map((h, i) => ({
          map_from: h,
          name: normalizeHeader(h, i, used),
          type: inferType(transformed.map((r) => r[i])),
        }));
        setMapping(cols);
      }

      // 3) validate
      const types = cols.map((c) => c.type);
      setIssues(validate(transformed, headers, types));
    },
    [headers, rawRows, mapping, buildRules, filterBySkipOptions]
  );

  const loadPreview = useCallback(
    async (
      spreadsheetId: string,
      sheetName: string,
      headerRow: number,
      maxRows: number
    ) => {
      setLoading(true);
      try {
        const { headers: H, rows: R } = await fetchPreviewRef.current(
          spreadsheetId,
          sheetName,
          headerRow,
          maxRows
        );
        setHeaders(H);
        setRawRows(R);

        // 0) skip iniziali
        const base = filterBySkipOptions(R);

        // 1) prima passata: trim opzionale
        const initialRules: TransformRule[] = trimSpaces ? [{ kind: "trim", columns: H }] : [];
        const transformed = applyRules(base, H, initialRules);
        setRows(transformed);

        // 2) mapping inferito
        const used = new Set<string>();
        const cols: Mapping[] = H.map((h, i) => ({
          map_from: h,
          name: normalizeHeader(h, i, used),
          type: inferType(transformed.map((r) => r[i])),
        }));
        setMapping(cols);

        // 3) validate
        const types = cols.map((c) => c.type);
        setIssues(validate(transformed, H, types));
      } finally {
        setLoading(false);
      }
    },
    [trimSpaces, filterBySkipOptions]
  );

  const stats = useMemo(
    () => qualityFromIssues(rows.length, headers.length, issues),
    [rows.length, headers.length, issues]
  );

  return {
    // data
    headers,
    rows,
    rawRows,
    mapping,
    setMapping,
    issues,
    stats,

    // actions
    loadPreview,
    recompute, // accepts opts.keepMapping

    // ui state
    loading,

    // toggles (esistenti)
    trimSpaces,
    setTrimSpaces,
    normalizeDates,
    setNormalizeDates,
    normalizeCurrency,
    setNormalizeCurrency,

    // NEW toggles skip
    removeEmptyRows,
    setRemoveEmptyRows,
    removeMostlyEmptyRows,
    setRemoveMostlyEmptyRows,
    mostlyThreshold,
    setMostlyThreshold,

    // NEW conteggi per UI
    skipped,
  };
}
