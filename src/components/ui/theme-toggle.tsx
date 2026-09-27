'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-sm text-neutral-500">
        <span className="w-20 h-4 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="w-11 h-6 bg-neutral-200 dark:bg-neutral-800 rounded-full animate-pulse" />
      </div>
    )
  }

  const isDark = (resolvedTheme || theme) === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:opacity-80 transition-opacity focus:outline-none"
      aria-label="Toggle dark/light mode"
    >
      <span className="select-none text-xs md:text-sm">
        {isDark ? 'Dark mode' : 'Light mode'}
      </span>
      <div
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
          isDark ? 'bg-neutral-700 justify-end' : 'bg-neutral-300 justify-start'
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
            isDark ? 'bg-white' : 'bg-white'
          }`}
        />
      </div>
    </button>
  )
}
