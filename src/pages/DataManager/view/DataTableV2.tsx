import * as React from "react";
import TableKit from "./table/TableKit";
import type { ColumnDefLike } from "./table/types";
import { formatCell } from "./table/utils";

import type { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";
import type { Row } from "./table/types";

import {
  selectionColumn,
  expanderColumn,
  idColumn,
  jsonColumn,
  actionsColumn,
} from "./table/ColumnsActions";
import { useColumnsDnD } from "./table/ColumnsDnD";
import { DataTableChildren } from "./table/TableChildren";

type ViewController = ReturnType<typeof useViewReducer>;

export default function DataTableV2({ view }: { view: ViewController }) {
  const { state, updateParams, setVisibleColumns, toggleRowExpanded, loadChildren } = view;
  const {
    mode,
    rows,
    page,
    pageSize,
    pageCount,
    q,
    visibleColumns,
    loading,
    expandedKeys,
    childrenCache,
  } = state;

  const allColumns = React.useMemo(
    () => (rows.length ? Object.keys(rows[0]?.data ?? {}) : []),
    [rows]
  );

  // Data columns with DnD headers
  const dataCols = useColumnsDnD<Row>(visibleColumns, (next) => setVisibleColumns(next));

  // Expansion helpers
  const isOpen = React.useCallback(
    (key: string) => expandedKeys.has(key),
    [expandedKeys]
  );

  const onToggle = React.useCallback(
    async (key: string) => {
      const currentlyOpen = expandedKeys.has(key);
      toggleRowExpanded(key);
      if (!currentlyOpen && mode === "grouped" && !childrenCache[key]) {
        await loadChildren(key);
      }
    },
    [expandedKeys, toggleRowExpanded, mode, childrenCache, loadChildren]
  );

  const leftCols = React.useMemo(() => {
    const base: ColumnDefLike<Row>[] = [selectionColumn<Row>()];
    if (mode === "grouped") base.push(expanderColumn({ isOpen, onToggle }));
    base.push(idColumn());
    return base;
  }, [mode, isOpen, onToggle]);

  const renderAfterRow = React.useCallback(
    (tanRow: any, leafColCount: number) => {
      if (mode !== "grouped") return null;
      const r: Row = tanRow.original;
      const key = r.group_key ?? String(r.id);
      if (!expandedKeys.has(key)) return null;
      const kids = childrenCache[key] || [];
      const childColumns = Object.keys(kids?.[0]?.data ?? {}).slice(0, 8);
      return (
        <DataTableChildren
          colSpan={leafColCount}
          columns={childColumns}
          rows={kids}
          formatCell={formatCell}
        />
      );
    },
    [mode, expandedKeys, childrenCache]
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto rounded-xl border bg-background">
          <div className="p-3 space-y-2">
            <div className="h-6 w-full animate-pulse rounded bg-muted/50" />
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-5 w-full animate-pulse rounded bg-muted/30" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <TableKit<Row>
      data={rows}
      idForRow={(r) => String(r.id)}
      allDataColumns={allColumns}
      visibleColumns={visibleColumns}
      buildDataColumns={() => dataCols}
      staticLeftColumns={leftCols}
      staticRightColumns={[jsonColumn(), actionsColumn()]}

      page={page}
      pageSize={pageSize}
      pageCount={pageCount}
      q={q}
      onSearch={(next) => updateParams({ q: next, page: 1 })}

      renderAfterRow={renderAfterRow}
      onPageChange={(p) => updateParams({ page: p })}
      onPageSizeChange={(s) => updateParams({ pageSize: s, page: 1 })}
      onVisibleColumnsChange={(cols) => setVisibleColumns(cols)}
    />
  );
}
