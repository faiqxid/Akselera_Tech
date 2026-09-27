'use client'

import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'

interface DeleteChatModalProps {
  isOpen: boolean
  opponentName: string
  onConfirm: () => void
  onClose: () => void
}

export function DeleteChatModal({
  isOpen,
  opponentName,
  onConfirm,
  onClose,
}: DeleteChatModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="delete-modal-title"
      className="fixed inset-0 z-50 bg-transparent p-0 backdrop:bg-black/60 backdrop:backdrop-blur-xs max-w-none w-screen h-screen flex items-center justify-center m-0 border-0 outline-none"
    >
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
          <Trash2 className="w-6 h-6" />
        </div>
        <h3 id="delete-modal-title" className="text-base font-bold text-black dark:text-white">
          Hapus Obrolan Ini?
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 leading-relaxed">
          Apakah kamu yakin ingin menghapus seluruh obrolan dengan{' '}
          <strong className="text-neutral-700 dark:text-neutral-200">{opponentName}</strong>?
          Tindakan ini hanya menghapus obrolan dari pandangan kamu.
        </p>
        <div className="flex items-center justify-end gap-2.5 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition shadow-xs cursor-pointer"
          >
            Hapus Chat
          </button>
        </div>
      </div>
    </dialog>
  )
}
