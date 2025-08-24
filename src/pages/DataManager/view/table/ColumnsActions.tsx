import type { ColumnDefLike, Row as RowType } from "./types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

export function selectionColumn<RowT>(): ColumnDefLike<RowT> {
  return {
    id: "__select",
    enableSorting: false,
    enableHiding: false,
    header: ({ table }: any) => (
      <Checkbox
        checked={table.getIsAllRowsSelected()}
        onCheckedChange={(v) => table.toggleAllRowsSelected(!!v)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }: any) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(v) => row.toggleSelected(!!v)}
        aria-label="Select row"
      />
    ),
    size: 36,
  };
}

export function expanderColumn(opts: {
  isOpen: (key: string) => boolean;
  onToggle: (key: string) => void;
}): ColumnDefLike<RowType> {
  return {
    id: "__expander",
    header: () => <span className="sr-only">Expand</span>,
    enableSorting: false,
    enableHiding: false,
    size: 44,
    cell: ({ row }) => {
      const r = row.original as RowType;
      const key = r.group_key ?? String(r.id);
      const open = opts.isOpen(key);
      return (
        <Button variant="outline" size="sm" onClick={() => opts.onToggle(key)}>
          {open ? "-" : "+"}
        </Button>
      );
    },
  };
}

export function idColumn(): ColumnDefLike<RowType> {
  return {
    id: "__id",
    header: () => <div className="px-2">ID</div>,
    cell: ({ row }) => (
      <div className="px-2 whitespace-nowrap">
        {String((row.original as RowType).id).slice(0, 8)}
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 90,
  };
}

export function jsonColumn(): ColumnDefLike<RowType> {
  return {
    id: "__json",
    header: () => <div className="px-2">JSON</div>,
    cell: ({ row }) => {
      const r = row.original as RowType;
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const pretty = JSON.stringify(r.data ?? {}, null, 2);
            if (typeof window !== "undefined") window.alert(pretty);
          }}
        >
          View
        </Button>
      );
    },
    enableSorting: false,
    enableHiding: false,
    size: 90,
  };
}

export function actionsColumn(): ColumnDefLike<RowType> {
  return {
    id: "__actions",
    header: () => <span className="sr-only">Actions</span>,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => {
      const r = row.original as RowType;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel>Row actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => alert(JSON.stringify(r, null, 2))}>
              View JSON
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(String(r.id));
                } catch {}
              }}
            >
              Copy ID
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(r.data ?? {}, null, 2)
                  );
                } catch {}
              }}
            >
              Copy JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  };
}
