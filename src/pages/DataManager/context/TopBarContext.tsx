import React, { createContext, useContext, useMemo, useState } from "react";

type Ctx = {
  actions: React.ReactNode | null;
  setTopBarActions: (node: React.ReactNode | null) => void;
};

const TopBarCtx = createContext<Ctx | null>(null);

export function useTopBarActions() {
  const ctx = useContext(TopBarCtx);
  if (!ctx) throw new Error("useTopBarActions must be used within <TopBarProvider>");
  return ctx.setTopBarActions;
}

export function useTopBarNode() {
  const ctx = useContext(TopBarCtx);
  if (!ctx) throw new Error("useTopBarNode must be used within <TopBarProvider>");
  return ctx.actions;
}

export function TopBarProvider({ children }: { children: React.ReactNode }) {
  const [actions, setTopBarActions] = useState<React.ReactNode | null>(null);
  const value = useMemo(() => ({ actions, setTopBarActions }), [actions]);
  return <TopBarCtx.Provider value={value}>{children}</TopBarCtx.Provider>;
}
