import type { ColumnDef } from "@tanstack/react-table";

export type ColumnDefLike<T> = ColumnDef<T, any>;

export type Row = {
  id: string;
  role: string;
  group_key?: string;
  data: Record<string, any>;
};

export type TableKitProps<T> = {
  data: T[];
  idForRow: (row: T) => string;

  allDataColumns: string[];
  visibleColumns: string[];
  buildDataColumns: (visible: string[]) => ColumnDefLike<T>[];

  staticLeftColumns?: ColumnDefLike<T>[];
  staticRightColumns?: ColumnDefLike<T>[];

  page: number;
  pageSize: number;
  pageCount: number;
  q?: string;
  onSearch: (q: string) => void;

  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onVisibleColumnsChange: (cols: string[]) => void;
};
