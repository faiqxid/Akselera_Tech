'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types/chat'
import { getInitials } from '@/lib/utils'
import { Search, Loader2 } from 'lucide-react'

interface NewChatModalProps {
  isOpen: boolean
  onClose: () => void
  currentUserId: string
  onStartChat: (opponentId: string) => Promise<void>
}

export function NewChatModal({
  isOpen,
  onClose,
  currentUserId,
  onStartChat,
}: NewChatModalProps) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    async function fetchProfiles() {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUserId)
        .order('full_name', { ascending: true })

      if (!error && data) {
        setProfiles(data as Profile[])
      }
      setLoading(false)
    }

    fetchProfiles()
  }, [isOpen, currentUserId])

  if (!isOpen) return null

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim()
    return (
      p.full_name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    )
  })

  const handleStartChat = async () => {
    if (!selectedUserId || starting) return
    setStarting(true)
    try {
      await onStartChat(selectedUserId)
      onClose()
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md bg-white dark:bg-black border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-bold text-black dark:text-white">
            Chat baru
          </h2>
          <button
            onClick={onClose}
            className="text-sm font-semibold text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
          >
            Tutup
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-900">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama atau email"
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition"
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[220px]">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-neutral-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span>Memuat pengguna...</span>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-neutral-400 text-sm">
              <p>Pengguna tidak ditemukan</p>
            </div>
          ) : (
            filteredProfiles.map((profile) => {
              const isSelected = selectedUserId === profile.id
              const initials = getInitials(profile.full_name || profile.email)

              return (
                <label
                  key={profile.id}
                  onClick={() => setSelectedUserId(profile.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700'
                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="selectedUser"
                    checked={isSelected}
                    onChange={() => setSelectedUserId(profile.id)}
                    className="w-4 h-4 text-black dark:text-white focus:ring-black dark:focus:ring-white border-neutral-300 dark:border-neutral-700"
                  />

                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-black dark:text-white truncate">
                      {profile.full_name}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                      {profile.email}
                    </p>
                  </div>
                </label>
              )
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950">
          <button
            onClick={handleStartChat}
            disabled={!selectedUserId || starting}
            className="w-full py-3 px-4 rounded-xl font-bold bg-black text-white dark:bg-white dark:text-black hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {starting && <Loader2 className="w-4 h-4 animate-spin" />}
            Mulai chat
          </button>
        </div>
      </div>
    </div>
  )
}
