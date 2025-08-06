// File: src/components/TopNav.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
  NavigationMenuViewport,
} from '@/components/ui/navigation-menu'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Plus, Settings, LogOut, Icon } from 'lucide-react'
import { SidebarTrigger } from './ui/sidebar'

export function NavBar() {
  return (
    <header
      className="
        p-4 mb-4 flex items-center justify-between
        bg-sidebar text-sidebar-foreground
        dark:bg-secondary dark:text-black
      "
    >
      <SidebarTrigger />

      {/* Actions: theme toggle + new app + user menu */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/apps/new" className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>New App</span>
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-8 h-8 rounded-full overflow-hidden focus:ring-2 ring-offset-2 ring-[var(--ring)]">
              <Image
                src="https://github.com/tura08.png"
                alt="User Avatar"
                width={32}
                height={32}
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center space-x-2">
                <Settings className="text-background h-4 w-4" />
                <span>Settings</span>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/logout" className="flex items-center space-x-2">
                <LogOut className="text-background h-4 w-4" />
                <span>Logout</span>
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
)
}
