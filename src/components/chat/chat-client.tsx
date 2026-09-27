'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TopHeader } from '@/components/chat/top-header'
import { Sidebar } from '@/components/chat/sidebar'
import { ChatRoom } from '@/components/chat/chat-room'
import { EmptyChat } from '@/components/chat/empty-chat'
import { NewChatModal } from '@/components/chat/new-chat-modal'
import { useChatConversations } from '@/hooks/use-chat-conversations'
import { useChatRealtime } from '@/hooks/use-chat-realtime'

interface ChatClientProps {
  currentUser: {
    id: string
    email?: string | null
    full_name?: string | null
  }
}

export function ChatClient({ currentUser }: ChatClientProps) {
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false)
  const [showChatOnMobile, setShowChatOnMobile] = useState(false)

  const supabase = createClient()

  const {
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
  } = useChatConversations({
    supabase,
    currentUserId: currentUser.id,
  })

  useChatRealtime({
    supabase,
    currentUserId: currentUser.id,
    activeConversationId,
    conversations,
    setMessages,
    setConversations,
    fetchConversations,
    markAsRead,
    setActiveConversationId,
    setShowChatOnMobile,
  })

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id)
    setShowChatOnMobile(true)
    markAsRead(id)
    fetchMessages(id)
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
        onStartChat={(oppId) =>
          handleStartChat(oppId, (newConvId) => handleSelectConversation(newConvId))
        }
      />

      {/* Main Chat Area: 2-Panel Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
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
              onDeleteConversation={(id) =>
                handleDeleteConversation(id, () => setShowChatOnMobile(false))
              }
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

