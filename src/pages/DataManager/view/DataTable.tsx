import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Mode = "grouped" | "flat";

// Fixed number of data columns to show (not counting ID / group_key / JSON)
const MAX_COLUMNS = 8;

export default function DataTable({
  loading,
  mode,
  rows,
  page,
  pageCount,
  onPageChange,
  onLoadChildren,
}: {
  loading: boolean;
  mode: Mode;
  rows: any[];
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  onLoadChildren?: (groupKey: string) => Promise<any[]>;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [childrenCache, setChildrenCache] = useState<Record<string, any[]>>({});

  useEffect(() => {
    setExpanded({});
    setChildrenCache({});
  }, [mode, page]);

  // Always show exactly MAX_COLUMNS data columns.
  const sampleKeys = useMemo(() => {
    const first = rows?.[0]?.data ?? {};
    const keys = Object.keys(first);
    if (keys.length < MAX_COLUMNS) {
      const diff = Array.from(
        { length: MAX_COLUMNS - keys.length },
        (_, i) => `__col${i}`
      );
      return [...keys, ...diff].slice(0, MAX_COLUMNS);
    }
    return keys.slice(0, MAX_COLUMNS);
  }, [rows]);

  // Loading / Empty states inside the card area
  if (loading || !rows?.length) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-auto rounded-xl border bg-background">
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            {loading ? "Loading…" : "No rows."}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled>
            Prev
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} / {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    );
  }

  const toggleExpand = async (row: any) => {
    const key = row.group_key ?? String(row.id);
    const next = !expanded[key];
    setExpanded((s) => ({ ...s, [key]: next }));
    if (next && mode === "grouped" && onLoadChildren && key && !childrenCache[key]) {
      const kids = await onLoadChildren(key);
      setChildrenCache((s) => ({
        ...s,
        [key]: Array.isArray(kids) ? kids.slice(0, 50) : [],
      }));
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Scrollable rows area; prevent horizontal scroll by using table-fixed and truncation */}
      <div className="flex-1 overflow-auto rounded-xl border">
        <table className="w-full table-fixed border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-muted">
            <tr>
              {mode === "grouped" && (
                <th className="bg-muted p-2 text-left align-middle w-[44px]"> </th>
              )}
              <th className="bg-muted p-2 text-left align-middle w-[90px]">ID</th>
              {mode === "grouped" && (
                <th className="bg-muted p-2 text-left align-middle w-[160px]">
                  group_key
                </th>
              )}
              {/* Data columns share the remaining width; table-fixed ensures equal distribution */}
              {sampleKeys.map((k) => (
                <th key={k} className="bg-muted p-2 text-left align-middle">
                  {k.startsWith("__col") ? "—" : k}
                </th>
              ))}
              <th className="bg-muted p-2 text-left align-middle w-[90px]">JSON</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => {
              const key = r.group_key ?? String(r.id);
              const isOpen = !!expanded[key];
              return (
                <FragmentRow
                  key={r.id}
                  row={r}
                  mode={mode}
                  isOpen={isOpen}
                  onToggle={() => toggleExpand(r)}
                  sampleKeys={sampleKeys}
                  childrenRows={childrenCache[key] || []}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination footer pinned */}
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
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
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

function FragmentRow({
  row,
  mode,
  isOpen,
  onToggle,
  sampleKeys,
  childrenRows,
}: {
  row: any;
  mode: Mode;
  isOpen: boolean;
  onToggle: () => void;
  sampleKeys: string[];
  childrenRows: any[];
}) {
  const [showJson, setShowJson] = useState(false);

  // Mirror fixed columns for children section as well
  const childKeys = useMemo(() => {
    const first = childrenRows?.[0]?.data ?? {};
    const keys = Object.keys(first);
    if (keys.length < MAX_COLUMNS) {
      const diff = Array.from(
        { length: MAX_COLUMNS - keys.length },
        (_, i) => `__col${i}`
      );
      return [...keys, ...diff].slice(0, MAX_COLUMNS);
    }
    return keys.slice(0, MAX_COLUMNS);
  }, [childrenRows]);

  return (
    <>
      <tr className="border-t align-top">
        {mode === "grouped" && (
          <td className="p-2">
            <Button variant="outline" size="sm" onClick={onToggle}>
              {isOpen ? "▾" : "▸"}
            </Button>
          </td>
        )}
        <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis">
          {String(row.id).slice(0, 8)}
        </td>
        {mode === "grouped" && (
          <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-muted-foreground">
            {row.group_key ?? "-"}
          </td>
        )}
        {sampleKeys.map((k) => (
          <td
            key={k}
            className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
            title={
              k.startsWith("__col")
                ? undefined
                : row.data?.[k] != null
                ? String(formatCell(row.data?.[k]))
                : "—"
            }
          >
            {k.startsWith("__col") ? "—" : formatCell(row.data?.[k])}
          </td>
        ))}
        <td className="p-2">
          <Button variant="outline" size="sm" onClick={() => setShowJson(true)}>
            View
          </Button>
          {showJson && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setShowJson(false)}
            >
              <div
                className="max-h-[70vh] w-[680px] overflow-auto rounded-xl bg-background p-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="font-medium">Row JSON</div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowJson(false)}
                  >
                    Close
                  </Button>
                </div>
                <pre className="whitespace-pre-wrap text-xs">
                  {JSON.stringify(row.data ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </td>
      </tr>

      {mode === "grouped" && isOpen && (
        <tr className="border-t bg-muted/20">
          <td
            colSpan={2 + 1 + sampleKeys.length + 1}
            className="p-0"
          >
            <div className="p-3">
              {!childrenRows.length ? (
                <div className="text-xs text-muted-foreground">No items.</div>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full table-fixed text-xs">
                    <thead className="sticky top-0 bg-muted/40">
                      <tr>
                        <th className="p-2 text-left align-middle w-[90px]">ID</th>
                        <th className="p-2 text-left align-middle w-[160px]">
                          group_key
                        </th>
                        {childKeys.map((k) => (
                          <th key={k} className="p-2 text-left align-middle">
                            {k.startsWith("__col") ? "—" : k}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {childrenRows.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis">
                            {String(c.id).slice(0, 8)}
                          </td>
                          <td className="p-2 whitespace-nowrap overflow-hidden text-ellipsis text-muted-foreground">
                            {c.group_key}
                          </td>
                          {childKeys.map((k) => (
                            <td
                              key={k}
                              className="p-2 whitespace-nowrap overflow-hidden text-ellipsis"
                              title={
                                k.startsWith("__col")
                                  ? undefined
                                  : c.data?.[k] != null
                                  ? String(formatCell(c.data?.[k]))
                                  : "—"
                              }
                            >
                              {k.startsWith("__col") ? "—" : formatCell(c.data?.[k])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function formatCell(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
