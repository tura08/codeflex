// src/pages/DataManager/view/table/TableShell.tsx
import * as React from "react";
import {
  flexRender,
  type Table as TanTable,
  type Row as TanRow,
} from "@tanstack/react-table";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Note: We intentionally do NOT use shadcn's <Table> wrapper,
 * because it injects a div with overflow-x-auto that interferes
 * with sticky positioning. We render a raw <table> with the same
 * classes so the design stays consistent and the header sticks.
 */
export function TableShell<T>({
  table,
  renderAfterRow,
}: {
  table: TanTable<T>;
  /** Must return a <tr> (or null). Useful for children/preview rows. */
  renderAfterRow?: (row: TanRow<T>, leafColumnCount: number) => React.ReactNode;
}) {
  const leafColCount = table.getAllLeafColumns().length;

  return (
    <div className="h-full overflow-auto rounded-xl border">
      <table className="w-full caption-bottom text-sm">
        <TableHeader className="sticky top-0 z-10 bg-muted [&_tr]:border-b">
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>

        <TableBody>
          {table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((r) => (
              <React.Fragment key={r.id}>
                <TableRow data-state={r.getIsSelected() && "selected"}>
                  {r.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
                {renderAfterRow ? renderAfterRow(r, leafColCount) : null}
              </React.Fragment>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={leafColCount}
                className="h-24 text-center text-sm text-muted-foreground"
              >
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </table>
    </div>
  );
}
