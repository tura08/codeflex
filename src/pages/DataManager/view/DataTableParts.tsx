import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

/** Exported types so other files can import them */
export type Mode = "grouped" | "flat";
export type Row = { id: string; role: string; group_key?: string; data: Record<string, any> };

export function DataTableHeader({ mode, columns }: { mode: Mode; columns: string[] }) {
  return (
    <thead className="sticky top-0 z-10 bg-muted">
      <tr>
        {mode === "grouped" && <th className="w-[44px] bg-muted p-2 text-left align-middle"> </th>}
        <th className="w-[90px] bg-muted p-2 text-left align-middle">ID</th>
        {mode === "grouped" && (
          <th className="w-[160px] bg-muted p-2 text-left align-middle">group_key</th>
        )}
        {columns.map((k) => (
          <th key={k} className="bg-muted p-2 text-left align-middle">
            {k}
          </th>
        ))}
        <th className="w-[90px] bg-muted p-2 text-left align-middle">JSON</th>
      </tr>
    </thead>
  );
}

export function DataTableRow({
  mode,
  row,
  columns,
  isOpen,
  onToggle,
  childrenRows,
  formatCell,
}: {
  mode: Mode;
  row: Row;
  columns: string[];
  isOpen: boolean;
  onToggle: () => void;
  childrenRows: Row[];
  formatCell: (v: any) => string;
}) {
  const [showJson, setShowJson] = useState(false);

  // child columns computed locally (only used here)
  const childColumns = useMemo(
    () => Object.keys(childrenRows?.[0]?.data ?? {}),
    [childrenRows]
  );

  const colSpan =
    (mode === "grouped" ? 1 : 0) + // expand
    1 + // ID
    (mode === "grouped" ? 1 : 0) + // group_key
    columns.length + // data
    1; // JSON

  return (
    <>
      <tr className="border-t align-top">
        {mode === "grouped" && (
          <td className="p-2">
            <Button variant="outline" size="sm" onClick={onToggle}>
              {isOpen ? "▾" : "▸"}
            </Button>
          </td>
        )}
        <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis">
          {String(row.id).slice(0, 8)}
        </td>
        {mode === "grouped" && (
          <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-muted-foreground">
            {row.group_key ?? "-"}
          </td>
        )}
        {columns.map((k) => (
          <td
            key={k}
            className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
            title={row.data?.[k] != null ? String(formatCell(row.data?.[k])) : "—"}
          >
            {formatCell(row.data?.[k])}
          </td>
        ))}
        <td className="p-2">
          <Button variant="outline" size="sm" onClick={() => setShowJson(true)}>
            View
          </Button>
          {showJson && <JsonDialog onClose={() => setShowJson(false)} data={row.data} />}
        </td>
      </tr>

      {mode === "grouped" && isOpen && (
        <DataTableChildren
          colSpan={colSpan}
          columns={childColumns}
          rows={childrenRows}
          formatCell={formatCell}
        />
      )}
    </>
  );
}

export function DataTableChildren({
  colSpan,
  columns,
  rows,
  formatCell,
}: {
  colSpan: number;
  columns: string[];
  rows: Row[];
  formatCell: (v: any) => string;
}) {
  return (
    <tr className="border-t bg-muted/20">
      <td colSpan={colSpan} className="p-0">
        <div className="p-3">
          {!rows.length ? (
            <div className="text-xs text-muted-foreground">No items.</div>
          ) : (
            <div className="overflow-auto rounded-lg border">
              <table className="w-full table-fixed text-xs">
                <thead className="sticky top-0 bg-muted/40">
                  <tr>
                    <th className="w-[90px] p-2 text-left align-middle">ID</th>
                    <th className="w-[160px] p-2 text-left align-middle">group_key</th>
                    {columns.slice(0, 8).map((k) => (
                      <th key={k} className="p-2 text-left align-middle">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.id} className="border-t">
                      <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis">
                        {String(c.id).slice(0, 8)}
                      </td>
                      <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-muted-foreground">
                        {c.group_key}
                      </td>
                      {columns.slice(0, 8).map((k) => (
                        <td
                          key={k}
                          className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                          title={c.data?.[k] != null ? String(formatCell(c.data?.[k])) : "—"}
                        >
                          {formatCell(c.data?.[k])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

function JsonDialog({ data, onClose }: { data: Record<string, any>; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[70vh] w-[680px] overflow-auto rounded-xl bg-background p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <div className="font-medium">Row JSON</div>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <pre className="whitespace-pre-wrap text-xs">
          {JSON.stringify(data ?? {}, null, 2)}
        </pre>
      </div>
    </div>
  );
}
