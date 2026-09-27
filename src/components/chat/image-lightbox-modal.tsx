'use client'

import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

interface ImageLightboxModalProps {
  imageUrl: string | null
  onClose: () => void
}

export function ImageLightboxModal({
  imageUrl,
  onClose,
}: ImageLightboxModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (imageUrl) {
      if (!dialog.open) {
        dialog.showModal()
      }
    } else {
      if (dialog.open) {
        dialog.close()
      }
    }
  }, [imageUrl])

  if (!imageUrl) return null

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-label="Preview lampiran gambar"
      className="fixed inset-0 z-50 bg-transparent p-0 backdrop:bg-black/90 backdrop:backdrop-blur-xs max-w-none w-screen h-screen flex items-center justify-center m-0 border-0 outline-none"
    >
      <div className="relative max-w-4xl max-h-[90vh] p-2 flex items-center justify-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup foto"
          className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-white/10 rounded-full transition cursor-pointer"
        >
          <X className="w-6 h-6" />
        </button>
        <img
          src={imageUrl}
          alt="Preview lampiran gambar"
          className="max-h-[85vh] max-w-full rounded-2xl object-contain shadow-2xl"
        />
      </div>
    </dialog>
  )
}
