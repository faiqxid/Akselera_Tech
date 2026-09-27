import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request)

  const pathname = request.nextUrl.pathname

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isPublicAsset = pathname.startsWith('/assets') || pathname.startsWith('/_next') || pathname === '/favicon.ico'

  if (isPublicAsset) {
    return supabaseResponse
  }

  // 1. Redirect unauthenticated users away from chat dashboard
  if (!user && !isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // 2. Redirect authenticated users away from auth pages (login/register) to dashboard
  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
