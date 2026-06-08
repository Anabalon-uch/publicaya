'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Copy, Pencil, Check, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

interface ResultsDescriptionProps {
  description: string
  onChange: (value: string) => void
  isRegenerating: boolean
  onRegenerate: () => void
}

// Parse "Estilo: ...\nMaterial: ...\nCómo usarlo: ..." into sections
function parseSections(text: string): { label: string; content: string }[] | null {
  if (!text) return null
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const sections = lines
    .map((line) => {
      const colonIdx = line.indexOf(':')
      if (colonIdx === -1) return null
      return { label: line.slice(0, colonIdx).trim(), content: line.slice(colonIdx + 1).trim() }
    })
    .filter(Boolean) as { label: string; content: string }[]
  return sections.length >= 2 ? sections : null
}

export function ResultsDescription({ description, onChange, isRegenerating, onRegenerate }: ResultsDescriptionProps) {
  const [editing, setEditing] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(description)
    toast.success('Descripción copiada')
  }

  const sections = parseSections(description)
  const wordCount = description.split(/\s+/).filter(Boolean).length

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Descripción de marketing
        </p>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={handleCopy} disabled={isRegenerating || !description} className="h-7 px-2 text-xs">
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copiar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing((e) => !e)}
            disabled={isRegenerating}
            className="h-7 px-2 text-xs"
          >
            {editing ? <Check className="w-3.5 h-3.5 mr-1.5" /> : <Pencil className="w-3.5 h-3.5 mr-1.5" />}
            {editing ? 'Listo' : 'Editar'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="h-7 px-2 text-xs"
          >
            {isRegenerating
              ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
            {isRegenerating ? 'Regenerando...' : 'Regenerar'}
          </Button>
        </div>
      </div>

      {isRegenerating ? (
        <div className="flex items-center justify-center py-10 text-zinc-300">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : editing ? (
        <Textarea
          value={description}
          onChange={(e) => onChange(e.target.value)}
          rows={8}
          className="resize-none text-sm leading-relaxed font-mono"
          placeholder="Estilo: ...\nMaterial: ...\nCómo usarlo: ..."
          autoFocus
        />
      ) : sections ? (
        <div className="flex flex-col gap-4">
          {sections.map(({ label, content }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">{label}</span>
              <p className="text-sm text-zinc-700 leading-relaxed">{content}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-zinc-500 leading-relaxed whitespace-pre-line">
          {description || 'La descripción aparecerá aquí una vez completado el análisis...'}
        </p>
      )}

      {description && !isRegenerating && (
        <p className="text-xs text-zinc-400">{wordCount} palabras</p>
      )}
    </div>
  )
}
