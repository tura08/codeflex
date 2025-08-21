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
import Datasets from "@/pages/DataManager/view/Datasets";
import ImportPage from "./pages/DataManager/import/ImportPage";
import SheetsShell from "./pages/DataManager/layout/DataShell";
import ViewPage from "./pages/DataManager/view/ViewPage";
import DatasetDetail from "./pages/DataManager/view/DatasetDetail";

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

                      {/* DataManager app routes */}
                      <Route path="/datamanager/*" element={<SheetsShell />}>
                        <Route index element={<ImportPage />} />
                        <Route path="view" element={<ViewPage />} />
                        <Route path="view/datasets" element={<Datasets />} />
                        <Route path="view/datasets/:id" element={<DatasetDetail />} />
                      </Route>

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
