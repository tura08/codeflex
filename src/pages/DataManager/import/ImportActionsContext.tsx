import React, { createContext, useContext, useMemo, useState } from "react";

export type ImportActions = {
  openConnect: () => void;
  openGrouping: () => void;
  save: () => void;
  disabled: { grouping: boolean; save: boolean };
};

const noop = () => {};
const defaultActions: ImportActions = {
  openConnect: noop,
  openGrouping: noop,
  save: noop,
  disabled: { grouping: true, save: true },
};

type Ctx = { actions: ImportActions; setActions: (a: ImportActions) => void };
const Ctx = createContext<Ctx>({ actions: defaultActions, setActions: () => {} });

export function ImportActionsProvider({ children }: { children: React.ReactNode }) {
  const [actions, setActions] = useState<ImportActions>(defaultActions);
  const value = useMemo(() => ({ actions, setActions }), [actions]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useImportActions() {
  return useContext(Ctx);
}
