import { NavLink, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Plus, Settings, LogOut } from "lucide-react"
import { useCallback } from "react"
import { useAuth } from "@/context/AuthContext" // <-- import

/** Provider-free theme toggle: flips `.dark` on <html> */
function ThemeToggleLocal() {
  const setLight = useCallback(() => {
    document.documentElement.classList.remove("dark")
  }, [])
  const setDark = useCallback(() => {
    document.documentElement.classList.add("dark")
  }, [])
  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={setLight} className="cursor-pointer">
        Light
      </Button>
      <Button size="sm" variant="secondary" onClick={setDark} className="cursor-pointer">
        Dark
      </Button>
    </div>
  )
}

export function NavBar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await signOut()
      navigate("/login")
    } catch (err) {
      console.error("Logout failed:", err)
    }
  }

  return (
    <header
      className="
        p-4 flex items-center justify-between
        bg-sidebar text-sidebar-foreground
        dark:bg-secondary
      "
    >
      {/* left: sidebar toggle */}
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>

      {/* right: actions */}
      <div className="flex items-center gap-4">
        <ThemeToggleLocal />

        <Button variant="outline" size="sm" asChild className="cursor-pointer">
          <NavLink to="/apps/new" className="flex items-center gap-1">
            <Plus className="h-4 w-4" />
            <span>New App</span>
          </NavLink>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full overflow-hidden focus:ring-2 ring-offset-2 ring-[var(--ring)]">
              <img
                src="https://github.com/tura08.png"
                alt="User Avatar"
                width={32}
                height={32}
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8} className="w-48">
            <DropdownMenuItem asChild>
              <NavLink to="/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout} // <-- logout here
              className="flex items-center gap-2 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
