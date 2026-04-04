import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  children: ReactNode
}

export default function SlidePanel({ open, onClose, children }: SlidePanelProps) {
  return (
    <div
      className={`fixed top-14 right-0 bottom-0 w-80 bg-command-surface border-l border-command-border z-40 transition-transform duration-300 ease-in-out ${
        open ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1 text-command-muted hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="h-full overflow-y-auto p-4 pt-10 scrollbar-thin">
        {children}
      </div>
    </div>
  )
}
