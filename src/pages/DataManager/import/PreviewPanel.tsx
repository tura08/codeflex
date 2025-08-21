// src/pages/DataManager/import/PreviewPanel.tsx
import { useMemo, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// import { Dialog, DialogContent } from "@/components/ui/dialog";
// import { Maximize2, X } from "lucide-react";
import { useImport } from "../context/ImportContext";
import { useValidation } from "../hooks/useValidation";
import type { Issue } from "@/lib/google/validate";

/* ────────────────── helpers ────────────────── */
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
        <span><b>{q.rows}</b> rows</span>
        <span><b>{q.columns}</b> columns</span>
        <span><b>{q.cells}</b> cells</span>
        <span className="text-destructive"><b>{q.errors}</b> errors</span>
        <span className="text-amber-600"><b>{q.warnings}</b> warnings</span>
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

/* ───────────── shared table view (used in card and modal) ───────────── */
type TableViewProps = {
  headers: string[];
  rows: any[][];
  selectedRowIdx: Set<number>;
  errorRowIndices: number[];
  warningRowIndices: number[];
  onToggleRow: (i: number) => void;
  onToggleAll: () => void;
  allSelected: boolean;
  someSelected: boolean;
};

function TableView({
  headers,
  rows,
  selectedRowIdx,
  errorRowIndices,
  warningRowIndices,
  onToggleRow,
  onToggleAll,
  allSelected,
  someSelected,
}: TableViewProps) {
  const errorRowSet = useMemo(() => new Set(errorRowIndices), [errorRowIndices]);
  const warnRowSet = useMemo(() => new Set(warningRowIndices), [warningRowIndices]);

  return (
    <div className="h-full overflow-auto rounded-md border">
      <table className="w-full text-xs border-collapse">
        {/* sticky header */}
        <thead className="sticky top-0 z-30 bg-background">
          <tr>
            {/* sticky select-all cell (no double borders) */}
            <th
              className="w-8 px-2 py-2 border-b sticky left-0 z-40 bg-background align-middle"
              style={{ boxShadow: "inset -1px 0 0 var(--border)" }}
            >
              <IndeterminateCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onChange={onToggleAll}
                title="Select/Deselect all rows"
              />
            </th>
            {/* sticky status marker header */}
            <th className="w-8 px-2 py-2 border-b sticky left-8 z-40 bg-background" />
            {headers.map((h, i) => (
              <th key={i} className="px-2 py-2 border-b text-left whitespace-nowrap">{h}</th>
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
                className={checked ? "bg-muted/40" : ""}
                style={{
                  outline: hasError ? "1px solid rgba(239,68,68,0.4)" : hasWarn ? "1px solid rgba(245,158,11,0.4)" : "none",
                }}
              >
                {/* sticky row checkbox */}
                <td
                  className="w-8 px-2 py-1 border-b sticky left-0 z-20 bg-background align-top"
                  style={{ boxShadow: "inset -1px 0 0 var(--border)" }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleRow(ri)}
                    aria-label={`Select row ${ri + 1}`}
                  />
                </td>

                {/* sticky status marker */}
                <td className="w-8 px-2 py-1 border-b sticky left-8 z-20 bg-background align-top">
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
  );
}

/* ───────────── main component ───────────── */
export default function PreviewPanel() {
  const {
    state,
    toggleRowSelected,
    selectRows,
    removeSelectedRows,
  } = useImport();

  const { headers, rows, selectedRowIdx } = state;
  const { issues, stats, errorRowIndices, warningRowIndices } = useValidation();

  // const [fullscreen, setFullscreen] = useState(false);

  const allSelected = selectedRowIdx.size > 0 && selectedRowIdx.size === rows.length;
  const someSelected = selectedRowIdx.size > 0 && selectedRowIdx.size < rows.length;
  const selectedCount = selectedRowIdx.size;

  const toggleSelectAll = useCallback(() => {
    if (allSelected) selectRows([]);
    else selectRows(Array.from({ length: rows.length }, (_, i) => i));
  }, [allSelected, rows.length, selectRows]);

  return (
    <>
      <Card className="h-[68vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Preview</CardTitle>
              <CardDescription className="text-xs">
                First {rows.length} rows — {headers.length} columns
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* <Button variant="ghost" size="sm" onClick={() => setFullscreen(true)} title="Open fullscreen">
                <Maximize2 className="w-4 h-4" />
              </Button> */}

              <Button
                variant="outline"
                size="sm"
                onClick={() => selectRows(errorRowIndices)}
                disabled={!errorRowIndices.length}
                className="text-destructive"
                title="Select all rows with errors"
              >
                Select error rows{errorRowIndices.length ? ` (${errorRowIndices.length})` : ""}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => selectRows(warningRowIndices)}
                disabled={!warningRowIndices.length}
                className="text-amber-600"
                title="Select all rows with warnings"
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

          <TableView
            headers={headers}
            rows={rows}
            selectedRowIdx={selectedRowIdx}
            errorRowIndices={errorRowIndices}
            warningRowIndices={warningRowIndices}
            onToggleRow={toggleRowSelected}
            onToggleAll={toggleSelectAll}
            allSelected={allSelected}
            someSelected={someSelected}
          />

          <IssuesList issues={issues} />
        </CardContent>
      </Card>

      {/* Fullscreen modal */}
      {/* <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          <div className="flex items-center justify-between p-2 border-b">
            <h2 className="text-sm font-medium">Fullscreen Table</h2>
            <Button variant="ghost" size="sm" onClick={() => setFullscreen(false)} title="Close">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="p-2 h-[85vh]">
            <TableView
              headers={headers}
              rows={rows}
              selectedRowIdx={selectedRowIdx}
              errorRowIndices={errorRowIndices}
              warningRowIndices={warningRowIndices}
              onToggleRow={toggleRowSelected}
              onToggleAll={toggleSelectAll}
              allSelected={allSelected}
              someSelected={someSelected}
            />
          </div>
        </DialogContent>
      </Dialog> */}
    </>
  );
}
