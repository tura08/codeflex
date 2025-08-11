// src/components/integrations/GoogleDriveCard.tsx
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  initGoogleClient,
  requestAccessToken,
  getAccessToken,
  disconnectGoogle,
  getUserInfo,
  listSpreadsheets,
} from "@/lib/google";

export function GoogleDriveCard() {
  const [connected, setConnected] = useState<boolean>(!!getAccessToken());
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // try to init as soon as gsi is loaded
    const id = setInterval(() => {
      if ((window as any).google) {
        initGoogleClient();
        clearInterval(id);
      }
    }, 200);
    if (getAccessToken()) getUserInfo().then(setUser).catch(() => {});
    return () => clearInterval(id);
  }, []);

  async function connect() {
    await requestAccessToken(true);
    setConnected(true);
    const u = await getUserInfo().catch(() => null);
    setUser(u);
  }

  async function fetchSheets() {
    setLoading(true);
    try {
      const items = await listSpreadsheets();
      setFiles(items);
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    disconnectGoogle();
    setConnected(false);
    setUser(null);
    setFiles([]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Google Drive & Sheets</CardTitle>
        <CardDescription>Connect and browse your spreadsheets.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!connected ? (
          <Button className="cursor-pointer" onClick={connect}>Connect Google</Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={fetchSheets} disabled={loading}>
              {loading ? "Loading…" : "List Spreadsheets"}
            </Button>
            <Button variant="destructive" className="cursor-pointer" onClick={disconnect}>Disconnect</Button>
          </div>
        )}

        {user && (
          <div className="text-sm text-muted-foreground">
            Connected as {user.name || user.email}
          </div>
        )}

        {files.length > 0 && (
          <ul className="space-y-2">
            {files.map((f) => (
              <li key={f.id} className="rounded border p-2 flex items-center justify-between">
                <div>
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Modified {new Date(f.modifiedTime).toLocaleString()}
                  </div>
                </div>
                <a className="text-xs underline" href={`https://docs.google.com/spreadsheets/d/${f.id}`} target="_blank" rel="noreferrer">
                  Open
                </a>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
