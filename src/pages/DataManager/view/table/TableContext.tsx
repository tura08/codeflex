import * as React from "react";

type TableCtx = {
  openColumnManager: () => void;
};

const Ctx = React.createContext<TableCtx | null>(null);

export function TableProvider({
  children,
  value,
}: {
  children: React.ReactNode;
  value: TableCtx;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTableContext() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useTableContext must be used within TableProvider");
  return ctx;
}
