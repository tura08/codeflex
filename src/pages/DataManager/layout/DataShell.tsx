// src/pages/datamanager/layout/DataShell.tsx
import React, { createContext, useContext, useMemo, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { ImportControllerProvider } from "@/pages/DataManager/import/ImportControllerContext"; // keep provider; path can stay if file lives there

type TopBarActionsCtx = { setTopBarActions: (node: React.ReactNode | null) => void };
const TopBarCtx = createContext<TopBarActionsCtx | null>(null);

export function useTopBarActions() {
  const ctx = useContext(TopBarCtx);
  if (!ctx) throw new Error("useTopBarActions must be used within DataShell");
  return ctx.setTopBarActions;
}

export default function DataShell() {
  const [actions, setActions] = useState<React.ReactNode | null>(null);
  const value = useMemo(() => ({ setTopBarActions: setActions }), []);
  const location = useLocation();
  const navigate = useNavigate();

  // NEW base route
  const base = "/datamanager";
  const isView = location.pathname.startsWith(`${base}/view`);
  const active = isView ? "view" : "import";

  const ShellBody = (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Data Manager</h1>
          <p className="text-sm text-muted-foreground">
            Import data from Sheets → map → validate → store → browse.
          </p>
        </div>
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

  return (
    <TopBarCtx.Provider value={value}>
      <ImportControllerProvider>{ShellBody}</ImportControllerProvider>
    </TopBarCtx.Provider>
  );
}
