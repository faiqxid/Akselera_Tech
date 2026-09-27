'use client'

import { useEffect, useState } from 'react'
import { Download, X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallBanner, setShowInstallBanner] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    // 1. Register Service Worker
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[PWA] Service Worker registered with scope:', reg.scope)
        })
        .catch((err) => {
          console.error('[PWA] Service Worker registration failed:', err)
        })
    }

    // 2. Detect if already running in standalone PWA mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true

    setIsStandalone(isRunningStandalone)

    // 3. Detect iOS device
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iosDevice)

    // 4. Capture beforeinstallprompt for Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Only show banner if not already installed and not dismissed before
      const dismissed = localStorage.getItem('akselera_pwa_dismissed')
      if (!dismissed && !isRunningStandalone) {
        setShowInstallBanner(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShowInstallBanner(false)
      }
      setDeferredPrompt(null)
    } catch (err) {
      console.error('[PWA] Install prompt error:', err)
    }
  }

  const handleDismiss = () => {
    setShowInstallBanner(false)
    localStorage.setItem('akselera_pwa_dismissed', 'true')
  }

  // If already running standalone or no banner to show, return null
  if (isStandalone || !showInstallBanner) {
    return null
  }

  return (
    <aside
      aria-label="Pemberitahuan instalasi aplikasi"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 bg-black text-white dark:bg-neutral-900 border border-neutral-700 rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2.5 bg-neutral-800 dark:bg-neutral-800 rounded-xl shrink-0">
          <Smartphone className="h-5 w-5 text-neutral-200" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white tracking-tight">
            Install Akselera Chat
          </h4>
          <p className="text-xs text-neutral-400 mt-0.5 leading-relaxed">
            {isIOS
              ? 'Tekan tombol Bagikan (Share) di Safari lalu pilih "Tambahkan ke Layar Utama".'
              : 'Pasang aplikasi di layar utama ponsel untuk akses instan dan notifikasi.'}
          </p>

          {!isIOS && deferredPrompt && (
            <button
              type="button"
              onClick={handleInstallClick}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg hover:bg-neutral-200 transition cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              Install Sekarang
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Tutup pemberitahuan install"
          className="p-1 text-neutral-400 hover:text-white transition rounded-lg hover:bg-neutral-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  )
}
