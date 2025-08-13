// src/integrations/google/hooks/usePreviewPipeline.ts
import { useCallback, useMemo, useRef, useState } from "react";
import { applyRules, validate, qualityFromIssues, type TransformRule, type Issue } from "@/lib/google/sheets-import";
import { inferType, normalizeHeader, type SimpleType } from "@/lib/google/infer";

type FetchPreviewFn = (
  spreadsheetId: string,
  sheetName: string,
  headerRow: number,
  maxRows: number
) => Promise<{ headers: string[]; rows: any[][] }>;

export type Mapping = { map_from: string; name: string; type: SimpleType };

export function usePreviewPipeline(fetchPreview: FetchPreviewFn) {
  // keep the latest fn without retriggering memos if identity changes
  const fetchPreviewRef = useRef(fetchPreview);
  fetchPreviewRef.current = fetchPreview;

  // data
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Mapping[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);

  // MVP toggles (apply to all columns)
  const [trimSpaces, setTrimSpaces] = useState(false);
  const [normalizeDates, setNormalizeDates] = useState(false);
  const [normalizeCurrency, setNormalizeCurrency] = useState(false);

  const buildRules = useCallback((): TransformRule[] => {
    if (!headers.length) return [];
    const all = headers.slice();
    const rules: TransformRule[] = [];
    if (trimSpaces) rules.push({ kind: "trim", columns: all });
    if (normalizeCurrency) rules.push({ kind: "parseCurrency", columns: all });
    if (normalizeDates) rules.push({ kind: "parseDate", columns: all, dayFirst: true });
    return rules;
  }, [headers, trimSpaces, normalizeCurrency, normalizeDates]);

  const recompute = useCallback((baseRows?: any[][]) => {
    if (!headers.length) return;
    const raw = baseRows ?? rawRows;

    // 1) transforms
    const transformed = applyRules(raw, headers, buildRules());
    setRows(transformed);

    // 2) mapping based on transformed
    const used = new Set<string>();
    const cols: Mapping[] = headers.map((h, i) => ({
      map_from: h,
      name: normalizeHeader(h, i, used),
      type: inferType(transformed.map(r => r[i])),
    }));
    setMapping(cols);

    // 3) validation
    const types = cols.map(c => c.type);
    setIssues(validate(transformed, headers, types));
  }, [headers, rawRows, buildRules]);

  const loadPreview = useCallback(async (spreadsheetId: string, sheetName: string, headerRow: number, maxRows: number) => {
    setLoading(true);
    try {
      const { headers, rows } = await fetchPreviewRef.current(spreadsheetId, sheetName, headerRow, maxRows);
      setHeaders(headers);
      setRawRows(rows);

      // derive immediately
      const transformed = applyRules(rows, headers, buildRules());
      setRows(transformed);

      const used = new Set<string>();
      const cols: Mapping[] = headers.map((h, i) => ({
        map_from: h,
        name: normalizeHeader(h, i, used),
        type: inferType(transformed.map(r => r[i])),
      }));
      setMapping(cols);

      const types = cols.map(c => c.type);
      setIssues(validate(transformed, headers, types));
    } finally {
      setLoading(false);
    }
  }, [buildRules]);

  const stats = useMemo(
    () => qualityFromIssues(rows.length, headers.length, issues),
    [rows.length, headers.length, issues]
  );

  return {
    // data
    headers, rows, rawRows,
    mapping, setMapping,
    issues, stats,

    // actions
    loadPreview, recompute,

    // ui state
    loading,

    // toggles
    trimSpaces, setTrimSpaces,
    normalizeDates, setNormalizeDates,
    normalizeCurrency, setNormalizeCurrency,
  };
}
