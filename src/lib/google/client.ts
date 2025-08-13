// src/lib/google/client.ts

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = [
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/spreadsheets.readonly",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

export function initGoogleClient() {
  if (!window.google || tokenClient) return;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (_response) => {},
  });
}

export function requestAccessToken(interactive = true): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) return reject(new Error("Google client not initialized"));
    tokenClient.callback = (resp: { access_token?: string; error?: string }) => {
      if (resp.error) return reject(new Error(resp.error));
      if (!resp.access_token) return reject(new Error("No access token returned"));
      accessToken = resp.access_token;
      localStorage.setItem("g_access_token", accessToken);
      resolve(accessToken);
    };
    tokenClient.requestAccessToken({ prompt: interactive ? "consent" : "" });
  });
}

export function getAccessToken(): string | null {
  return accessToken || localStorage.getItem("g_access_token");
}

export function disconnectGoogle() {
  const token = getAccessToken();
  if (token) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${token}`, {
      method: "POST",
      headers: { "Content-type": "application/x-www-form-urlencoded" },
    }).catch(() => {});
  }
  accessToken = null;
  localStorage.removeItem("g_access_token");
}

export async function ensureGoogle(interactiveIfNeeded = true): Promise<string> {
  const token = getAccessToken();
  if (token) return token;
  try {
    return await requestAccessToken(false); // silent
  } catch {
    if (!interactiveIfNeeded) throw new Error("Google token missing");
    return await requestAccessToken(true); // popup
  }
}

export async function getUserInfo() {
  const token = await ensureGoogle(true);
  const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
