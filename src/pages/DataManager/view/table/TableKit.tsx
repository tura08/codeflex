// src/pages/DataManager/view/table/TableKit.tsx
import * as React from "react";
import type { TableKitProps } from "./types";
import { useTanstackTable } from "./adapters/tanstackAdapter";
import { ensureAtLeastOne } from "./utils";
import { TableShell } from "./TableShell";
import { TableProvider } from "./TableContext";
import ColumnManagerModal from "./ColumnManagerModal";
import { TableHeader } from "./TableHeader";
import { Pagination } from "./Pagination";

export default function TableKit<T>(
  props: TableKitProps<T> & {
    renderAfterRow?: (row: any, leafColCount: number) => React.ReactNode;
  }
) {
  const {
    data,
    idForRow,
    allDataColumns,
    visibleColumns,
    buildDataColumns,
    staticLeftColumns = [],
    staticRightColumns = [],
    page,
    pageSize,
    pageCount,
    q,
    onSearch,
    onPageChange,
    onPageSizeChange,
    onVisibleColumnsChange,
    renderAfterRow,
  } = props;

  const [rowSelection, setRowSelection] =
    React.useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = React.useState(false);

  const safeVisible = ensureAtLeastOne(visibleColumns, allDataColumns);

  const columns = React.useMemo(
    () => [
      ...staticLeftColumns,
      ...buildDataColumns(safeVisible),
      ...staticRightColumns,
    ],
    [staticLeftColumns, buildDataColumns, safeVisible, staticRightColumns]
  );

  const table = useTanstackTable<T>({
    data,
    columns,
    getRowId: idForRow,
    rowSelection,
    onRowSelectionChange: setRowSelection,
  });

  return (
    <TableProvider value={{ openColumnManager: () => setModalOpen(true) }}>
      <TableHeader />

      <TableShell table={table} renderAfterRow={renderAfterRow} />

      <Pagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      <ColumnManagerModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        all={allDataColumns}
        initialVisible={safeVisible}
        onApply={(next) => onVisibleColumnsChange(next)}
      />
    </TableProvider>
  );
}
