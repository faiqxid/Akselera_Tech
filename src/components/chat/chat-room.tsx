'use client'

import { useState, useEffect, useRef } from 'react'
import { Profile, Message } from '@/types/chat'
import { getInitials, formatDividerDate } from '@/lib/utils'
import {
  ArrowLeft,
  Loader2,
  Trash2,
  MoreVertical,
} from 'lucide-react'
import { MessageBubble } from './message-bubble'
import { MessageInput } from './message-input'
import { DeleteChatModal } from './delete-chat-modal'
import { ImageLightboxModal } from './image-lightbox-modal'

interface ChatRoomProps {
  conversationId: string
  opponent: Profile
  currentUserId: string
  messages: Message[]
  isOpponentOnline?: boolean
  onSendMessage: (
    content: string,
    fileData?: { file_url: string; file_type: 'image' | 'file'; file_name: string } | null
  ) => Promise<void>
  onUnsendMessage: (msgId: string) => Promise<void>
  onDeleteConversation: (convId: string) => Promise<void>
  onBackToSidebar?: () => void
  loading?: boolean
}

export function ChatRoom({
  conversationId,
  opponent,
  currentUserId,
  messages,
  isOpponentOnline = false,
  onSendMessage,
  onUnsendMessage,
  onDeleteConversation,
  onBackToSidebar,
  loading = false,
}: ChatRoomProps) {
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null)
  const [unsendingMsgId, setUnsendingMsgId] = useState<string | null>(null)
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Close header menu on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setShowHeaderMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleUnsend = async (msgId: string) => {
    if (!confirm('Tarik pesan ini untuk semua orang?')) return
    setUnsendingMsgId(msgId)
    setHoveredMsgId(null)
    try {
      await onUnsendMessage(msgId)
    } finally {
      setUnsendingMsgId(null)
    }
  }

  const handleDeleteConv = async () => {
    setShowDeleteConfirm(false)
    await onDeleteConversation(conversationId)
  }

  const dateDividerLabel =
    messages.length > 0
      ? formatDividerDate(messages[0].created_at)
      : 'Hari ini'

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-hidden select-none">
      {/* Modals */}
      <DeleteChatModal
        isOpen={showDeleteConfirm}
        opponentName={opponent.full_name}
        onConfirm={handleDeleteConv}
        onClose={() => setShowDeleteConfirm(false)}
      />

      <ImageLightboxModal
        imageUrl={previewImageModalUrl}
        onClose={() => setPreviewImageModalUrl(null)}
      />

      {/* Chat Room Header */}
      <div className="h-16 px-4 md:px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {onBackToSidebar && (
            <button
              type="button"
              onClick={onBackToSidebar}
              className="md:hidden p-1.5 -ml-1 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
              aria-label="Kembali ke daftar chat"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Opponent Avatar with Online Badge */}
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold flex items-center justify-center text-sm border border-neutral-300 dark:border-neutral-700">
              {getInitials(opponent.full_name)}
            </div>
            {isOpponentOnline && (
              <span
                className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-black rounded-full"
                title="Online"
                aria-label="Online"
              />
            )}
          </div>

          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-bold text-black dark:text-white truncate leading-tight">
              {opponent.full_name}
            </h2>
            <div className="flex items-center gap-1.5 text-xs truncate mt-0.5">
              {isOpponentOnline ? (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online
                </span>
              ) : (
                <span className="text-neutral-400 dark:text-neutral-500 text-[11px]">
                  Offline
                </span>
              )}
              <span className="text-neutral-300 dark:text-neutral-700">•</span>
              <span className="text-neutral-500 text-[11px] truncate">
                {opponent.email}
              </span>
            </div>
          </div>
        </div>

        {/* Header Menu */}
        <div className="relative" ref={headerMenuRef}>
          <button
            type="button"
            onClick={() => setShowHeaderMenu((prev) => !prev)}
            aria-label="Opsi percakapan"
            className="p-2 text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl transition cursor-pointer"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showHeaderMenu && (
            <div className="absolute right-0 top-full mt-1.5 w-44 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setShowHeaderMenu(false)
                  setShowDeleteConfirm(true)
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Hapus Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-6 space-y-4">
        {/* Date Divider */}
        <div className="flex items-center justify-center py-2">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-neutral-100 dark:bg-neutral-900 text-neutral-500 dark:text-neutral-400">
            {dateDividerLabel}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-40 text-neutral-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span>Memuat pesan...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center my-8 text-xs text-neutral-400">
            Belum ada pesan. Mulai percakapan dengan mengirimkan pesan di bawah.
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              msg={msg}
              currentUserId={currentUserId}
              hoveredMsgId={hoveredMsgId}
              unsendingMsgId={unsendingMsgId}
              onHover={setHoveredMsgId}
              onUnsend={handleUnsend}
              onImageClick={setPreviewImageModalUrl}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Component */}
      <MessageInput
        conversationId={conversationId}
        onSendMessage={onSendMessage}
      />
    </div>
  )
}
