import { useImportControllerLogic, type ImportControllerValue } from "@/pages/DataManager/hooks/useImportController";
import React, { createContext, useContext } from "react";

const Ctx = createContext<ImportControllerValue | null>(null);

export function useImportController() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useImportController must be used within ImportControllerProvider");
  return ctx;
}

export function ImportControllerProvider({ children }: { children: React.ReactNode }) {
  const value = useImportControllerLogic();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
