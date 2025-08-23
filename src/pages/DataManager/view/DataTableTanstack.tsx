import * as React from "react";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

import { ArrowUpDown, ChevronDown, MoreHorizontal, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/* ------------------------------------------------------------------ */
/* Demo data                                                           */
/* ------------------------------------------------------------------ */

type DemoRow = {
  id: string;
  name: string;
  email: string;
  status: "active" | "pending" | "blocked";
  amount: number;
  createdAt: string; // ISO string
};

const sampleData: DemoRow[] = [
  { id: "a1f9c8d2", name: "Alice Carter", email: "alice@example.com", status: "active",  amount: 129.9,  createdAt: "2025-07-21T10:33:00Z" },
  { id: "b3e4d6f7", name: "Bob Nguyen",   email: "bob@acme.io",       status: "pending", amount: 89.0,   createdAt: "2025-06-05T12:14:00Z" },
  { id: "c9a2b1e0", name: "Carla Ruiz",   email: "carla@site.co",     status: "active",  amount: 245.5,  createdAt: "2025-06-29T09:01:00Z" },
  { id: "d7f0e3a4", name: "Derek Smith",  email: "derek@shop.dev",    status: "blocked", amount: 15.0,   createdAt: "2025-05-10T17:45:00Z" },
  { id: "e2b7c6d8", name: "Emma Rossi",   email: "emma@demo.org",     status: "pending", amount: 999.99, createdAt: "2025-08-01T08:00:00Z" },
  { id: "f1a3b5c7", name: "Felix Yang",   email: "felix@domain.com",  status: "active",  amount: 57.75,  createdAt: "2025-07-02T14:22:00Z" },
  { id: "g4h5i6j7", name: "Giulia Conti", email: "giulia@mail.io",    status: "active",  amount: 312.0,  createdAt: "2025-07-11T09:40:00Z" },
  { id: "h8i9j0k1", name: "Hassan Ali",   email: "hassan@alpha.net",  status: "blocked", amount: 0,      createdAt: "2025-04-18T07:10:00Z" },
];

/* ------------------------------------------------------------------ */
/* Small reusable pieces (minimal)                                     */
/* ------------------------------------------------------------------ */

function DataTableToolbar({
  table,
  filter,
  onFilterChange,
}: {
  table: ReturnType<typeof useReactTable<DemoRow>>;
  filter: string;
  onFilterChange: (v: string) => void;
}) {
  const selected = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8 h-8 w-64"
            placeholder="Filter name/email/status…"
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
          />
        </div>
        {selected > 0 && (
          <div className="text-xs text-muted-foreground">{selected} selected</div>
        )}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Columns <ChevronDown className="ml-1 h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {table
            .getAllLeafColumns()
            .filter((col) => col.getCanHide())
            .map((col) => (
              <DropdownMenuCheckboxItem
                key={col.id}
                className="capitalize"
                checked={col.getIsVisible()}
                onCheckedChange={(v) => col.toggleVisibility(Boolean(v))}
              >
                {col.id}
              </DropdownMenuCheckboxItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function DataTablePagination({
  table,
}: {
  table: ReturnType<typeof useReactTable<DemoRow>>;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;

  return (
    <div className="mt-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2 text-xs">
        <span>Rows per page:</span>
        <select
          className="rounded border p-1 text-xs"
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
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
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Prev
        </Button>
        <span className="text-xs text-muted-foreground">
          Page {pageIndex + 1} / {table.getPageCount()}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

/* Global filter over a few fields */
function globalStringFilter(row: any, _colId: string, value: string) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return true;
  const cols = ["name", "email", "status"];
  return cols.some((id) => String(row.getValue(id) ?? "").toLowerCase().includes(v));
}

/* ------------------------------------------------------------------ */
/* Main demo table                                                     */
/* ------------------------------------------------------------------ */

export default function DataTable() {
  const [data] = React.useState<DemoRow[]>(sampleData);
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo<ColumnDef<DemoRow>[]>(() => [
    // Row selection
    {
      id: "select",
      enableSorting: false,
      enableHiding: false,
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      size: 36,
    },
    // ID
    {
      accessorKey: "id",
      header: () => <span className="px-2">ID</span>,
      cell: ({ row }) => <div className="px-2">{row.getValue("id")}</div>,
      enableHiding: false,
      enableSorting: false,
    },
    // Name
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("name")}</div>,
    },
    // Email
    {
      accessorKey: "email",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Email
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <div className="whitespace-nowrap">{row.getValue("email")}</div>,
    },
    // Status
    {
      accessorKey: "status",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Status
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const v = row.getValue("status") as DemoRow["status"];
        const tone = v === "active" ? "text-green-600" : v === "pending" ? "text-amber-600" : "text-red-600";
        return <div className={`capitalize ${tone}`}>{v}</div>;
      },
    },
    // Amount
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => <div>€ {Number(row.getValue("amount")).toFixed(2)}</div>,
    },
    // Created At
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button
          variant="ghost"
          className="h-8 px-2"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Created
          <ArrowUpDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      ),
      cell: ({ row }) => {
        const dt = new Date(row.getValue("createdAt") as string);
        return <div className="whitespace-nowrap">{dt.toLocaleString()}</div>;
      },
    },
    // Row actions
    {
      id: "actions",
      enableHiding: false,
      enableSorting: false,
      header: () => <span className="sr-only">Actions</span>,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Row actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => alert(JSON.stringify(r, null, 2))}>
                View
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  try { await navigator.clipboard.writeText(r.id); } catch {}
                }}
              >
                Copy ID
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => alert("Edit (placeholder)")}>
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600" onClick={() => alert("Delete (placeholder)")}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, columnVisibility, rowSelection, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: globalStringFilter,
    getRowId: (r) => r.id,
    enableRowSelection: true,
    debugTable: false,
  });

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <DataTableToolbar table={table} filter={globalFilter} onFilterChange={setGlobalFilter} />
      </div>

      {/* Table */}
      <div className="mt-2 flex-1 overflow-auto rounded-xl border">
        <Table className="w-full text-sm">
          <TableHeader className="sticky top-0 z-10 bg-muted">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((header) => (
                  <TableHead key={header.id} className="align-middle">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((r) => (
                <TableRow key={r.id} data-state={r.getIsSelected() && "selected"}>
                  {r.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <DataTablePagination table={table} />
    </div>
  );
}
