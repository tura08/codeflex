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

  // toggles
  const [trimSpaces, setTrimSpaces] = useState(false);
  const [normalizeDates, setNormalizeDates] = useState(false);
  const [normalizeCurrency, setNormalizeCurrency] = useState(false);

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

  const recompute = useCallback(
    (baseRows?: any[][], opts?: { keepMapping?: boolean }) => {
      if (!headers.length) return;
      const raw = baseRows ?? rawRows;

      // 1) transforms with the *current* mapping (or future override)
      const rules = buildRules(mapping);
      const transformed = applyRules(raw, headers, rules);
      setRows(transformed);

      // 2) mapping: either keep current, or re-infer if requested
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

      // 3) validate with whichever mapping we keep/use
      const types = cols.map((c) => c.type);
      setIssues(validate(transformed, headers, types));
    },
    [headers, rawRows, mapping, buildRules]
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

        // First pass: trim only
        const initialRules: TransformRule[] = trimSpaces
          ? [{ kind: "trim", columns: H }]
          : [];
        const transformed = applyRules(R, H, initialRules);
        setRows(transformed);

        // Initial mapping (inferred)
        const used = new Set<string>();
        const cols: Mapping[] = H.map((h, i) => ({
          map_from: h,
          name: normalizeHeader(h, i, used),
          type: inferType(transformed.map((r) => r[i])),
        }));
        setMapping(cols);

        const types = cols.map((c) => c.type);
        setIssues(validate(transformed, H, types));
      } finally {
        setLoading(false);
      }
    },
    [trimSpaces]
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

    // toggles
    trimSpaces,
    setTrimSpaces,
    normalizeDates,
    setNormalizeDates,
    normalizeCurrency,
    setNormalizeCurrency,
  };
}
