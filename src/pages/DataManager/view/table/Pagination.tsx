import { Button } from "@/components/ui/button";

export function Pagination({
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
