import { useEffect, useMemo, useState } from "react";
import { ColumnsDropdown, EmptyOrLoading, TableFrame, TablePagination, useAllColumns, formatCell } from "./TableHelpers";
import { DataTableHeader, DataTableRow } from "./DataTableParts";

export type Mode = "grouped" | "flat";
export type Row = { id: string; role: string; group_key?: string; data: Record<string, any> };

const DEFAULT_VISIBLE = 8;

export default function DataTable({
  loading,
  mode,
  rows,
  allColumns,
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onLoadChildren,
}: {
  loading: boolean;
  mode: Mode;
  rows: Row[];
  allColumns: string[];                  // ✅ full list of columns from hook
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onLoadChildren?: (groupKey: string) => Promise<Row[]>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [childrenCache, setChildrenCache] = useState<Record<string, Row[]>>({});

  useEffect(() => {
    setExpanded({});
    setChildrenCache({});
  }, [mode, page]);

  // ---------- Column visibility ----------
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setVisible((prev) => {
      const next: Record<string, boolean> = { ...prev };
      // add new keys (default visible only for the first DEFAULT_VISIBLE)
      allColumns.forEach((c, i) => {
        if (!(c in next)) next[c] = i < DEFAULT_VISIBLE;
      });
      // drop removed keys
      Object.keys(next).forEach((k) => {
        if (!allColumns.includes(k)) delete next[k];
      });
      // ensure at least one visible
      if (Object.values(next).every((v) => !v) && allColumns[0]) {
        next[allColumns[0]] = true;
      }
      return next;
    });
  }, [allColumns]);

  const visibleColumns = useMemo(
    () => allColumns.filter((c) => visible[c]),
    [allColumns, visible]
  );

  // ---------- Empty / Loading ----------
  if (loading || !rows?.length) {
    return (
      <TableFrame>
        <div className="mb-2 flex items-center justify-end">
          <ColumnsDropdown
            columns={allColumns}
            visible={visible}
            onToggle={() => {}}
            disabled
          />
        </div>

        <EmptyOrLoading
          loading={loading}
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />
      </TableFrame>
    );
  }

  // ---------- Expand children ----------
  const toggleExpand = async (row: Row) => {
    const key = row.group_key ?? String(row.id);
    const next = !expanded[key];
    setExpanded((s) => ({ ...s, [key]: next }));
    if (next && mode === "grouped" && onLoadChildren && key && !childrenCache[key]) {
      const kids = await onLoadChildren(key);
      setChildrenCache((s) => ({ ...s, [key]: Array.isArray(kids) ? kids.slice(0, 50) : [] }));
    }
  };

  return (
    <TableFrame>
      {/* Toolbar: column visibility */}
      <div className="mb-2 flex items-center justify-end">
        <ColumnsDropdown
          columns={allColumns}
          visible={visible}
          onToggle={(col) => {
            setVisible((s) => {
              const count = Object.values(s).filter(Boolean).length;
              const nextVal = !s[col];
              if (!nextVal && count <= 1) return s; // don't hide last column
              return { ...s, [col]: nextVal };
            });
          }}
        />
      </div>

      {/* Scrollable area */}
      <div className="flex-1 overflow-auto rounded-xl border">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <DataTableHeader mode={mode} columns={visibleColumns} />
          <tbody>
            {rows.map((r) => {
              const key = r.group_key ?? String(r.id);
              const isOpen = !!expanded[key];
              return (
                <DataTableRow
                  key={r.id}
                  mode={mode}
                  row={r}
                  columns={visibleColumns}
                  isOpen={isOpen}
                  onToggle={() => toggleExpand(r)}
                  childrenRows={childrenCache[key] || []}
                  formatCell={formatCell}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </TableFrame>
  );
}
