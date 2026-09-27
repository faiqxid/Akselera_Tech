'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { BrandLogo } from '@/components/ui/brand-logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok')
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const cleanEmail = email.trim()
      const cleanName = fullName.trim()

      // 1. Try standard Supabase Auth signUp
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      })

      if (!signUpError && data?.session) {
        router.push('/')
        router.refresh()
        return
      }

      if (!signUpError && data?.user) {
        setSuccess('Pendaftaran berhasil! Silakan login dengan akun Anda.')
        setTimeout(() => {
          router.push('/login')
        }, 1200)
        return
      }

      // 2. If signUp returned an error (e.g. email_address_invalid, rate limit 429)
      if (signUpError) {
        // Attempt RPC fallback for custom domains (@contoh.id) or rate-limited projects
        const { error: rpcError } = await supabase.rpc('register_user', {
          user_email: cleanEmail,
          user_password: password,
          user_full_name: cleanName,
        })

        if (!rpcError) {
          // RPC succeeded! Try auto login
          const { error: loginError } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          })

          if (!loginError) {
            router.push('/')
            router.refresh()
            return
          }

          setSuccess('Pendaftaran berhasil! Silakan login dengan akun Anda.')
          setTimeout(() => {
            router.push('/login')
          }, 1200)
          return
        }

        // 3. Format friendly error message
        let msg = signUpError.message || rpcError?.message || 'Pendaftaran gagal'
        if (msg.includes('invalid') || msg.includes('email_address_invalid')) {
          msg =
            'Domain email tidak dikenal/valid. Gunakan domain email umum (misal @gmail.com) atau jalankan update schema.sql terbaru di Supabase SQL Editor.'
        } else if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit')) {
          msg =
            'Batas pengiriman email terlampaui. Harap matikan "Confirm email" di Supabase Dashboard (Authentication -> Email Provider) atau gunakan RPC schema.sql.'
        } else if (
          msg.includes('already registered') ||
          msg.includes('Email sudah terdaftar') ||
          msg.includes('already exists')
        ) {
          msg = 'Email ini sudah terdaftar. Silakan gunakan menu Masuk.'
        }

        setError(msg)
        setLoading(false)
        return
      }
    } catch {
      setError('Terjadi kesalahan jaringan. Coba lagi nanti.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-black text-black dark:text-white transition-colors duration-200">
      {/* Top Header */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800">
        <BrandLogo />
        <ThemeToggle />
      </header>

      {/* Main Form Center */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold mb-6 text-black dark:text-white">
            Daftar Akun Baru
          </h1>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl text-amber-800 dark:text-amber-200 text-sm font-medium animate-in fade-in duration-200"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              role="alert"
              className="mb-5 flex items-center gap-2.5 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 rounded-xl text-emerald-800 dark:text-emerald-200 text-sm font-medium animate-in fade-in duration-200"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-semibold mb-1.5 text-neutral-700 dark:text-neutral-300"
              >
                Nama Lengkap
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="cth. Andi Pratama"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold mb-1.5 text-neutral-700 dark:text-neutral-300"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="andi@contoh.id"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold mb-1.5 text-neutral-700 dark:text-neutral-300"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold mb-1.5 text-neutral-700 dark:text-neutral-300"
              >
                Konfirmasi Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Daftar Sekarang
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-800 text-center text-sm text-neutral-500">
            Sudah punya akun?{' '}
            <Link
              href="/login"
              className="font-semibold text-black dark:text-white underline hover:opacity-80"
            >
              Masuk di sini
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
