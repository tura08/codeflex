import {
  getCoreRowModel,
  getSortedRowModel, // enable client-side sorting
  useReactTable,
  type ColumnDef,
  type Table,
} from "@tanstack/react-table";
import type { RowSelectionState, OnChangeFn } from "@tanstack/react-table";

export function useTanstackTable<T>(opts: {
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;

  rowSelection?: RowSelectionState;
  onRowSelectionChange?: OnChangeFn<RowSelectionState>;
}): Table<T> {
  const table = useReactTable<T>({
    data: opts.data,
    columns: opts.columns,
    getRowId: (row) => opts.getRowId(row),

    // models
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),

    // server-side paging + search remain as-is
    manualPagination: true,
    manualFiltering: true,

    // features
    enableRowSelection: true,
    enableSorting: true,

    state: {
      rowSelection: opts.rowSelection,
    },
    onRowSelectionChange: opts.onRowSelectionChange,
  });

  return table;
}
