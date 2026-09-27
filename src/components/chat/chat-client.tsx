'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopHeader } from '@/components/chat/top-header'
import { Sidebar } from '@/components/chat/sidebar'
import { ChatRoom } from '@/components/chat/chat-room'
import { EmptyChat } from '@/components/chat/empty-chat'
import { NewChatModal } from '@/components/chat/new-chat-modal'
import { ConversationItem, Message, Profile } from '@/types/chat'

interface ChatClientProps {
  currentUser: {
    id: string
    email?: string | null
    full_name?: string | null
  }
}

export function ChatClient({ currentUser }: ChatClientProps) {
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)

  // Track unread counts per conversation in a ref so realtime listener has latest value
  const unreadRef = useRef<Record<string, number>>({})
  const activeConvRef = useRef<string | null>(null)

  const supabase = createClient()

  // ─── FETCH CONVERSATIONS ────────────────────────────────────────────────────
  const fetchConversations = useCallback(async () => {
    setLoadingConvs(true)

    const { data: participantRows, error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', currentUser.id)

    if (error || !participantRows?.length) {
      setConversations([])
      setLoadingConvs(false)
      return
    }

    const convIds = participantRows.map((r) => r.conversation_id)

    // Fetch full conversation info with opponent profiles and last message
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, created_at, updated_at')
      .in('id', convIds)
      .order('updated_at', { ascending: false })

    if (!convData) {
      setConversations([])
      setLoadingConvs(false)
      return
    }

    // For each conversation, get opponent profile and last message
    const enriched: ConversationItem[] = await Promise.all(
      convData.map(async (conv) => {
        // Get opponent participant user_id
        const { data: opponentPart } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conv.id)
          .neq('user_id', currentUser.id)
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

        // Get my participant record for last_read_at
        const { data: myPart } = await supabase
          .from('conversation_participants')
          .select('last_read_at')
          .eq('conversation_id', conv.id)
          .eq('user_id', currentUser.id)
          .single()

        const lastReadAt = myPart?.last_read_at ?? '1970-01-01T00:00:00.000Z'

        // Get last message
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMessage = lastMessages?.[0] ?? null

        // Count unread messages (messages sent by opponent after my last_read_at)
        const isCurrentlyActive = conv.id === activeConvRef.current
        let unreadCount = 0

        if (!isCurrentlyActive) {
          const { count } = await supabase
            .from('messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', currentUser.id)
            .gt('created_at', lastReadAt)

          unreadCount = count ?? 0
        }

        unreadRef.current[conv.id] = unreadCount

        return {
          id: conv.id,
          created_at: conv.created_at,
          updated_at: conv.updated_at,
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

    setConversations(enriched)
    setLoadingConvs(false)
  }, [currentUser.id])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  // ─── FETCH MESSAGES FOR ACTIVE CONVERSATION ─────────────────────────────────
  const fetchMessages = useCallback(
    async (conversationId: string) => {
      setLoadingMessages(true)
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      setMessages((data as Message[]) ?? [])
      setLoadingMessages(false)
    },
    []
  )

  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }
    fetchMessages(activeConversationId)
  }, [activeConversationId, fetchMessages])

  // ─── MARK AS READ HELPER ───────────────────────────────────────────────────
  const markAsRead = useCallback(
    async (convId: string) => {
      unreadRef.current[convId] = 0
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, unreadCount: 0 } : c))
      )
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', convId)
        .eq('user_id', currentUser.id)
    },
    [currentUser.id, supabase]
  )

  useEffect(() => {
    activeConvRef.current = activeConversationId
  }, [activeConversationId])

  // ─── SUPABASE REALTIME SUBSCRIPTION (GLOBAL MESSAGES FEED) ──────────────────
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

          // 1. If message belongs to current open chat
          if (newMsg.conversation_id === activeConvRef.current) {
            setMessages((prev) =>
              prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
            )
            // Mark as read immediately if from opponent
            if (newMsg.sender_id !== currentUser.id) {
              markAsRead(newMsg.conversation_id)
            }
          }

          // 2. Update conversation list in sidebar + unread counter
          setConversations((prev) => {
            const exists = prev.some((c) => c.id === newMsg.conversation_id)

            if (!exists) {
              // New conversation created by opponent
              fetchConversations()
              return prev
            }

            const updated = prev.map((c) => {
              if (c.id === newMsg.conversation_id) {
                const isActive = c.id === activeConvRef.current
                const isFromOpponent = newMsg.sender_id !== currentUser.id
                const currentUnread = c.unreadCount ?? 0
                const newUnread =
                  !isActive && isFromOpponent ? currentUnread + 1 : 0

                unreadRef.current[c.id] = newUnread

                return {
                  ...c,
                  lastMessage: newMsg,
                  updated_at: newMsg.created_at,
                  unreadCount: newUnread,
                }
              }
              return c
            })

            // Sort so the conversation with newest message is at top (like WhatsApp)
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

          // Update messages list if active
          setMessages((prev) =>
            prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m))
          )

          // Update sidebar lastMessage if it matches
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
  }, [currentUser.id, fetchConversations, markAsRead, supabase])

  // ─── SELECT CONVERSATION ─────────────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    activeConvRef.current = id
    setActiveConversationId(id)
    setShowChatOnMobile(true)
    markAsRead(id)
  }

  // ─── SEND MESSAGE (TEXT / FILE / IMAGE) ───────────────────────────────────
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
      sender_id: currentUser.id,
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
      // Optimistic update
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
      )
      // Update sidebar and sort to top
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

  // ─── START NEW CHAT ──────────────────────────────────────────────────────────
  const handleStartChat = async (opponentId: string) => {
    try {
      const { data: convId, error } = await supabase.rpc(
        'create_or_get_conversation',
        {
          opponent_id: opponentId,
        }
      )

      if (error || !convId) {
        console.error('Error starting conversation:', error)
        return
      }

      await fetchConversations()
      handleSelectConversation(convId as string)
    } catch (err) {
      console.error('Failed to create or get conversation:', err)
    }
  }

  // ─── UNSEND MESSAGE ────────────────────────────────────────────────────────
  const handleUnsendMessage = async (msgId: string) => {
    // Optimistic UI update
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
      // Fallback update
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
        .eq('sender_id', currentUser.id)
    }
  }

  // ─── DELETE ENTIRE CONVERSATION ─────────────────────────────────────────────
  const handleDeleteConversation = async (convId: string) => {
    // Optimistic UI update
    setConversations((prev) => prev.filter((c) => c.id !== convId))
    if (activeConversationId === convId) {
      setActiveConversationId(null)
      setShowChatOnMobile(false)
    }

    const { error } = await supabase.rpc('delete_conversation', { conv_id: convId })
    if (error) {
      // Fallback direct delete
      await supabase.from('conversations').delete().eq('id', convId)
    }
  }

  const activeConversation = conversations.find(
    (c) => c.id === activeConversationId
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-white dark:bg-black">
      {/* Global Header */}
      <TopHeader
        user={{
          id: currentUser.id,
          email: currentUser.email,
          full_name: currentUser.full_name,
        }}
      />

      {/* New Chat Modal */}
      <NewChatModal
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        currentUserId={currentUser.id}
        onStartChat={handleStartChat}
      />

      {/* Main Chat Area: 2-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - hidden on mobile when chat is active */}
        <div
          className={`h-full ${showChatOnMobile && activeConversationId ? 'hidden md:flex' : 'flex w-full md:w-auto'}`}
        >
          <Sidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onOpenNewChatModal={() => setIsNewChatModalOpen(true)}
            loading={loadingConvs}
          />
        </div>

        {/* Right Panel */}
        <div
          className={`flex-1 overflow-hidden ${showChatOnMobile && activeConversationId ? 'flex flex-col w-full md:w-auto' : 'hidden md:flex'}`}
        >
          {activeConversation ? (
            <ChatRoom
              conversationId={activeConversationId!}
              opponent={activeConversation.opponent}
              currentUserId={currentUser.id}
              messages={messages}
              onSendMessage={handleSendMessage}
              onUnsendMessage={handleUnsendMessage}
              onDeleteConversation={handleDeleteConversation}
              onBackToSidebar={() => setShowChatOnMobile(false)}
              loading={loadingMessages}
            />
          ) : (
            <EmptyChat onOpenNewChatModal={() => setIsNewChatModalOpen(true)} />
          )}
        </div>
      </div>
    </div>
  )
}
