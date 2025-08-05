// File: src/components/TopNav.tsx
'use client'

import Link from 'next/link'
import { useTheme } from 'next-themes'
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
import { Sun, Moon, Plus } from 'lucide-react'

export function TopNav() {
  const { theme, setTheme } = useTheme()
  const toggle = () => setTheme(theme === 'light' ? 'dark' : 'light')

  return (
    <header
      className="
        h-16 px-4 flex items-center justify-between
        bg-secondary
        dark:bg-secondary dark:text-black
      "
    >
      {/* Brand + NavigationMenu */}
      <div className="flex items-center space-x-8">
        <Link href="/" className="text-xl font-bold">
          Difficulty Estimator
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Dashboard</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink asChild>
                  <Link href="/">Go to Dashboard</Link>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Projects</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink asChild>
                  <Link href="/projects">All Projects</Link>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Templates</NavigationMenuTrigger>
              <NavigationMenuContent>
                <NavigationMenuLink asChild>
                  <Link href="/templates">Browse Templates</Link>
                </NavigationMenuLink>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
          <NavigationMenuViewport />
        </NavigationMenu>
      </div>

      {/* Actions: theme toggle + new project */}
      <div className="flex items-center space-x-2">
        <Button className='bg-secondary' variant="ghost" size="icon" onClick={toggle}>
          {theme === 'light' ? <Moon /> : <Sun />}
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/projects/new" className="flex items-center space-x-1">
            <Plus className="h-4 w-4" />
            <span>New Project</span>
          </Link>
        </Button>
      </div>
    </header>
)
}
