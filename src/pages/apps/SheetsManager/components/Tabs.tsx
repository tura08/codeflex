// src/pages/apps/SheetsManager/components/Tabs.tsx

type Item = { key: string; label: string };
export function Tabs({
  items,
  active,
  onChange,
}: { items: Item[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex gap-2 border-b px-2">
      {items.map((it) => {
        const isActive = it.key === active;
        return (
          <button
            key={it.key}
            onClick={() => onChange(it.key)}
            className={[
              "px-3 py-2 text-sm rounded-t-md",
              isActive
                ? "bg-background border border-b-transparent border-muted-foreground/30 font-medium"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
