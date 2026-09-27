'use client'

import { useState, useEffect, useRef } from 'react'
import { Profile, Message } from '@/types/chat'
import { getInitials, formatChatTime, formatDividerDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft,
  Send,
  Loader2,
  Paperclip,
  FileText,
  Download,
  X,
} from 'lucide-react'

interface ChatRoomProps {
  conversationId: string
  opponent: Profile
  currentUserId: string
  messages: Message[]
  onSendMessage: (
    content: string,
    fileData?: { file_url: string; file_type: 'image' | 'file'; file_name: string } | null
  ) => Promise<void>
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)
  const [previewImageModalUrl, setPreviewImageModalUrl] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const MAX_FILE_SIZE_MB = 10
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(`Ukuran file terlalu besar! Maksimal ${MAX_FILE_SIZE_MB} MB.`)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      return
    }

    setSelectedFile(file)

    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file)
      setSelectedFilePreview(previewUrl)
    } else {
      setSelectedFilePreview(null)
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    if (selectedFilePreview) {
      URL.revokeObjectURL(selectedFilePreview)
      setSelectedFilePreview(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const content = inputText.trim()

    if ((!content && !selectedFile) || sending) return

    setSending(true)
    let fileData: { file_url: string; file_type: 'image' | 'file'; file_name: string } | null = null

    try {
      if (selectedFile) {
        setUploadProgress('Mengunggah file...')
        const supabase = createClient()
        const fileExt = selectedFile.name.split('.').pop() || 'bin'
        const randomName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`
        const filePath = `${conversationId}/${randomName}`

        const { error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(filePath, selectedFile, { upsert: true })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert('Gagal mengunggah file. Pastikan bucket storage chat-attachments telah dibuat di Supabase.')
          setSending(false)
          setUploadProgress(null)
          return
        }

        const { data: publicUrlData } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(filePath)

        const isImage = selectedFile.type.startsWith('image/')
        fileData = {
          file_url: publicUrlData.publicUrl,
          file_type: isImage ? 'image' : 'file',
          file_name: selectedFile.name,
        }
      }

      setInputText('')
      handleClearFile()

      await onSendMessage(content, fileData)
      scrollToBottom()
    } catch (err) {
      console.error('Send error:', err)
      setInputText(content)
    } finally {
      setSending(false)
      setUploadProgress(null)
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
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-black overflow-hidden relative">
      {/* Image Lightbox Modal */}
      {previewImageModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewImageModalUrl(null)}
        >
          <button
            onClick={() => setPreviewImageModalUrl(null)}
            className="absolute top-4 right-4 p-2 bg-neutral-800 text-white rounded-full hover:bg-neutral-700 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImageModalUrl}
            alt="Preview"
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}

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
                  className={`max-w-[85%] md:max-w-[65%] rounded-2xl p-3 text-sm shadow-2xs ${
                    isMe
                      ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-xs'
                      : 'bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white rounded-tl-xs'
                  }`}
                >
                  {/* Image Attachment Rendering */}
                  {msg.file_type === 'image' && msg.file_url && (
                    <div className="mb-2 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
                      <img
                        src={msg.file_url}
                        alt={msg.file_name || 'Gambar'}
                        onClick={() => setPreviewImageModalUrl(msg.file_url!)}
                        className="max-h-72 w-auto max-w-full rounded-xl object-cover cursor-pointer hover:opacity-95 transition"
                      />
                    </div>
                  )}

                  {/* Document/File Attachment Rendering */}
                  {msg.file_type === 'file' && msg.file_url && (
                    <a
                      href={msg.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-3 p-3 rounded-xl mb-2 border transition ${
                        isMe
                          ? 'bg-neutral-900 dark:bg-neutral-100 border-neutral-800 dark:border-neutral-200 text-white dark:text-black'
                          : 'bg-white dark:bg-black border-neutral-200 dark:border-neutral-800 text-black dark:text-white'
                      }`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-neutral-700 dark:text-neutral-300" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {msg.file_name || 'Lampiran Dokumen'}
                        </p>
                        <span className="text-[10px] opacity-70">Klik untuk mengunduh</span>
                      </div>
                      <Download className="w-4 h-4 opacity-80 shrink-0" />
                    </a>
                  )}

                  {/* Caption / Text Content */}
                  {msg.content && (
                    <p className="whitespace-pre-wrap break-words leading-relaxed px-1">
                      {msg.content}
                    </p>
                  )}
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

      {/* Selected File Preview Banner */}
      {selectedFile && (
        <div className="px-4 py-2 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {selectedFilePreview ? (
              <img
                src={selectedFilePreview}
                alt="Preview"
                className="w-10 h-10 rounded-lg object-cover border border-neutral-300 dark:border-neutral-700 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-black dark:text-white truncate">
                {selectedFile.name}
              </p>
              <p className="text-[11px] text-neutral-500">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <button
            onClick={handleClearFile}
            className="p-1 rounded-full text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 transition"
            title="Batal lampiran"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Footer Message Input Bar */}
      <form
        onSubmit={handleSend}
        className="p-3 md:p-4 border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black flex items-center gap-2 md:gap-3 shrink-0"
      >
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip"
        />

        {/* Paperclip Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-full text-neutral-500 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition shrink-0"
          title="Lampirkan foto atau dokumen"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploadProgress || 'Tulis pesan'}
          disabled={sending}
          className="flex-1 px-4 py-2.5 rounded-full border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-sm text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition disabled:opacity-60"
        />

        <button
          type="submit"
          disabled={(!inputText.trim() && !selectedFile) || sending}
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
