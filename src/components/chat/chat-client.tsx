'use client'

import { useState, useEffect, useCallback } from 'react'
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
        // Get opponent participants (not current user)
        const { data: opponents } = await supabase
          .from('conversation_participants')
          .select('user_id, profiles(id, email, full_name, created_at)')
          .eq('conversation_id', conv.id)
          .neq('user_id', currentUser.id)
          .limit(1)
          .single()

        const rawProfile = opponents?.profiles as unknown
        const opponentProfile = Array.isArray(rawProfile)
          ? (rawProfile[0] as Profile | undefined) ?? null
          : (rawProfile as Profile | null)

        // Get last message
        const { data: lastMessages } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const lastMessage = lastMessages?.[0] ?? null

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
          unreadCount: 0,
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

  // ─── SUPABASE REALTIME SUBSCRIPTION ─────────────────────────────────────────
  useEffect(() => {
    if (!activeConversationId) return

    const channel = supabase
      .channel(`room:${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message
          // Only add if not already in list (avoid dupe from own send)
          setMessages((prev) =>
            prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
          )
          // Update conversation's last message in sidebar
          setConversations((prev) =>
            prev.map((c) =>
              c.id === activeConversationId
                ? { ...c, lastMessage: newMsg, updated_at: newMsg.created_at }
                : c
            )
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeConversationId])

  // ─── SELECT CONVERSATION ─────────────────────────────────────────────────────
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    setShowChatOnMobile(true)
  }

  // ─── SEND MESSAGE ────────────────────────────────────────────────────────────
  const handleSendMessage = async (content: string) => {
    if (!activeConversationId) return

    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: activeConversationId,
        sender_id: currentUser.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (!error && data) {
      const newMsg = data as Message
      // Optimistic update
      setMessages((prev) =>
        prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]
      )
      // Update sidebar
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, lastMessage: newMsg, updated_at: newMsg.created_at }
            : c
        )
      )
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
