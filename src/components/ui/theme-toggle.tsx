'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

const emptySubscribe = () => () => {}

export function ThemeToggle() {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
  const { setTheme, resolvedTheme } = useTheme()

  if (!isClient) {
    return (
      <div
        className="flex items-center gap-2.5 text-sm font-medium text-neutral-400 opacity-60"
        aria-hidden="true"
      >
        <div className="w-11 h-6 rounded-full bg-neutral-200 dark:bg-neutral-800 p-1 flex items-center">
          <div className="w-4 h-4 rounded-full bg-white dark:bg-neutral-600 shadow-xs" />
        </div>
      </div>
    )
  }

  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
      aria-label={isDark ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
      role="switch"
      aria-checked={isDark}
    >
      <span className="select-none text-xs md:text-sm font-semibold flex items-center gap-1.5">
        {isDark ? (
          <>
            <Moon className="w-3.5 h-3.5 text-neutral-300" />
            Dark mode
          </>
        ) : (
          <>
            <Sun className="w-3.5 h-3.5 text-amber-500" />
            Light mode
          </>
        )}
      </span>
      <div
        className={`relative w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${
          isDark ? 'bg-neutral-700' : 'bg-neutral-300'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${
            isDark ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </div>
    </button>
  )
}
