// src/pages/DataManager/import/PreviewPanel.tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useImport } from "../context/ImportContext";
import { useValidation } from "../hooks/useValidation";
import type { Issue } from "@/lib/google/validate";

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

export default function PreviewPanel() {
  const {
    state,
    toggleRowSelected,
    selectAllRows,
    clearSelection,
    removeSelectedRows,
  } = useImport();

  const { headers, rows, selectedRowIdx } = state;
  const { issues, stats } = useValidation();

  const selectedCount = selectedRowIdx.size;

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

          {/* Row actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAllRows} disabled={!rows.length}>
              Select all
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={!selectedCount}>
              Clear selection
            </Button>
            <Button size="sm" onClick={removeSelectedRows} disabled={!selectedCount}>
              Remove selected{selectedCount ? ` (${selectedCount})` : ""}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 flex flex-col gap-3 pt-0">
        <QualityBar {...stats} />

        {/* Selectable table */}
        <div className="flex-1 min-h-0 overflow-auto rounded-md border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-background">
              <tr>
                <th className="px-2 py-1 border-b w-8"></th>
                {headers.map((h, i) => (
                  <th key={i} className="px-2 py-1 border-b text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => {
                const checked = selectedRowIdx.has(ri);
                return (
                  <tr key={ri} className={checked ? "bg-muted/40" : ""}>
                    <td className="px-2 py-1 border-b align-top">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRowSelected(ri)}
                        aria-label={`Select row ${ri + 1}`}
                      />
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
