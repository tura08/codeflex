import { Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";

import { SideBar } from "@/components/SideBar";
import { NavBar } from "@/components/NavBar";
import { SidebarProvider } from "@/components/ui/sidebar";

import Analyse from "@/pages/Analyse";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/NotFound";
import Apps from "@/pages/apps/Apps";
import AppDetails from "@/pages/apps/AppDetails";
import NewApp from "@/pages/apps/NewApp";
import Dashboard from "@/pages/Dashboard";
import LoginPage from "@/pages/Login";
import SignupPage from "@/pages/Signup";
import SheetsManager from "@/pages/apps/SheetsManager/index";

export default function App() {
  return (
    <>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected layout */}
        <Route
          path="/*"
          element={
            <div className="flex min-h-screen bg-background text-foreground">
              <SidebarProvider>
                <SideBar />
                <div className="flex-1 flex flex-col">
                  <NavBar />
                  <main className="flex-1 p-6">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/analyse" element={<Analyse />} />
                      <Route path="/apps" element={<Apps />} />
                      <Route path="/apps/new" element={<NewApp />} />
                      <Route path="/apps/:id" element={<AppDetails />} />
                      <Route path="/apps/sheetsmanager" element={<SheetsManager />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </main>
                </div>
              </SidebarProvider>
            </div>
          }
        />
      </Routes>

      <Toaster />
    </>
  );
}
