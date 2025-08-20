// src/pages/DataManager/import/useValidation.ts
import { useMemo } from "react";
import { validate, qualityFromIssues } from "@/lib/google/validate";
import { useImport } from "../context/ImportContext";

export function useValidation() {
  const { state } = useImport();
  const { rows, headers, mapping } = state;

  // derive column types from mapping
  const types = useMemo(() => mapping.map((c) => c.type), [mapping]);

  const issues = useMemo(() => {
    if (!headers.length || !rows.length) return [];
    // IMPORTANT: validate must honor the passed `types`
    return validate(rows, headers, types);
  }, [rows, headers, types]);

  const stats = useMemo(
    () => qualityFromIssues(rows.length, headers.length, issues),
    [rows.length, headers.length, issues]
  );

  return { issues, stats, rowsLen: rows.length, colsLen: headers.length };
}
