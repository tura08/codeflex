// src/context/ImportContext.tsx
import { createContext, useContext, type ReactNode } from "react";
import { useImportReducer } from "../hooks/useImportReducer";

const ImportContext = createContext<ReturnType<typeof useImportReducer> | null>(null);

export function ImportProvider({ children }: { children: ReactNode }) {
  const value = useImportReducer();
  return <ImportContext.Provider value={value}>{children}</ImportContext.Provider>;
}

export function useImport() {
  const ctx = useContext(ImportContext);
  if (!ctx) throw new Error("useImport must be used inside <ImportProvider>");
  return ctx;
}
