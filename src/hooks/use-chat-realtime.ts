'use client'

import { useEffect, useRef } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { Message, ConversationItem } from '@/types/chat'

interface UseChatRealtimeProps {
  supabase: SupabaseClient
  currentUserId: string
  activeConversationId: string | null
  conversations: ConversationItem[]
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>
  setConversations: React.Dispatch<React.SetStateAction<ConversationItem[]>>
  fetchConversations: () => Promise<void>
  markAsRead: (convId: string) => Promise<void>
  setActiveConversationId: (id: string | null) => void
  setShowChatOnMobile: (show: boolean) => void
}

export function useChatRealtime({
  supabase,
  currentUserId,
  activeConversationId,
  conversations,
  setMessages,
  setConversations,
  fetchConversations,
  markAsRead,
  setActiveConversationId,
  setShowChatOnMobile,
}: UseChatRealtimeProps) {
  const activeConvRef = useRef<string | null>(activeConversationId)
  const conversationsRef = useRef<ConversationItem[]>(conversations)

  useEffect(() => {
    activeConvRef.current = activeConversationId
  }, [activeConversationId])

  useEffect(() => {
    conversationsRef.current = conversations
  }, [conversations])

  useEffect(() => {
    const channel = supabase
      .channel('global:messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const newMsg = payload.new as Message

          // If message belongs to current open chat
          if (newMsg.conversation_id === activeConvRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
            )
            // Mark as read immediately if from opponent
            if (newMsg.sender_id !== currentUserId) {
              markAsRead(newMsg.conversation_id)
            }
          }

          // Check if conversation exists outside updater
          const exists = conversationsRef.current.some(
            (c) => c.id === newMsg.conversation_id
          )
          if (!exists) {
            fetchConversations()
            return
          }

          setConversations((prev) => {
            const updated = prev.map((c) => {
              if (c.id === newMsg.conversation_id) {
                const isActive = c.id === activeConvRef.current
                const isFromOpponent = newMsg.sender_id !== currentUserId
                const currentUnread = c.unreadCount ?? 0
                const newUnread =
                  !isActive && isFromOpponent ? currentUnread + 1 : 0

                return {
                  ...c,
                  lastMessage: newMsg,
                  updated_at: newMsg.created_at,
                  unreadCount: newUnread,
                }
              }
              return c
            })

            return [...updated].sort(
              (a, b) =>
                new Date(b.lastMessage?.created_at || b.updated_at).getTime() -
                new Date(a.lastMessage?.created_at || a.updated_at).getTime()
            )
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updatedMsg = payload.new as Message

          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          )

          setConversations((prev) =>
            prev.map((c) =>
              c.lastMessage?.id === updatedMsg.id
                ? { ...c, lastMessage: updatedMsg }
                : c
            )
          )
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversation_participants',
        },
        (payload) => {
          const updatedPart = payload.new as {
            conversation_id: string
            user_id: string
            last_read_at: string
          }

          if (updatedPart.user_id !== currentUserId) {
            setConversations((prev) =>
              prev.map((c) =>
                c.id === updatedPart.conversation_id
                  ? { ...c, opponentLastReadAt: updatedPart.last_read_at }
                  : c
              )
            )
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          const deletedId = (payload.old as { id?: string })?.id
          if (deletedId) {
            setConversations((prev) => prev.filter((c) => c.id !== deletedId))
            if (activeConvRef.current === deletedId) {
              setActiveConversationId(null)
              setShowChatOnMobile(false)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [
    currentUserId,
    fetchConversations,
    markAsRead,
    setActiveConversationId,
    setConversations,
    setMessages,
    setShowChatOnMobile,
    supabase,
  ])
}
