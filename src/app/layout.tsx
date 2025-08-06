import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from '@/components/TopNav';
import { SideNav } from '@/components/SideNav';
import { ProjectProvider } from "@/context/ProjectContext";

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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[var(--background)] text-[var(--foreground)]`}
      >
        <ProjectProvider>
          <TopNav />
          <div className="flex flex-1 h-screen overflow-hidden">
            <SideNav />
            <main className="flex-1 overflow-auto p-6">
              {children}
            </main>
          </div>
        </ProjectProvider>
      </body>
    </html>
  );
}
