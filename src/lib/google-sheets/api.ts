// src/lib/google-sheets/api.ts

import { ensureGoogle } from "./client";

async function authFetch(url: string) {
  const token = await ensureGoogle(true);
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 401 || res.status === 403) {
    // re-consent once
    const token2 = await ensureGoogle(true);
    res = await fetch(url, { headers: { Authorization: `Bearer ${token2}` } });
  }

  if (!res.ok) throw new Error(await res.text());
  return res;
}

export async function googleListSpreadsheets() {
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

export async function googleGetSheetTabs(spreadsheetId: string) {
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

/**
 * Return formatted strings so dates like 04/08/2025 are not numeric serials (45873).
 * (valueRenderOption=FORMATTED_VALUE + dateTimeRenderOption=FORMATTED_STRING)
 */
export async function googleGetSheetValues(spreadsheetId: string, sheetName: string) {
  const base = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${encodeURIComponent(sheetName)}`;

  const qs = new URLSearchParams({
    majorDimension: "ROWS",
    valueRenderOption: "FORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });

  const url = `${base}?${qs.toString()}`;
  const res = await authFetch(url);
  const data = await res.json();
  return (data.values ?? []) as string[][];
}