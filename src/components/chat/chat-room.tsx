'use client'

import { useState, useEffect, useRef } from 'react'
import { Profile, Message } from '@/types/chat'
import { getInitials, formatChatTime, formatDividerDate } from '@/lib/utils'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'

interface ChatRoomProps {
  conversationId: string
  opponent: Profile
  currentUserId: string
  messages: Message[]
  onSendMessage: (content: string) => Promise<void>
  onBackToSidebar?: () => void
  loading?: boolean
}

export function ChatRoom({
  conversationId,
  opponent,
  currentUserId,
  messages,
  onSendMessage,
  onBackToSidebar,
  loading = false,
}: ChatRoomProps) {
  const [inputText, setInputText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = inputText.trim()
    if (!content || sending) return

    setSending(true)
    setInputText('')
    try {
      await onSendMessage(content)
      scrollToBottom()
    } catch {
      setInputText(content) // Restore text on failure
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const opponentInitials = getInitials(opponent.full_name || opponent.email)

  // Group messages or get primary date
  const firstMessageDate = messages.length > 0 ? messages[0].created_at : new Date().toISOString()
  const dateDividerLabel = formatDividerDate(firstMessageDate)

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-hidden">
      {/* Chat Room Header */}
      <div className="h-16 px-4 md:px-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3 shrink-0">
        {onBackToSidebar && (
          <button
            onClick={onBackToSidebar}
            className="md:hidden p-1.5 text-neutral-500 hover:text-black dark:hover:text-white transition-colors rounded-lg"
            title="Kembali ke daftar chat"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        {/* Avatar */}
        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-300/60 dark:border-neutral-700/60">
          {opponentInitials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm md:text-base text-black dark:text-white truncate leading-tight">
            {opponent.full_name}
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
            {opponent.email}
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {/* Date Divider */}
        <div className="flex items-center justify-center my-2">
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
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId
            const timeStr = formatChatTime(msg.created_at)

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[80%] md:max-w-[65%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs ${
                    isMe
                      ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-xs'
                      : 'bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white rounded-tl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-relaxed">
                    {msg.content}
                  </p>
                </div>
                <span className="text-[11px] text-neutral-400 mt-1 px-1 font-medium">
                  {timeStr}
                </span>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Message Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 md:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center gap-2 md:gap-3 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Tulis pesan"
          className="flex-1 px-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
        />

        <button
          type="submit"
          disabled={!inputText.trim() || sending}
          className="py-2.5 px-5 rounded-full font-bold text-sm bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 shrink-0 shadow-xs"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Kirim</span>
              <Send className="w-3.5 h-3.5 hidden sm:inline-block" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}
