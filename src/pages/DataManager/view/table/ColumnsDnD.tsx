import * as React from "react";
import type { ColumnDefLike } from "./types";
import { formatCell } from "./utils";
import { GripVertical } from "lucide-react";

/**
 * Build dynamic data columns with draggable headers.
 * - Reorders ONLY within `visible` by calling `onReorder(next)`.
 * - Keeps highlight for the current drop target.
 */
export function useColumnsDnD<RowT extends { data: Record<string, any> }>(
  visible: string[],
  onReorder: (next: string[]) => void
): ColumnDefLike<RowT>[] {
  const dragFromId = React.useRef<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const reorder = React.useCallback(
    (fromId: string, toId: string) => {
      if (!fromId || !toId || fromId === toId) return;
      const order = [...visible];
      const i = order.indexOf(fromId);
      const j = order.indexOf(toId);
      if (i === -1 || j === -1) return;
      const [m] = order.splice(i, 1);
      order.splice(j, 0, m);
      onReorder(order);
    },
    [visible, onReorder]
  );

  return React.useMemo(
    () =>
      visible.map<ColumnDefLike<RowT>>((colId) => ({
        id: colId,
        accessorFn: (r: any) => r?.data?.[colId],
        header: () => (
          <div className="px-2">
            <div
              className={`block w-full rounded px-1 py-0.5 ${
                overId === colId ? "ring-1 ring-primary/50 bg-muted/60" : ""
              }`}
              draggable
              title="Drag to reorder"
              onDragStart={(e) => {
                dragFromId.current = colId;
                try {
                  e.dataTransfer.setData("text/plain", colId);
                } catch {}
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnter={() => setOverId(colId)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragLeave={() =>
                setOverId((cur) => (cur === colId ? null : cur))
              }
              onDrop={(e) => {
                e.preventDefault();
                const from =
                  dragFromId.current || e.dataTransfer.getData("text/plain");
                setOverId(null);
                dragFromId.current = null;
                if (from) reorder(from, colId);
              }}
              onDragEnd={() => {
                setOverId(null);
                dragFromId.current = null;
              }}
            >
              <span className="inline-flex items-center gap-1 cursor-grab select-none">
                <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
                {colId}
              </span>
            </div>
          </div>
        ),
        cell: ({ getValue }) => {
          const val = getValue();
          return (
            <div
              className="whitespace-nowrap overflow-hidden text-ellipsis"
              title={val != null ? String(formatCell(val)) : "—"}
            >
              {formatCell(val)}
            </div>
          );
        },
      })),
    [visible, overId, reorder]
  );
}
