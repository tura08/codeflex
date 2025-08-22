import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

/* ---------- Layout ---------- */
export function TableFrame({ children }: { children: React.ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>;
}

/* ---------- Empty / Loading ---------- */
export function EmptyOrLoading({
  loading,
  page,
  pageCount,
  pageSize,
  onPageSizeChange,
}: {
  loading: boolean;
  page: number;
  pageCount: number;
  pageSize: number;
  onPageSizeChange: (s: number) => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-auto rounded-xl border bg-background">
        <div className="p-3">
          <div className="mb-2 grid grid-cols-10 gap-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, r) => (
              <div key={r} className="grid grid-cols-10 gap-2">
                {Array.from({ length: 10 }).map((_, c) => (
                  <Skeleton key={c} className="h-5" />
                ))}
              </div>
            ))}
          </div>
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

/* ---------- Pagination ---------- */
export function TablePagination({
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

/* ---------- Helpers ---------- */
export function useAllColumns(rows: Array<{ data?: Record<string, any> }>) {
  return useMemo(() => {
    const first = rows?.[0]?.data ?? {};
    return Object.keys(first);
  }, [rows]);
}

export function formatCell(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/* ---------- Persistence helpers (URL + localStorage) ---------- */
export function storageKeyForColumns(datasetId: string) {
  return `dm:view:cols:${datasetId}`;
}

export function readColumnsFromUrl(): string[] | null {
  try {
    const url = new URL(window.location.href);
    const val = url.searchParams.get("cols");
    if (!val) return null;
    const cols = val.split(",").map((s) => s.trim()).filter(Boolean);
    return cols.length ? cols : null;
  } catch {
    return null;
  }
}

export function writeColumnsToUrl(cols: string[]) {
  try {
    const url = new URL(window.location.href);
    if (cols.length) {
      url.searchParams.set("cols", cols.join(","));
    } else {
      url.searchParams.delete("cols");
    }
    // keep history clean: replace, don't push
    window.history.replaceState({}, "", url.toString());
  } catch {
    /* no-op */
  }
}
