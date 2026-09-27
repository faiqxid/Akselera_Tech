'use client'

import Image from 'next/image'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

interface BrandLogoProps {
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export function BrandLogo({
  className = '',
  width = 180,
  height = 40,
  priority = true,
}: BrandLogoProps) {
  const { theme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Avoid hydration mismatch by rendering a safe default or placeholder
  const isDark = mounted ? (resolvedTheme || theme) === 'dark' : false

  return (
    <div className={`relative flex items-center ${className}`}>
      <Image
        src={isDark ? '/assets/logo-white.png' : '/assets/logo-dark.png'}
        alt="Akselera.Tech Logo"
        width={width}
        height={height}
        className="h-8 md:h-10 w-auto object-contain"
        priority={priority}
      />
    </div>
  )
}
