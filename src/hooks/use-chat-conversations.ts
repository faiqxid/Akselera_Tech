'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { ConversationItem, Message, Profile } from '@/types/chat'

interface UseChatConversationsProps {
  supabase: SupabaseClient
  currentUserId: string
}

function getStoragePathFromUrl(fileUrl: string): string | null {
  try {
    const marker = '/chat-attachments/'
    const index = fileUrl.indexOf(marker)
    if (index !== -1) {
      return decodeURIComponent(fileUrl.substring(index + marker.length))
    }
  } catch (err) {
    console.error('Failed to parse storage path:', err)
  }
  return null
}

export function useChatConversations({
  supabase,
  currentUserId,
}: UseChatConversationsProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)

  const activeConvRef = useRef<string | null>(null)

  useEffect(() => {
    activeConvRef.current = activeConversationId
  }, [activeConversationId])

  // ─── FETCH CONVERSATIONS ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true)
    try {
      const { data: participantRows, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at, cleared_at')
        .eq('user_id', currentUserId)

      if (error || !participantRows?.length) {
        setConversations([])
        return
      }

      const convIds = participantRows.map((r) => r.conversation_id)

      const { data: convData } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at')
        .in('id', convIds)
        .order('updated_at', { ascending: false })

      if (!convData) {
        setConversations([])
        return
      }

      const myPartMap = new Map(
        participantRows.map((r) => [r.conversation_id, r])
      )

      const enriched = await Promise.all(
        convData.map(async (conv) => {
          const myPart = myPartMap.get(conv.id)
          const lastReadAt = myPart?.last_read_at ?? '1970-01-01T00:00:00.000Z'
          const clearedAt = myPart?.cleared_at ?? null

          const { data: opponentPart } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', currentUserId)
            .maybeSingle()

          let opponentProfile: Profile | null = null

          if (opponentPart?.user_id) {
            const { data: prof } = await supabase
              .from('profiles')
              .select('id, email, full_name, created_at')
              .eq('id', opponentPart.user_id)
              .maybeSingle()

            opponentProfile = prof
          }

          let msgQuery = supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)

          if (clearedAt) {
            msgQuery = msgQuery.gt('created_at', clearedAt)
          }

          const { data: lastMessages } = await msgQuery
            .order('created_at', { ascending: false })
            .limit(1)

          const lastMessage = lastMessages?.[0] ?? null

          if (clearedAt && !lastMessage) {
            return null
          }

          const isCurrentlyActive = conv.id === activeConvRef.current
          let unreadCount = 0

          if (!isCurrentlyActive) {
            let unreadQuery = supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conv.id)
              .neq('sender_id', currentUserId)
              .gt('created_at', lastReadAt)

            if (clearedAt) {
              unreadQuery = unreadQuery.gt('created_at', clearedAt)
            }

            const { count } = await unreadQuery
            unreadCount = count ?? 0
          }

          return {
            id: conv.id,
            created_at: conv.created_at,
            updated_at: lastMessage?.created_at ?? conv.updated_at,
            opponent: opponentProfile ?? {
              id: '',
              email: 'Pengguna tidak ditemukan',
              full_name: 'Pengguna',
              created_at: '',
            },
            lastMessage,
            unreadCount,
          }
        })
      )

      const validConvs = enriched.filter(Boolean) as ConversationItem[]
      setConversations(validConvs)
    } finally {
      setLoadingConvs(false)
    }
  }, [currentUserId, supabase])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ─── FETCH MESSAGES ────────────────────────────────────────────────────────
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true)
      try {
        const { data: myPart } = await supabase
          .from('conversation_participants')
          .select('cleared_at')
          .eq('conversation_id', conversationId)
          .eq('user_id', currentUserId)
          .maybeSingle()

        let query = supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)

        if (myPart?.cleared_at) {
          query = query.gt('created_at', myPart.cleared_at)
        }

        const { data } = await query.order('created_at', { ascending: true })
        setMessages((data as Message[]) ?? [])
      } finally {
        setLoadingMessages(false)
      }
    },
    [currentUserId, supabase]
  )

  // ─── MARK AS READ ──────────────────────────────────────────────────────────
  const markAsRead = useCallback(
    async (convId: string) => {
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      )
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('user_id', currentUserId)
    },
    [currentUserId, supabase]
  )

  // ─── SEND MESSAGE ──────────────────────────────────────────────────────────
  const handleSendMessage = async (
    content: string,
    fileData?: { file_url: string; file_type: 'image' | 'file'; file_name: string } | null
  ) => {
    if (!activeConversationId) return

    const payload: {
      conversation_id: string
      sender_id: string
      content: string
      file_url?: string
      file_type?: string
      file_name?: string
    } = {
      conversation_id: activeConversationId,
      sender_id: currentUserId,
      content: content.trim(),
    }

    if (fileData) {
      payload.file_url = fileData.file_url
      payload.file_type = fileData.file_type
      payload.file_name = fileData.file_name
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(payload)
      .select()
      .single()

    if (!error && data) {
      const newMsg = data as Message
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
      )
      setConversations((prev) => {
        const updated = prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: newMsg, updated_at: newMsg.created_at }
            : c
        )
        return [...updated].sort(
          (a, b) =>
            new Date(b.lastMessage?.created_at || b.updated_at).getTime() -
            new Date(a.lastMessage?.created_at || a.updated_at).getTime()
        )
      })
    }
  }

  // ─── START NEW CHAT ────────────────────────────────────────────────────────
  const handleStartChat = async (
    opponentId: string,
    onSuccess?: (convId: string) => void
  ) => {
    try {
      const { data: convId, error } = await supabase.rpc(
        'create_or_get_conversation',
        { opponent_id: opponentId }
      )

      if (error || !convId) {
        console.error('Error starting conversation:', error)
        return
      }

      await fetchConversations()
      onSuccess?.(convId as string)
    } catch (err) {
      console.error('Failed to create or get conversation:', err)
    }
  }

  // ─── UNSEND MESSAGE ────────────────────────────────────────────────────────
  const handleUnsendMessage = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId)
    if (targetMsg?.file_url) {
      const storagePath = getStoragePathFromUrl(targetMsg.file_url)
      if (storagePath) {
        await supabase.storage.from('chat-attachments').remove([storagePath])
      }
    }

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              is_deleted: true,
              content: 'Pesan ini telah ditarik',
              file_url: null,
              file_type: null,
              file_name: null,
            }
          : m
      )
    )

    setConversations((prev) =>
      prev.map((c) =>
        c.lastMessage?.id === msgId
          ? {
              ...c,
              lastMessage: {
                ...c.lastMessage,
                is_deleted: true,
                content: 'Pesan ini telah ditarik',
                file_url: null,
                file_type: null,
                file_name: null,
              },
            }
          : c
      )
    )

    const { error } = await supabase.rpc('unsend_message', { msg_id: msgId })
    if (error) {
      await supabase
        .from('messages')
        .update({
          is_deleted: true,
          content: 'Pesan ini telah ditarik',
          file_url: null,
          file_type: null,
          file_name: null,
        })
        .eq('id', msgId)
        .eq('sender_id', currentUserId)
    }
  }

  // ─── DELETE / CLEAR CONVERSATION FOR ME ────────────────────────────────────
  const handleDeleteConversation = async (
    convId: string,
    onAfterDelete?: () => void
  ) => {
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    if (activeConversationId === convId) {
      setActiveConversationId(null)
      onAfterDelete?.()
    }

    const { error } = await supabase.rpc('delete_conversation', { conv_id: convId })
    if (error) {
      await supabase
        .from('conversation_participants')
        .update({ cleared_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('user_id', currentUserId)
    }
  }

  return {
    conversations,
    setConversations,
    activeConversationId,
    setActiveConversationId,
    messages,
    setMessages,
    loadingConvs,
    loadingMessages,
    fetchConversations,
    fetchMessages,
    markAsRead,
    handleSendMessage,
    handleStartChat,
    handleUnsendMessage,
    handleDeleteConversation,
  }
}
