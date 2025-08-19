// src/components/SideBar.tsx
import { NavLink, useLocation } from "react-router-dom"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  LayoutDashboard,
  SlidersHorizontal,
  AppWindowMac,
  Settings as SettingsIcon,
  Table,
} from "lucide-react"

const items = [
  { title: "Dashboard",    url: "/",             icon: LayoutDashboard },
  { title: "Analyse",      url: "/analyse",      icon: SlidersHorizontal },
  // NEW: Data Manager as a top-level entry (not under /apps)
  { title: "Data Manager", url: "/datamanager",  icon: Table },
  { title: "Apps",         url: "/apps",         icon: AppWindowMac },
  { title: "Settings",     url: "/settings",     icon: SettingsIcon },
]

export function SideBar() {
  const { pathname } = useLocation()

  return (
    <Sidebar side="left" variant="sidebar" className="bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="py-4 text-center">
        <span className="text-2xl font-bold">CodeFlex|Kubrik</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            {items.map(({ title, url, icon: Icon }) => {
              const isActive = pathname === url || pathname.startsWith(url + "/")
              return (
                <SidebarMenuItem key={title}>
                  <SidebarMenuButton asChild tooltip={title}>
                    <NavLink
                      to={url}
                      className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                        isActive
                          ? "bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] font-semibold"
                          : "hover:bg-[var(--sidebar-accent)]"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>{/* optional footer content */}</SidebarFooter>
    </Sidebar>
  )
}
