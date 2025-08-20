import React, { createContext, useContext } from "react";
import { useDataManager } from "../logic/useDataManager";

// The new, simple context: { state, actions }
type CtxShape = ReturnType<typeof useDataManager>;

const Ctx = createContext<CtxShape | null>(null);

export function useImportData() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useImportData must be used within ImportDataProvider");
  return ctx;
}

export function ImportDataProvider({ children }: { children: React.ReactNode }) {
  const value = useDataManager(); // <- your new reducer hook
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
