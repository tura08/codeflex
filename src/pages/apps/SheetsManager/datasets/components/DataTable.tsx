// src/pages/apps/SheetsManager/datasets/components/DataTable.tsx
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type Mode = "grouped" | "flat";

export default function DataTable({
  loading,
  mode,
  rows,
  page,
  pageCount,
  onPageChange,
  onLoadChildren, // only used when grouped
}: {
  loading: boolean;
  mode: Mode;
  rows: any[];
  page: number;
  pageCount: number;
  onPageChange: (p: number) => void;
  onLoadChildren?: (groupKey: string) => Promise<any[]>;
}) {
  // ✅ All hooks at the top
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [childrenCache, setChildrenCache] = useState<Record<string, any[]>>({});

  useEffect(() => {
    setExpanded({});
    setChildrenCache({});
  }, [mode, page]);

  // derive keys regardless of loading/empty so hook order is stable
  const sampleKeys = useMemo(() => {
    const first = rows?.[0]?.data ?? {};
    return Object.keys(first).slice(0, 6);
  }, [rows]);

  // after all hooks, do the early UI returns
  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!rows?.length) return <p className="text-sm text-muted-foreground">No rows.</p>;

  const toggleExpand = async (row: any) => {
    const key = row.group_key ?? String(row.id);
    const next = !expanded[key];
    setExpanded((s) => ({ ...s, [key]: next }));
    if (next && mode === "grouped" && onLoadChildren && key && !childrenCache[key]) {
      const kids = await onLoadChildren(key);
      setChildrenCache((s) => ({ ...s, [key]: kids }));
    }
  };

  return (
    <div className="space-y-3">
      <div className="overflow-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {mode === "grouped" && <th className="w-[44px]" />}
              <th className="text-left p-2 w-[80px]">ID</th>
              {mode === "grouped" && <th className="text-left p-2 w-[160px]">group_key</th>}
              {sampleKeys.map((k) => (
                <th key={k} className="text-left p-2">{k}</th>
              ))}
              <th className="p-2 w-[80px]">JSON</th>
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

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </Button>
        <span className="text-xs text-muted-foreground">Page {page} / {pageCount}</span>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
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

  // Derive child keys once for consistent columns
  const childKeys = useMemo(() => {
    const first = childrenRows?.[0]?.data ?? {};
    return Object.keys(first).slice(0, 6);
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
        <td className="p-2">{String(row.id).slice(0, 8)}</td>
        {mode === "grouped" && <td className="p-2 text-muted-foreground">{row.group_key ?? "-"}</td>}
        {sampleKeys.map((k) => (
          <td key={k} className="p-2 truncate max-w-[220px]">{formatCell(row.data?.[k])}</td>
        ))}
        <td className="p-2">
          <Button variant="outline" size="sm" onClick={() => setShowJson(true)}>View</Button>
          {showJson && (
            <div
              className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center"
              onClick={() => setShowJson(false)}
            >
              <div
                className="bg-background rounded-xl p-4 w-[680px] max-h-[70vh] overflow-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="font-medium">Row JSON</div>
                  <Button variant="outline" size="sm" onClick={() => setShowJson(false)}>Close</Button>
                </div>
                <pre className="text-xs whitespace-pre-wrap">
                  {JSON.stringify(row.data ?? {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </td>
      </tr>

      {mode === "grouped" && isOpen && (
        <tr className="border-t bg-muted/20">
          <td colSpan={2 + 1 + sampleKeys.length + 1} className="p-0">
            <div className="p-3">
              {!childrenRows.length ? (
                <div className="text-xs text-muted-foreground">No items.</div>
              ) : (
                <div className="overflow-auto rounded-lg border">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2 w-[80px]">ID</th>
                        <th className="text-left p-2 w-[160px]">group_key</th>
                        {childKeys.map((k) => (
                          <th key={k} className="text-left p-2">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {childrenRows.map((c) => (
                        <tr key={c.id} className="border-t">
                          <td className="p-2">{String(c.id).slice(0, 8)}</td>
                          <td className="p-2 text-muted-foreground">{c.group_key}</td>
                          {childKeys.map((k) => (
                            <td key={k} className="p-2 truncate max-w-[220px]">{formatCell(c.data?.[k])}</td>
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
