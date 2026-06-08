'use client'

import { Plus, Download, Shirt, CheckCircle, Loader2, AlertCircle, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import type { SessionItem } from '@/lib/session'
import { cn } from '@/lib/utils'

interface SessionSidebarProps {
  items: SessionItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onExport: () => void
  onDelete: (id: string) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}

const StatusIcon = ({ status }: { status: SessionItem['status'] }) => {
  if (status === 'processing') return <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 flex-shrink-0" />
  if (status === 'done') return <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
  if (status === 'error') return <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
  return <Shirt className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />
}

function SidebarContent({
  items,
  activeId,
  onSelect,
  onNew,
  onExport,
  onDelete,
  onClose,
}: SessionSidebarProps & { onClose?: () => void }) {
  const doneCount = items.filter((i) => i.status === 'done').length

  return (
    <>
      <div className="p-4 border-b border-zinc-200 flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shirt className="w-5 h-5 text-zinc-700" />
            <h1 className="font-semibold text-zinc-900 text-sm">PublicaYa</h1>
          </div>
          <p className="text-xs text-zinc-400">{items.length} prenda{items.length !== 1 ? 's' : ''} en sesión</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-3">
        <Button
          onClick={() => { onNew(); onClose?.() }}
          className="w-full justify-start bg-zinc-900 hover:bg-zinc-700 text-white h-9 text-sm"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva prenda
        </Button>
      </div>

      <ScrollArea className="flex-1 px-2">
        {items.length === 0 ? (
          <div className="py-8 text-center text-xs text-zinc-400 px-4">
            Agrega tu primera prenda para comenzar
          </div>
        ) : (
          <div className="flex flex-col gap-1 pb-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => { onSelect(item.id); onClose?.() }}
                className={cn(
                  'group flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-left',
                  activeId === item.id
                    ? 'bg-white border border-zinc-200 shadow-sm'
                    : 'hover:bg-zinc-100'
                )}
              >
                {item.originalPhotoUrl ? (
                  <img
                    src={item.originalPhotoUrl}
                    alt=""
                    className="w-8 h-8 rounded-md object-cover flex-shrink-0 border border-zinc-200"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-md bg-zinc-200 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-800 truncate">
                    {item.name || 'Prenda sin nombre'}
                  </p>
                  <p className="text-xs text-zinc-400 capitalize">{
                    item.status === 'processing' ? 'Procesando...' :
                    item.status === 'done' ? item.categories.tipo :
                    item.status === 'error' ? 'Error' : 'Pendiente'
                  }</p>
                </div>
                <StatusIcon status={item.status} />
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item.id) }}
                  className="opacity-0 group-hover:opacity-100 text-zinc-300 hover:text-red-400 transition-all ml-auto"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {doneCount > 0 && (
        <>
          <Separator />
          <div className="p-3">
            <Button
              onClick={onExport}
              variant="outline"
              className="w-full justify-start h-9 text-sm"
              size="sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar sesión ({doneCount})
            </Button>
          </div>
        </>
      )}
    </>
  )
}

export function SessionSidebar(props: SessionSidebarProps) {
  const { mobileOpen, onMobileClose } = props

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-zinc-200 bg-zinc-50 flex-col h-full">
        <SidebarContent {...props} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-zinc-50 shadow-xl flex flex-col">
            <SidebarContent {...props} onClose={onMobileClose} />
          </aside>
        </div>
      )}
    </>
  )
}
