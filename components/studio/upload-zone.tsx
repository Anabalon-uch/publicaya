'use client'

import { useCallback, useState } from 'react'
import { Upload, ImagePlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface UploadZoneProps {
  onGenerate: (file: File) => void
}

export function UploadZone({ onGenerate }: UploadZoneProps) {
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) return
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }, [handleFile])

  const handleGenerate = useCallback(() => {
    if (file) onGenerate(file)
  }, [file, onGenerate])

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-xl mx-auto">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        className={cn(
          'relative w-full aspect-square rounded-2xl border-2 border-dashed transition-all cursor-pointer overflow-hidden bg-zinc-50',
          dragging ? 'border-zinc-900 bg-zinc-100' : 'border-zinc-300 hover:border-zinc-400'
        )}
        onClick={() => !preview && document.getElementById('file-input')?.click()}
      >
        {preview ? (
          <img src={preview} alt="Prenda" className="w-full h-full object-contain" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <ImagePlus className="w-12 h-12" />
            <p className="text-sm font-medium">Arrastra una foto de la prenda aquí</p>
            <p className="text-xs">o haz click para seleccionar</p>
          </div>
        )}

        {preview && (
          <button
            onClick={(e) => { e.stopPropagation(); setPreview(null); setFile(null) }}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      <input
        id="file-input"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInput}
      />

      {preview ? (
        <div className="flex gap-3 w-full">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <Upload className="w-4 h-4 mr-2" />
            Cambiar foto
          </Button>
          <Button
            className="flex-1 bg-zinc-900 hover:bg-zinc-700 text-white"
            onClick={handleGenerate}
          >
            Generar contenido
          </Button>
        </div>
      ) : (
        <Button
          variant="outline"
          className="w-full"
          onClick={() => document.getElementById('file-input')?.click()}
        >
          <Upload className="w-4 h-4 mr-2" />
          Seleccionar foto
        </Button>
      )}
    </div>
  )
}
