import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import "./index.css"
import App from "./App"

import { ThemeProvider } from "@/providers/ThemeProvider"
import { ProjectProvider } from "./context/ProjectContext"
import { AuthProvider } from "./context/AuthContext"


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProjectProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </ProjectProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>
)
