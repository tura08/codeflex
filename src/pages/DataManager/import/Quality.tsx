// src/pages/DataManager/import/Quality.tsx
import type { Issue } from "@/lib/google/sheets-import";

export function QualityBar(props: { rows: number; columns: number; cells: number; errors: number; warnings: number }) {
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

export function IssuesPanel({ issues }: { issues: Issue[] }) {
  if (!issues.length) {
    return <div className="rounded-md border p-3 text-xs text-muted-foreground">No issues detected.</div>;
  }
  return (
    <div className="rounded-md border p-3 max-h-60 overflow-auto">
      <ul className="space-y-1 text-xs">
        {issues.slice(0, 200).map((it, i) => (
          <li key={i}>
            <span className={it.level === "error" ? "text-destructive" : "text-amber-600"}>
              [{it.level.toUpperCase()}]
            </span>{" "}
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
