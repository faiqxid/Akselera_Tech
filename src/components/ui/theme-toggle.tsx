'use client'

import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  // next-themes guarantees resolvedTheme is defined client-side;
  // no mounted dance needed — SSR renders a neutral skeleton via suppressHydrationWarning
  const isDark = (resolvedTheme ?? theme) === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center gap-2.5 text-sm font-medium text-neutral-800 dark:text-neutral-200 hover:opacity-80 transition-opacity focus:outline-none"
      aria-label="Toggle dark/light mode"
      suppressHydrationWarning
    >
      <span className="select-none text-xs md:text-sm" suppressHydrationWarning>
        {isDark ? 'Dark mode' : 'Light mode'}
      </span>
      <div
        className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-200 cursor-pointer ${
          isDark ? 'bg-neutral-700 justify-end' : 'bg-neutral-300 justify-start'
        }`}
      >
        <div className="w-4 h-4 rounded-full shadow-md bg-white transform transition-transform duration-200" />
      </div>
    </button>
  )
}
