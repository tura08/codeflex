export function ensureAtLeastOne(visible: string[], all: string[]) {
  return visible.length ? visible : all.slice(0, 1).filter(Boolean);
}
export function formatCell(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
