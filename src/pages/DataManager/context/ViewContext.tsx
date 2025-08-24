import { createContext, useContext } from "react";
import type { useViewReducer } from "@/pages/DataManager/hooks/useViewReducer";

type ViewController = ReturnType<typeof useViewReducer>;
const Ctx = createContext<ViewController | null>(null);

export function ViewControllerProvider({
  value,
  children,
}: { value: ViewController; children: React.ReactNode }) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useViewController() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useViewController must be used within ViewControllerProvider");
  return ctx;
}
