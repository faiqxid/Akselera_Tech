'use client'

import Image from 'next/image'

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
  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Light mode logo */}
      <Image
        src="/assets/logo-dark.png"
        alt="Akselera.Tech Logo"
        width={width}
        height={height}
        className="h-8 md:h-10 w-auto object-contain dark:hidden"
        priority={priority}
      />
      {/* Dark mode logo */}
      <Image
        src="/assets/logo-white.png"
        alt="Akselera.Tech Logo"
        width={width}
        height={height}
        className="h-8 md:h-10 w-auto object-contain hidden dark:block"
        priority={priority}
      />
    </div>
  )
}
