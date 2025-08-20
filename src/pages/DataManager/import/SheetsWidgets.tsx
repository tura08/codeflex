import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useGoogleAuth } from "@/integrations/google/hooks/useGoogleAuth";
import { googleListSpreadsheets, googleGetSheetTabs } from "@/lib/google-sheets/api";

/* ──────────────────────────────────────────────────────────────
   GoogleConnect
─────────────────────────────────────────────────────────────── */
export function GoogleConnect() {
  const { connected, user, loading, connect, disconnect } = useGoogleAuth();
  return (
    <div className="flex items-center gap-3 min-w-0">
      {!connected ? (
        <Button className="cursor-pointer" onClick={connect} disabled={loading}>
          {loading ? "Connecting…" : "Connect Google"}
        </Button>
      ) : (
        <>
          <span className="text-sm text-muted-foreground truncate">
            Connected{user ? ` as ${user.name || user.email}` : ""}
          </span>
          <Button variant="destructive" className="cursor-pointer" onClick={disconnect}>
            Disconnect
          </Button>
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   GoogleDriveCard
─────────────────────────────────────────────────────────────── */
export function GoogleDriveCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive & Sheets</CardTitle>
        <CardDescription>Connect your Google account to enable Sheets integration.</CardDescription>
        <Link to="/datamanager" className="text-primary underline text-sm">
          Go to Sheets Manager
        </Link>
      </CardHeader>
      <CardContent>
        <GoogleConnect />
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────────────────────
   PreviewTable
─────────────────────────────────────────────────────────────── */
export function PreviewTable({ headers, rows }: { headers: string[]; rows: any[][] }) {
  if (!headers.length) return null;
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="border-b p-2 text-left whitespace-nowrap font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-muted/30">
              {headers.map((_, j) => (
                <td key={j} className="border-b p-2 whitespace-nowrap">{String(r[j] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SpreadsheetSelect
─────────────────────────────────────────────────────────────── */
export function SpreadsheetSelect({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string) => void;
}) {
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setBusy(true);
      setError(null);
      const list = await googleListSpreadsheets();
      setFiles(list.map((f) => ({ id: f.id, name: f.name })));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load spreadsheets");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="w-full flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <Select value={value} onValueChange={onChange} disabled={busy || files.length === 0}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={busy ? "Loading…" : "Select a spreadsheet"} />
          </SelectTrigger>
          <SelectContent className="max-h-72 w-[--radix-select-trigger-width]">
            {files.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>

      <Button variant="outline" className="cursor-pointer sm:w-auto w-full" onClick={load} disabled={busy}>
        {busy ? "Loading…" : "Reload"}
      </Button>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────
   SheetTabSelect
─────────────────────────────────────────────────────────────── */
export function SheetTabSelect({
  spreadsheetId,
  value,
  onChange,
}: {
  spreadsheetId?: string;
  value?: string;
  onChange: (name: string) => void;
}) {
  const [tabs, setTabs] = useState<{ id: number; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!spreadsheetId) return;
    (async () => {
      try {
        setBusy(true);
        setError(null);
        const list = await googleGetSheetTabs(spreadsheetId);
        setTabs(list);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load tabs");
      } finally {
        setBusy(false);
      }
    })();
  }, [spreadsheetId]);

  if (!spreadsheetId) return null;

  return (
    <div className="min-w-0">
      <Select value={value} onValueChange={onChange} disabled={busy || tabs.length === 0}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={busy ? "Loading…" : "Select a tab"} />
        </SelectTrigger>
        <SelectContent className="max-h-72 w-[--radix-select-trigger-width]">
          {tabs.map((t) => (
            <SelectItem key={t.id} value={t.name}>
              {t.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
