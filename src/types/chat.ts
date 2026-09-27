export interface Profile {
  id: string
  email: string
  full_name: string
  created_at: string
}

export interface ConversationParticipant {
  conversation_id: string
  user_id: string
  last_read_at: string
  profile?: Profile
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  file_url?: string | null
  file_type?: 'image' | 'file' | null
  file_name?: string | null
  is_deleted?: boolean | null
  created_at: string
}

export interface ConversationItem {
  id: string
  updated_at: string
  created_at: string
  opponent: Profile
  opponentLastReadAt?: string | null
  lastMessage?: Message | null
  unreadCount?: number
}
