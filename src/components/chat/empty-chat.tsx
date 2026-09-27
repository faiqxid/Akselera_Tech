import { MessageSquarePlus } from 'lucide-react'

interface EmptyChatProps {
  onOpenNewChatModal: () => void
}

export function EmptyChat({ onOpenNewChatModal }: EmptyChatProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-neutral-50/50 dark:bg-black text-center">
      <div className="w-16 h-16 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-4 text-neutral-400 dark:text-neutral-500">
        <MessageSquarePlus className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-black dark:text-white mb-1">
        Pilih percakapan atau mulai chat baru
      </h3>
      <p className="text-sm text-neutral-500 max-w-sm mb-6">
        Pilih salah satu kontak dari daftar di sebelah kiri atau mulai percakapan baru dengan pengguna terdaftar.
      </p>
      <button
        onClick={onOpenNewChatModal}
        className="py-2.5 px-6 rounded-full font-bold text-sm bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 transition-colors shadow-sm"
      >
        + Chat baru
      </button>
    </div>
  )
}
