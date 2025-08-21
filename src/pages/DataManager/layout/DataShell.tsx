// src/pages/DataManager/layout/DataShell.tsx
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ImportProvider } from "../context/ImportContext";
import { TopBarProvider, useTopBarNode } from "../context/TopBarContext";

function ShellInner() {
  const actions = useTopBarNode();
  const location = useLocation();
  const navigate = useNavigate();

  const base = "/datamanager";
  const isView = location.pathname.startsWith(`${base}/view`);
  const active = isView ? "view" : "import";

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

      {/* Tabs */}
      <div className="flex gap-2 border-b px-2">
        <button
          onClick={() => navigate(base)}
          className={[
            "px-3 py-2 text-sm rounded-t-md",
            active === "import"
              ? "bg-background border border-b-transparent border-muted-foreground/30 font-medium"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          Import
        </button>
        <button
          onClick={() => navigate(`${base}/view`)}
          className={[
            "px-3 py-2 text-sm rounded-t-md",
            active === "view"
              ? "bg-background border border-b-transparent border-muted-foreground/30 font-medium"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          View
        </button>
      </div>

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
