import { Button } from "@/components/ui/button";
import { useGoogleAuth } from "../hooks/useGoogleAuth";

export function GoogleConnect() {
  const { connected, user, loading, connect, disconnect } = useGoogleAuth();

  return (
    <div className="flex items-center gap-3">
      {!connected ? (
        <Button className="cursor-pointer" onClick={connect} disabled={loading}>
          {loading ? "Connecting…" : "Connect Google"}
        </Button>
      ) : (
        <>
          <span className="text-sm text-muted-foreground">
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
