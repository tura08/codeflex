// Minimal Google Identity Services + Drive/Sheets helpers
// Works entirely in the browser—no client secret, no backend.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

type TokenClient = google.accounts.oauth2.TokenClient;

let tokenClient: TokenClient | null = null;
let accessToken: string | null = null;

// Call once (e.g., on component mount)
export function initGoogleClient() {
  if (!window.google || tokenClient) return;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    // this callback will be overridden per request
    callback: (_response) => {},
  });
}

// Show popup on first connect; silent refresh afterwards
export function requestAccessToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Google client not initialized"));

    tokenClient.callback = (resp) => {
      if (resp.error) return reject(new Error(resp.error));
      accessToken = resp.access_token!;
      localStorage.setItem("g_access_token", accessToken);
      resolve(accessToken);
    };

    tokenClient.requestAccessToken({
      prompt: interactive ? "consent" : "", // "" = try silent
    });
  });
}

export function getAccessToken(): string | null {
  return accessToken || localStorage.getItem("g_access_token");
}

export function disconnectGoogle() {
  const token = getAccessToken();
  if (token) {
    // Revoke (optional); you can also just clear storage
    fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
    }).catch(() => {});
  }
  accessToken = null;
  localStorage.removeItem("g_access_token");
}

// === API calls ===
async function authFetch(url: string) {
  const token = getAccessToken();
  if (!token) throw new Error("Not connected to Google");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    // token expired → try silent refresh once
    await requestAccessToken(false);
    const token2 = getAccessToken();
    const res2 = await fetch(url, { headers: { Authorization: `Bearer ${token2}` } });
    if (!res2.ok) throw new Error(await res2.text());
    return res2;
  }
  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function getUserInfo() {
  const res = await authFetch("https://www.googleapis.com/oauth2/v2/userinfo");
  return res.json();
}

export async function listSpreadsheets() {
  const url =
    "https://www.googleapis.com/drive/v3/files?" +
    new URLSearchParams({
      q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
      fields: "files(id,name,modifiedTime,webViewLink,owners(emailAddress))",
      orderBy: "modifiedTime desc",
      pageSize: "50",
    });
  const res = await authFetch(url);
  const data = await res.json();
  return (data.files ?? []) as Array<{
    id: string; name: string; modifiedTime: string; webViewLink: string;
    owners?: { emailAddress?: string }[];
  }>;
}

export async function getSheetTabs(spreadsheetId: string) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}` +
    "?fields=sheets(properties(title,sheetId))";
  const res = await authFetch(url);
  const data = await res.json();
  return (data.sheets ?? []).map((s: any) => ({
    id: s.properties.sheetId as number,
    name: s.properties.title as string,
  }));
}

export async function getSheetValues(spreadsheetId: string, sheetName: string) {
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/` +
    encodeURIComponent(`${sheetName}!A:Z`) +
    "?valueRenderOption=UNFORMATTED_VALUE";
  const res = await authFetch(url);
  const data = await res.json();
  return (data.values ?? []) as string[][];
}
