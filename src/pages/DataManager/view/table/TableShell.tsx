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
              {hg.headers.map((header) => {
                const canSort = header.column.getCanSort?.() ?? false;
                const sorted = header.column.getIsSorted?.() as
                  | false
                  | "asc"
                  | "desc";

                const ariaSort =
                  sorted === "asc"
                    ? "ascending"
                    : sorted === "desc"
                    ? "descending"
                    : "none";

                const toggle = canSort
                  ? header.column.getToggleSortingHandler?.()
                  : undefined;

                return (
                  <TableHead
                    key={header.id}
                    onClick={toggle}
                    aria-sort={ariaSort as React.AriaAttributes["aria-sort"]}
                    className={canSort ? "cursor-pointer select-none" : undefined}
                    title={
                      canSort
                        ? sorted === "asc"
                          ? "Sorted ascending — click to sort descending"
                          : sorted === "desc"
                          ? "Sorted descending — click to clear sort"
                          : "Click to sort ascending"
                        : undefined
                    }
                  >
                    {header.isPlaceholder ? null : (
                      <div className="flex items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {sorted && (
                          <span aria-hidden="true" className="inline-block leading-none">
                            {sorted === "asc" ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                    )}
                  </TableHead>
                );
              })}
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
