import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ChatClient } from '@/components/chat/chat-client'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('id', user.id)
    .single()

  const currentUser = {
    id: user.id,
    email: user.email ?? '',
    full_name: profile?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User',
  }

  return <ChatClient currentUser={currentUser} />
}
