import { useState } from "react";
import { Button } from "@/components/ui/button";
import ColumnManagerModal from "./ColumnManagerModal";
import { DataTableHeader, DataTableRow, type Mode, type Row } from "./DataTableParts";
import type { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";

type ViewController = ReturnType<typeof useViewReducer>;

/* Local-only helper (kept in this file so HMR is happy) */
function formatCell(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/* Local UI bits (not exported) */
function EmptyOrLoading({
  page,
  pageCount,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-auto rounded-xl border bg-background">
        <div className="p-3 space-y-2">
          <div className="h-6 w-full animate-pulse rounded bg-muted/50" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-5 w-full animate-pulse rounded bg-muted/30" />
          ))}
        </div>
      </div>
      <TablePagination
        page={page}
        pageCount={pageCount}
        pageSize={pageSize}
        onPageChange={() => {}}
        onPageSizeChange={onPageSizeChange}
        disabled
      />
    </>
  );
}

function TablePagination({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  disabled,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (s: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs">
        <span>Rows per page:</span>
        <select
          className="rounded border p-1 text-xs"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          disabled={disabled}
        >
          {[10, 25, 50, 100].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
 * Main (lean) table — single prop: `view`
 * ────────────────────────────────────────────────────────────── */
export default function DataTable({ view }: { view: ViewController }) {
  const { state, updateParams, setVisibleColumns, toggleRowExpanded, loadChildren, setSort } = view;

  const {
    loading,
    mode,
    rows,
    page,
    pageCount,
    pageSize,
    visibleColumns,
    expandedKeys,
    childrenCache,
    sortKey,
    sortDir,
  } = state;

  const allColumns = rows.length ? Object.keys(rows[0]?.data ?? {}) : [];
  const [managerOpen, setManagerOpen] = useState(false);

  const handleToggle = async (row: Row) => {
    const key = row.group_key ?? String(row.id);
    const isCurrentlyOpen = expandedKeys.has(key);
    toggleRowExpanded(key);
    if (!isCurrentlyOpen && mode === "grouped" && !childrenCache[key]) {
      await loadChildren(key);
    }
  };

  // V1: header interactions (all optional, won’t break existing behavior)
  const handleSortToggle = (col: string) => {
    if (!setSort) return;
    if (sortKey === col) {
      const nextDir = sortDir === "asc" ? "desc" : "asc";
      setSort(col, nextDir);
    } else {
      setSort(col, "asc");
    }
  };

  const handleHideColumn = (col: string) => {
    const next = visibleColumns.filter((c) => c !== col);
    setVisibleColumns(next.length ? next : visibleColumns); // avoid empty table
  };

  const handleMoveColumn = (from: number, to: number) => {
    if (from === to) return;
    const next = [...visibleColumns];
    const [x] = next.splice(from, 1);
    next.splice(to, 0, x);
    setVisibleColumns(next);
  };

  const handleReferencePlaceholder = (col: string) => {
    // placeholder for the future Reference sheet
    if (typeof window !== "undefined") {
      window.alert(`Reference setup for "${col}" — coming soon.`);
    }
  };

  // early frame for loading/empty
  if (loading || !rows?.length) {
    return (
      <div className="flex h-full flex-col">
        <div className="mb-2 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
            Manage columns
          </Button>
        </div>

        <EmptyOrLoading
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          onPageSizeChange={(s) => updateParams({ pageSize: s, page: 1 })}
        />

        <ColumnManagerModal
          open={managerOpen}
          onOpenChange={setManagerOpen}
          all={allColumns}
          initialVisible={visibleColumns}
          onApply={(next) => setVisibleColumns(next.length ? next : allColumns.slice(0, 1))}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="mb-2 flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setManagerOpen(true)}>
          Manage columns
        </Button>
      </div>

      {/* Scrollable rows area */}
      <div className="flex-1 overflow-auto rounded-xl border">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <DataTableHeader
            mode={mode as Mode}
            columns={visibleColumns}
            // V1 props — optional, safe if reducer/API aren’t ready
            sortKey={sortKey ?? null}
            sortDir={sortDir}
            onSortToggle={handleSortToggle}
            onHideColumn={handleHideColumn}
            onMoveColumn={handleMoveColumn}
            onOpenReference={handleReferencePlaceholder}
          />
          <tbody>
            {rows.map((r) => {
              const key = r.group_key ?? String(r.id);
              const isOpen = expandedKeys.has(key);
              return (
                <DataTableRow
                  key={r.id}
                  mode={mode as Mode}
                  row={r}
                  columns={visibleColumns}
                  isOpen={isOpen}
                  onToggle={() => handleToggle(r)}
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
        onPageChange={(p) => updateParams({ page: p })}
        onPageSizeChange={(s) => updateParams({ pageSize: s, page: 1 })}
      />

      {/* Column manager modal */}
      <ColumnManagerModal
        open={managerOpen}
        onOpenChange={setManagerOpen}
        all={allColumns}
        initialVisible={visibleColumns}
        onApply={(next) => setVisibleColumns(next.length ? next : allColumns.slice(0, 1))}
      />
    </div>
  );
}
