import type { Row } from "./types";

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