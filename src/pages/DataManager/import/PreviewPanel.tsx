// src/pages/DataManager/import/PreviewPanel.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImport } from "../context/ImportContext";
import { useValidation } from "../hooks/useValidation";
import type { Issue } from "@/lib/google/validate";
import { useMemo } from "react";

/* Small helper to support indeterminate state */
function IndeterminateCheckbox({
  checked,
  indeterminate,
  onChange,
  title,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: () => void;
  title?: string;
}) {
  return (
    <input
      type="checkbox"
      checked={checked}
      ref={(el) => {
        if (!el) return;
        el.indeterminate = indeterminate;
      }}
      onChange={onChange}
      title={title}
      aria-label={title || "Toggle all"}
    />
  );
}

function QualityBar(props: { rows: number; columns: number; cells: number; errors: number; warnings: number }) {
  const q = props;
  return (
    <div className="text-xs text-muted-foreground">
      <div className="flex flex-wrap items-center gap-4">
        <span>
          <b>{q.rows}</b> rows
        </span>
        <span>
          <b>{q.columns}</b> columns
        </span>
        <span>
          <b>{q.cells}</b> cells
        </span>
        <span className="text-destructive">
          <b>{q.errors}</b> errors
        </span>
        <span className="text-amber-600">
          <b>{q.warnings}</b> warnings
        </span>
      </div>
    </div>
  );
}

function IssuesList({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return <div className="rounded-md border p-3 text-xs text-muted-foreground">No issues detected.</div>;
  }
  const color = (lvl: Issue["level"]) =>
    lvl === "error" ? "text-destructive" : lvl === "warning" ? "text-amber-600" : "text-muted-foreground";

  return (
    <div className="rounded-md border p-3 max-h-60 overflow-auto">
      <ul className="space-y-1 text-xs">
        {issues.slice(0, 200).map((it, i) => (
          <li key={i}>
            <span className={color(it.level)}>[{it.level.toUpperCase()}]</span>{" "}
            Row {it.row + 1}, <b>{it.column}</b>: {it.message} ({it.code})
          </li>
        ))}
        {issues.length > 200 && (
          <li className="text-muted-foreground">…and {issues.length - 200} more</li>
        )}
      </ul>
    </div>
  );
}

export default function PreviewPanel() {
  const {
    state,
    toggleRowSelected,
    selectRows,
    removeSelectedRows,
  } = useImport();

  const { headers, rows, selectedRowIdx } = state;
  const { issues, stats, errorRowIndices, warningRowIndices } = useValidation();

  // selection aggregates
  const allSelected = selectedRowIdx.size > 0 && selectedRowIdx.size === rows.length;
  const someSelected = selectedRowIdx.size > 0 && selectedRowIdx.size < rows.length;

  // quick lookups for row highlighting
  const errorRowSet = useMemo(() => new Set(errorRowIndices), [errorRowIndices]);
  const warnRowSet = useMemo(() => new Set(warningRowIndices), [warningRowIndices]);

  const selectedCount = selectedRowIdx.size;

  const toggleSelectAll = () => {
    if (allSelected) {
      // deselect all by selecting none
      selectRows([]);
    } else {
      // select all indices [0..rows.length-1]
      selectRows(Array.from({ length: rows.length }, (_, i) => i));
    }
  };

  return (
    <Card className="h-[68vh] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Preview</CardTitle>
            <CardDescription className="text-xs">
              First {rows.length} rows — {headers.length} columns
            </CardDescription>
          </div>

          {/* Row actions (keep essential buttons only) */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => selectRows(errorRowIndices)}
              disabled={!errorRowIndices.length}
              className="text-destructive"
              title="Select all rows that contain at least one error"
            >
              Select error rows{errorRowIndices.length ? ` (${errorRowIndices.length})` : ""}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => selectRows(warningRowIndices)}
              disabled={!warningRowIndices.length}
              className="text-amber-600"
              title="Select all rows that contain at least one warning"
            >
              Select warning rows{warningRowIndices.length ? ` (${warningRowIndices.length})` : ""}
            </Button>

            <Button size="sm" onClick={removeSelectedRows} disabled={!selectedCount}>
              Remove selected{selectedCount ? ` (${selectedCount})` : ""}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pt-0">
        <QualityBar
          rows={stats.rows}
          columns={stats.columns}
          cells={stats.cells}
          errors={stats.errors}
          warnings={stats.warnings}
        />

        {/* Selectable table with sticky header + first two sticky columns, no double borders */}
        <div className="flex-1 min-h-0 overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-30 bg-background shadow-sm">
              <tr>
                {/* Sticky select-all header cell */}
                <th
                  className="
                    w-8 px-2 py-1 border-b
                    sticky left-0 z-40 bg-background
                    border-r-0
                    shadow-[inset_-1px_0_0_theme(colors.border)]
                  "
                >
                  <IndeterminateCheckbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={toggleSelectAll}
                    title="Select/Deselect all rows"
                  />
                </th>

                {/* Sticky status marker column header */}
                <th
                  className="
                    w-8 px-2 py- border-b
                    sticky left-8 z-40 bg-background
                  "
                />

                {headers.map((h, i) => (
                  <th key={i} className="px-2 py-2 border-b text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows.map((r, ri) => {
                const checked = selectedRowIdx.has(ri);
                const hasError = errorRowSet.has(ri);
                const hasWarn = warnRowSet.has(ri);

                return (
                  <tr
                    key={ri}
                    className={[
                      checked ? "bg-muted/40" : "",
                      hasError
                        ? "outline outline-destructive/40"
                        : hasWarn
                        ? "outline outline-amber-400/40"
                        : "",
                    ].join(" ")}
                  >
                    {/* Sticky row checkbox cell */}
                    <td
                      className="
                        w-8 px-2 py-1 border-b align-top
                        sticky left-0 z-20 bg-background
                        border-r-0
                        shadow-[inset_-1px_0_0_theme(colors.border)]
                      "
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRowSelected(ri)}
                        aria-label={`Select row ${ri + 1}`}
                      />
                    </td>

                    {/* Sticky row status marker */}
                    <td
                      className="
                        w-8 px-2 py-1 border-b align-top
                        sticky left-8 z-20 bg-background
                      "
                    >
                      {hasError ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Has errors" />
                      ) : hasWarn ? (
                        <span className="inline-block w-2 h-2 rounded-full bg-amber-500" title="Has warnings" />
                      ) : null}
                    </td>

                    {r.map((cell, ci) => (
                      <td key={ci} className="px-2 py-1 border-b align-top whitespace-nowrap">
                        {String(cell ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <IssuesList issues={issues} />
      </CardContent>
    </Card>
  );
}
