'use client'

import { useState, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'

interface UseUserPresenceProps {
  supabase: SupabaseClient
  currentUserId: string
}

export function useUserPresence({
  supabase,
  currentUserId,
}: UseUserPresenceProps) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const channel = supabase
      .channel('online-users', {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const userIds = new Set(Object.keys(state))
        setOnlineUserIds(userIds)
      })
      .on('presence', { event: 'join' }, ({ key }) => {
        setOnlineUserIds((prev) => new Set([...prev, key]))
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        setOnlineUserIds((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUserId) {
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, supabase])

  return { onlineUserIds }
}
