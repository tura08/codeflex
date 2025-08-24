import { type ReactNode, useState, useMemo } from "react";
import type { TableKitProps } from "./types";

import { useTanstackTable } from "./adapters/tanstackAdapter";
import { ensureAtLeastOne } from "./utils";
import { TableShell } from "./TableShell";
import { TableProvider } from "./TableContext";
import ColumnManagerModal from "./ColumnManagerModal";
import { Pagination } from "./Pagination";
import { Toolbar } from "./Toolbar";

export default function TableKit<T>(
  props: TableKitProps<T> & {
    renderAfterRow?: (row: any, leafColCount: number) => ReactNode;
    toolbarLeftSlot?: ReactNode;
    toolbarRightSlot?: ReactNode;
    q?: string | null;
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
    toolbarLeftSlot,
    toolbarRightSlot,
  } = props;

  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [modalOpen, setModalOpen] = useState(false);

  const safeVisible = ensureAtLeastOne(visibleColumns, allDataColumns);

  const columns = useMemo(
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
      <Toolbar
        q={q}
        onSearch={onSearch}
        leftSlot={toolbarLeftSlot}
        rightSlot={toolbarRightSlot}
      />
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
