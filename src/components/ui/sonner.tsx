import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as SonnerToaster } from "sonner";

type SonnerProps = React.ComponentProps<typeof SonnerToaster>;

export function Toaster(props: SonnerProps) {
  const { resolvedTheme = "system" } = useTheme();

  return (
    <SonnerToaster
      theme={resolvedTheme as SonnerProps["theme"]}
      position="top-right"
      richColors
      closeButton
      duration={3000}
      className="toaster group"
      style={{
        ["--normal-bg" as any]: "var(--popover)",
        ["--normal-text" as any]: "var(--popover-foreground)",
        ["--normal-border" as any]: "var(--border)",
      }}
      toastOptions={{
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        },
      }}
      {...props}
    />
  );
}
