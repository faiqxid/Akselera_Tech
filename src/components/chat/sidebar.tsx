'use client'

import { useState } from 'react'
import { ConversationItem } from '@/types/chat'
import { getInitials, formatChatTime } from '@/lib/utils'
import { Search, Plus } from 'lucide-react'

interface SidebarProps {
  conversations: ConversationItem[]
  activeConversationId: string | null
  onSelectConversation: (id: string) => void
  onOpenNewChatModal: () => void
  loading?: boolean
}

export function Sidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onOpenNewChatModal,
  loading = false,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim()
    const nameMatch = c.opponent.full_name.toLowerCase().includes(q)
    const emailMatch = c.opponent.email.toLowerCase().includes(q)
    const lastMsgMatch = c.lastMessage?.content.toLowerCase().includes(q)
    return nameMatch || emailMatch || lastMsgMatch
  })

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black h-full shrink-0">
      {/* Search & New Chat Button Bar */}
      <div className="p-4 border-b border-neutral-100 dark:border-neutral-900 space-y-3">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari chat"
            aria-label="Cari chat"
            className="w-full pl-10 pr-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
          />
        </div>

        <button
          type="button"
          onClick={onOpenNewChatModal}
          className="w-full py-2.5 px-4 rounded-full font-bold text-sm bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>+ Chat baru</span>
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-900/50">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-200 dark:bg-neutral-800 rounded w-1/2" />
                  <div className="h-3 bg-neutral-200 dark:bg-neutral-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-8 text-center text-neutral-400 text-sm">
            {searchQuery ? (
              <p>Chat tidak ditemukan</p>
            ) : (
              <p>Belum ada percakapan. Klik &quot;+ Chat baru&quot; untuk memulai.</p>
            )}
          </div>
        ) : (
          filteredConversations.map((item) => {
            const isActive = item.id === activeConversationId
            const initials = getInitials(item.opponent.full_name || item.opponent.email)
            const formattedTime = formatChatTime(
              item.lastMessage?.created_at || item.updated_at
            )

            const getLastMessagePreview = () => {
              if (!item.lastMessage) return 'Percakapan baru'
              if (item.lastMessage.file_type === 'image') {
                return `📷 ${item.lastMessage.content || 'Gambar'}`
              }
              if (item.lastMessage.file_type === 'file') {
                return `📎 ${item.lastMessage.file_name || item.lastMessage.content || 'Dokumen'}`
              }
              return item.lastMessage.content || 'Percakapan baru'
            }

            return (
              <button
                key={item.id}
                onClick={() => onSelectConversation(item.id)}
                className={`w-full text-left p-3.5 md:p-4 flex items-center gap-3 transition-colors ${
                  isActive
                    ? 'bg-neutral-100 dark:bg-neutral-900/80 border-l-4 border-black dark:border-white'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/40'
                }`}
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm shrink-0 border border-neutral-300/60 dark:border-neutral-700/60">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className="font-bold text-sm text-black dark:text-white truncate">
                      {item.opponent.full_name}
                    </span>
                    {formattedTime && (
                      <span className="text-[11px] text-neutral-400 shrink-0 font-medium">
                        {formattedTime}
                      </span>
                    )}
                  </div>

                  {/* Opponent Email Subtext */}
                  {item.opponent.email && (
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mb-1 leading-tight">
                      {item.opponent.email}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-[2px]">
                    <p
                      className={`text-xs truncate ${
                        item.unreadCount && item.unreadCount > 0
                          ? 'font-bold text-black dark:text-white'
                          : 'font-normal text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {getLastMessagePreview()}
                    </p>

                    {item.unreadCount && item.unreadCount > 0 ? (
                      <span className="min-w-5 h-5 px-1.5 rounded-full bg-black text-white dark:bg-white dark:text-black text-[11px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>
    </aside>
  )
}
