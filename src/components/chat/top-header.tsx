'use client'

import { BrandLogo } from '@/components/ui/brand-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getInitials } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useState } from 'react'

interface TopHeaderProps {
  user: {
    id: string
    email?: string | null
    full_name?: string | null
  }
}

export function TopHeader({ user }: TopHeaderProps) {
  const router = useRouter()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = getInitials(user.full_name || user.email || 'User')

  return (
    <header className="w-full h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black px-4 md:px-6 flex items-center justify-between z-10 transition-colors shrink-0">
      {/* Brand Logo */}
      <BrandLogo />

      {/* Right controls */}
      <div className="flex items-center gap-4 md:gap-6">
        <ThemeToggle />

        <div className="h-5 w-[1px] bg-neutral-200 dark:bg-neutral-800" />

        {/* User Info & Avatar */}
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-block text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {user.full_name || user.email?.split('@')[0]}
          </span>
          <div
            title={user.full_name || user.email || ''}
            className="w-9 h-9 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center text-xs font-bold ring-1 ring-neutral-300 dark:ring-neutral-700"
          >
            {initials}
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Keluar / Logout"
            className="p-1.5 text-neutral-500 hover:text-red-600 dark:hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-900 focus:outline-none"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
