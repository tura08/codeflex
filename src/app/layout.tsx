import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { NavBar } from '@/components/NavBar';
import { SideBar } from '@/components/SideBar';
import { ProjectProvider } from "@/context/ProjectContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cookies } from "next/headers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'CodeFlex',
  description: 'Platform for defining and designing powerful interconnected apps.',
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies()
  const defaultOpen = cookieStore.get("sidebar_state")?.value === "true"

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <ProjectProvider>
          <SidebarProvider defaultOpen={defaultOpen}>
            <SideBar />
            <main className="w-full">
              <NavBar />
              <div className="px-4">{children}</div>
            </main>
          </SidebarProvider>
        </ProjectProvider>
      </body>
    </html>
  );
}
