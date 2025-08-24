import {
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type Table,
} from "@tanstack/react-table";

export function useTanstackTable<T>(opts: {
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  rowSelection?: Record<string, boolean>;
  onRowSelectionChange?: (updater: any) => void;
}): Table<T> {
  const table = useReactTable<T>({
    data: opts.data,
    columns: opts.columns,
    getRowId: (row) => opts.getRowId(row),
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    enableRowSelection: true,
    state: {
      rowSelection: opts.rowSelection,
    },
    onRowSelectionChange: opts.onRowSelectionChange,
  });
  return table;
}
