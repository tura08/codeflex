import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ImportProvider } from "../context/ImportContext";
import { TopBarProvider, useTopBarNode } from "../context/TopBarContext";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ShellInner() {
  const actions = useTopBarNode();
  const location = useLocation();
  const navigate = useNavigate();

  const base = "/datamanager";
  const isView = location.pathname.startsWith(`${base}/view`);
  const active: "import" | "view" = isView ? "view" : "import";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Manager</h1>
          <p className="text-sm text-muted-foreground">
            Import data from Sheets → map → validate → store → browse.
          </p>
        </div>
        {/* actions renders here — now inside ImportProvider */}
        <div className="flex items-center gap-2">{actions}</div>
      </div>

      {/* Tabs (shadcn) */}
      <Tabs
        value={active}
        onValueChange={(v) => {
          if (v === "import") navigate(base);
          if (v === "view") navigate(`${base}/view`);
        }}
      >
        <TabsList>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="view">View</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Page content */}
      <Outlet />
    </div>
  );
}

export default function DataShell() {
  return (
    <ImportProvider>
      <TopBarProvider>
        <ShellInner />
      </TopBarProvider>
    </ImportProvider>
  );
}
