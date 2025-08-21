// src/pages/DataManager/import/useValidation.ts
import { useMemo } from "react";
import { validate, qualityFromIssues, type Issue } from "@/lib/google/validate";
import { useImport } from "../context/ImportContext";

export function useValidation() {
  const { state } = useImport();
  const { rows, headers, mapping } = state;

  const types = useMemo(() => mapping.map((c) => c.type), [mapping]);

  const issues = useMemo<Issue[]>(() => {
    if (!headers.length || !rows.length) return [];
    return validate(rows, headers, types);
  }, [rows, headers, types]);

  const stats = useMemo(
    () => qualityFromIssues(rows.length, headers.length, issues),
    [rows.length, headers.length, issues]
  );

  const errorRowIndices = useMemo(() => {
    const set = new Set<number>();
    for (const it of issues) if (it.level === "error") set.add(it.row);
    return Array.from(set).sort((a, b) => a - b);
  }, [issues]);

  const warningRowIndices = useMemo(() => {
    const set = new Set<number>();
    for (const it of issues) if (it.level === "warning") set.add(it.row);
    return Array.from(set).sort((a, b) => a - b);
  }, [issues]);

  return {
    issues,
    stats,
    rowsLen: rows.length,
    colsLen: headers.length,
    errorRowIndices,
    warningRowIndices,
  };
}
