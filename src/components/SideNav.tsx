// File: src/components/SideNav.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  SlidersHorizontal,
  FolderOpen,
  FileText,
  Settings,
} from 'lucide-react'

const menuItems = [
  { href: '/',            label: 'Dashboard', icon: LayoutDashboard     },
  { href: '/variables',   label: 'Variables',  icon: SlidersHorizontal  },
  { href: '/projects',    label: 'Projects',   icon: FolderOpen         },
  { href: '/settings',    label: 'Settings',   icon: Settings           },
]

export function SideNav() {
  const pathname = usePathname()

  return (
    <aside className="w-64 h-full bg-[var(--sidebar)] text-[var(--sidebar-foreground)] p-4">
      <nav>
        <ul className="space-y-2">
          {menuItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={`
                    flex items-center p-2 rounded-md text-sm transition-colors
                    hover:bg-[var(--sidebar-accent)]
                    ${isActive ? 'bg-[var(--sidebar-accent)] font-semibold' : ''}
                  `}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  <span>{label}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
