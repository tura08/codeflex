import { useEffect, useState } from "react";
import {
  initGoogleClient, requestAccessToken, getAccessToken,
  disconnectGoogle, getUserInfo,
} from "@/lib/google/client";

export function useGoogleAuth() {
  const [connected, setConnected] = useState<boolean>(!!getAccessToken());
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
    setLoading(true);
    try {
      await requestAccessToken(true);
      setConnected(true);
      const u = await getUserInfo().catch(() => null);
      setUser(u);
    } finally {
      setLoading(false);
    }
  }

  function disconnect() {
    disconnectGoogle();
    setConnected(false);
    setUser(null);
  }

  return { connected, user, loading, connect, disconnect };
}
