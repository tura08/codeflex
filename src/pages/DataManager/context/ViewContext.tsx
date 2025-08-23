import React, { createContext, useContext } from "react";
import { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";

type Ctx = ReturnType<typeof useViewReducer> | null;

const ViewContext = createContext<Ctx>(null);

export function ViewProvider({ datasetId, children }: { datasetId: string; children: React.ReactNode }) {
  const api = useViewReducer(datasetId);
  return <ViewContext.Provider value={api}>{children}</ViewContext.Provider>;
}

export function useView() {
  const ctx = useContext(ViewContext);
  if (!ctx) throw new Error("useView must be used within <ViewProvider>");
  return ctx;
}
