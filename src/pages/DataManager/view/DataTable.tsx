import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import ColumnManagerModal from "./ColumnManagerModal";
import {
  EmptyOrLoading,
  TableFrame,
  TablePagination,
  formatCell,
  readColumnsFromUrl,
  storageKeyForColumns,
  writeColumnsToUrl,
} from "./TableHelpers";
import { DataTableHeader, DataTableRow, type Mode, type Row } from "./DataTableParts";

const DEFAULT_VISIBLE = 8;

export default function DataTable({
  datasetId,
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
  datasetId: string;
  loading: boolean;
  mode: Mode;
  rows: Row[];
  allColumns: string[];
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  onLoadChildren?: (groupKey: string) => Promise<Row[]>;
}) {
  // expansion & child cache
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [childrenCache, setChildrenCache] = useState<Record<string, Row[]>>({});

  useEffect(() => {
    setExpanded({});
    setChildrenCache({});
  }, [mode, page]);

  // column visibility state + modal
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [managerOpen, setManagerOpen] = useState(false);

  // hydrate from URL > localStorage > default(first N)
  useEffect(() => {
    const urlCols = readColumnsFromUrl();
    const lsCols = (() => {
      try {
        const text = localStorage.getItem(storageKeyForColumns(datasetId));
        return text ? (JSON.parse(text) as string[]) : null;
      } catch {
        return null;
      }
    })();

    const initial: string[] =
      (urlCols && urlCols.filter((c) => allColumns.includes(c))) ||
      (lsCols && lsCols.filter((c) => allColumns.includes(c))) ||
      allColumns.slice(0, DEFAULT_VISIBLE);

    const map: Record<string, boolean> = {};
    allColumns.forEach((c) => (map[c] = initial.includes(c)));
    if (!Object.values(map).some(Boolean) && allColumns[0]) map[allColumns[0]] = true;
    setVisible(map);
  }, [datasetId, allColumns]);

  // keep visible map in sync if the source columns change
  useEffect(() => {
    setVisible((prev) => {
      const next: Record<string, boolean> = {};
      allColumns.forEach((c) => (next[c] = prev[c] ?? false));
      if (!Object.values(next).some(Boolean) && allColumns[0]) next[allColumns[0]] = true;
      return next;
    });
  }, [allColumns]);

  const visibleColumns = useMemo(
    () => allColumns.filter((c) => visible[c]),
    [allColumns, visible]
  );

  // persist chosen columns
  const persistVisible = (cols: string[]) => {
    writeColumnsToUrl(cols);
    try {
      localStorage.setItem(storageKeyForColumns(datasetId), JSON.stringify(cols));
    } catch {
      /* no-op */
    }
  };

  // early frame for loading/empty
  if (loading || !rows?.length) {
    return (
      <TableFrame>
        <div className="mb-2 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
            Manage columns
          </Button>
        </div>

        <EmptyOrLoading
          loading={loading}
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
        />

        <ColumnManagerModal
          open={managerOpen}
          onOpenChange={setManagerOpen}
          all={allColumns}
          initialVisible={visibleColumns}
          onApply={(next) => {
            const map: Record<string, boolean> = {};
            allColumns.forEach((c) => (map[c] = next.includes(c)));
            if (!next.length && allColumns[0]) map[allColumns[0]] = true;
            setVisible(map);
            persistVisible(next.length ? next : [allColumns[0]].filter(Boolean));
          }}
        />
      </TableFrame>
    );
  }

  // expand children (loads once per group_key)
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
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
          Manage columns
        </Button>
      </div>

      {/* Scrollable rows area */}
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

      {/* Column manager modal */}
      <ColumnManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        all={allColumns}
        initialVisible={visibleColumns}
        onApply={(next) => {
          const map: Record<string, boolean> = {};
          allColumns.forEach((c) => (map[c] = next.includes(c)));
          if (!next.length && allColumns[0]) map[allColumns[0]] = true;
          setVisible(map);
          persistVisible(next.length ? next : [allColumns[0]].filter(Boolean));
        }}
      />
    </TableFrame>
  );
}
