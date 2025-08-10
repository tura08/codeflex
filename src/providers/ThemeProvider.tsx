import { ThemeProvider as NextThemes } from "next-themes"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="light" enableSystem={false}>
      {children}
    </NextThemes>
  )
}
