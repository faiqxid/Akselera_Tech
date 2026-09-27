'use client'

import { useState, useRef } from 'react'
import {
  Send,
  Loader2,
  Paperclip,
  FileText,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface MessageInputProps {
  conversationId: string
  onSendMessage: (
    content: string,
    fileData?: { file_url: string; file_type: 'image' | 'file'; file_name: string } | null
  ) => Promise<void>
}

const MAX_FILE_SIZE_MB = 10
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

export function MessageInput({ conversationId, onSendMessage }: MessageInputProps) {
  const [inputText, setInputText] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [selectedFilePreview, setSelectedFilePreview] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

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
      const reader = new FileReader()
      reader.onloadend = () => {
        setSelectedFilePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setSelectedFilePreview(null)
    }
  }

  const handleClearFile = () => {
    setSelectedFile(null)
    setSelectedFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if ((!inputText.trim() && !selectedFile) || sending) return

    setSending(true)
    try {
      let fileData: { file_url: string; file_type: 'image' | 'file'; file_name: string } | null = null

      if (selectedFile) {
        setUploadProgress('Mengupload...')
        const ext = selectedFile.name.split('.').pop() || 'bin'
        const fileName = `${conversationId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-attachments')
          .upload(fileName, selectedFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('Upload error:', uploadError)
          alert('Gagal mengupload file. Silakan coba lagi.')
          return
        }

        const { data: publicUrl } = supabase.storage
          .from('chat-attachments')
          .getPublicUrl(uploadData.path)

        const isImage = selectedFile.type.startsWith('image/')
        fileData = {
          file_url: publicUrl.publicUrl,
          file_type: isImage ? 'image' : 'file',
          file_name: selectedFile.name,
        }
        setUploadProgress(null)
      }

      await onSendMessage(inputText.trim(), fileData)
      setInputText('')
      setSelectedFile(null)
      setSelectedFilePreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setSending(false)
      setUploadProgress(null)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-800">
      {/* Selected File Preview Banner */}
      {selectedFile && (
        <div className="px-4 py-2 bg-neutral-50 dark:bg-neutral-950 flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-150">
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
                {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClearFile}
            aria-label="Hapus lampiran"
            className="p-1.5 rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="p-4 md:p-4 flex items-center gap-2.5">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
          onChange={handleFileSelect}
          aria-label="Pilih lampiran"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Lampirkan file atau gambar"
          className="p-2.5 rounded-xl text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition shrink-0 cursor-pointer"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={uploadProgress ?? 'Tulis pesan...'}
          disabled={sending}
          aria-label="Tulis pesan"
          className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 text-sm text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition disabled:opacity-60"
        />

        <button
          type="button"
          onClick={handleSubmit}
          disabled={(!inputText.trim() && !selectedFile) || sending}
          aria-label="Kirim pesan"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-black dark:bg-white text-white dark:text-black font-semibold text-sm rounded-xl hover:opacity-80 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0 cursor-pointer"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">Kirim</span>
        </button>
      </div>
    </div>
  )
}
