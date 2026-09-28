'use client'

import { Message } from '@/types/chat'
import { formatChatTime } from '@/lib/utils'
import { FileText, Download, RotateCcw, Loader2, Check, CheckCheck } from 'lucide-react'

interface MessageBubbleProps {
  msg: Message
  currentUserId: string
  hoveredMsgId: string | null
  unsendingMsgId: string | null
  opponentLastReadAt?: string | null
  isOpponentOnline?: boolean
  onHover: (id: string | null) => void
  onUnsend: (id: string) => void
  onImageClick: (url: string) => void
}

function MessageStatusTicks({
  isMe,
  isDeleted,
  createdAt,
  opponentLastReadAt,
  isOpponentOnline,
}: {
  isMe: boolean
  isDeleted: boolean
  createdAt: string
  opponentLastReadAt?: string | null
  isOpponentOnline?: boolean
}) {
  if (!isMe || isDeleted) return null

  // 1. Checklist 2 Biru jika sudah dibaca
  const isRead =
    !!opponentLastReadAt &&
    new Date(opponentLastReadAt).getTime() >= new Date(createdAt).getTime()

  if (isRead) {
    return (
      <CheckCheck
        className="w-3.5 h-3.5 text-sky-400 shrink-0"
        aria-label="Sudah dibaca"
      />
    )
  }

  // 2. Checklist 2 Abu-abu jika belum dibaca tapi lawan online
  if (isOpponentOnline) {
    return (
      <CheckCheck
        className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0"
        aria-label="Tersampaikan (Online)"
      />
    )
  }

  // 3. Checklist 1 Abu-abu jika belum dibaca dan lawan tidak online
  return (
    <Check
      className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 shrink-0"
      aria-label="Terkirim (Offline)"
    />
  )
}

function DeletedMessageView({ timeStr }: { timeStr: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="italic text-neutral-400 dark:text-neutral-500 text-xs md:text-sm flex items-center gap-1.5 select-none">
        🚫 Pesan ini telah ditarik
      </p>
      <span className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium shrink-0">
        {timeStr}
      </span>
    </div>
  )
}

function MessageAttachmentView({
  msg,
  isMe,
  onImageClick,
}: {
  msg: Message
  isMe: boolean
  onImageClick: (url: string) => void
}) {
  if (msg.file_type === 'image' && msg.file_url) {
    return (
      <div className="mb-2 overflow-hidden rounded-xl bg-black/5 dark:bg-white/5">
        <button
          type="button"
          onClick={() => onImageClick(msg.file_url!)}
          aria-label="Lihat gambar ukuran penuh"
          className="block w-full text-left border-0 bg-transparent p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white rounded-xl"
        >
          <img
            src={msg.file_url}
            alt={msg.file_name || 'Gambar'}
            className="max-h-72 w-auto max-w-full rounded-xl object-cover hover:opacity-95 transition"
          />
        </button>
      </div>
    )
  }

  if (msg.file_type === 'file' && msg.file_url) {
    return (
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
          <p className="text-xs font-bold truncate">{msg.file_name || 'Lampiran Dokumen'}</p>
          <span className="text-[10px] opacity-70">Klik untuk mengunduh</span>
        </div>
        <Download className="w-4 h-4 opacity-80 shrink-0" />
      </a>
    )
  }

  return null
}

export function MessageBubble({
  msg,
  currentUserId,
  hoveredMsgId,
  unsendingMsgId,
  opponentLastReadAt,
  isOpponentOnline = false,
  onHover,
  onUnsend,
  onImageClick,
}: MessageBubbleProps) {
  const isMe = msg.sender_id === currentUserId
  const isDeleted = msg.is_deleted === true
  const timeStr = formatChatTime(msg.created_at)
  const isUnsending = unsendingMsgId === msg.id
  const isHovered = hoveredMsgId === msg.id

  const bubbleBg = isDeleted
    ? 'bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800'
    : isMe
    ? 'bg-black text-white dark:bg-white dark:text-black rounded-tr-xs'
    : 'bg-neutral-100 text-black dark:bg-neutral-900 dark:text-white rounded-tl-xs'

  return (
    <div
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group max-w-full`}
      onMouseEnter={() => !isDeleted && isMe && onHover(msg.id)}
      onMouseLeave={() => onHover(null)}
    >
      <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'} max-w-full`}>
        {/* Unsend button - only own non-deleted messages */}
        {isMe && !isDeleted && (
          <button
            type="button"
            onClick={() => onUnsend(msg.id)}
            disabled={isUnsending}
            className={`mb-1 p-1.5 rounded-full text-neutral-400 hover:text-red-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition shrink-0 cursor-pointer ${
              isHovered ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            title="Tarik pesan ini"
          >
            {isUnsending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
          </button>
        )}

        {/* Message Bubble */}
        <div className={`w-fit min-w-[7.5rem] max-w-[85%] md:max-w-[65%] rounded-2xl px-3.5 py-2 text-sm shadow-2xs ${bubbleBg}`}>
          {isDeleted ? (
            <DeletedMessageView timeStr={timeStr} />
          ) : (
            <>
              <MessageAttachmentView
                msg={msg}
                isMe={isMe}
                onImageClick={onImageClick}
              />

              {msg.content && (
                <p className="whitespace-pre-wrap break-words [word-break:break-word] leading-relaxed max-h-96 overflow-y-auto">
                  {msg.content}
                </p>
              )}

              <div
                className={`flex items-center gap-1 mt-1 justify-end ${
                  isMe
                    ? 'text-neutral-300 dark:text-neutral-500'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                <span className="text-[10px] font-medium tracking-tight">
                  {timeStr}
                </span>
                <MessageStatusTicks
                  isMe={isMe}
                  isDeleted={isDeleted}
                  createdAt={msg.created_at}
                  opponentLastReadAt={opponentLastReadAt}
                  isOpponentOnline={isOpponentOnline}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
