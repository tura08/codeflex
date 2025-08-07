// File: src/components/SideBar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
  SidebarHeader,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  SlidersHorizontal,
  AppWindowMac,
  Settings,
} from 'lucide-react'

const items = [
  { title: 'Dashboard',   url: '/',          icon: LayoutDashboard   },
  { title: 'Analyse',   url: '/analyse', icon: SlidersHorizontal },
  { title: 'Apps',        url: '/apps',      icon: AppWindowMac      },
  { title: 'Settings',    url: '/settings',  icon: Settings          },
]

export function SideBar() {
  const pathname = usePathname()

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="py-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link href="/">
                <span className="text-xl font-bold">CodeFlex</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarMenu>
            {items.map(({ title, url, icon: Icon }) => {
              const isActive = pathname === url
              return (
                <SidebarMenuItem key={title}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={url}
                      className={`flex items-center space-x-2 p-2 rounded-md transition-colors ${
                        isActive
                          ? 'bg-[var(--sidebar-accent)] font-semibold'
                          : 'hover:bg-[var(--sidebar-accent)]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* Optional footer for extras */}
      <SidebarFooter>
        {/* e.g. version info or a logout button */}
      </SidebarFooter>
    </Sidebar>
  )
}
