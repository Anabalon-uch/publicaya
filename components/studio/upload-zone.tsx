'use client'

import { useCallback, useState } from 'react'
import { ImagePlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const GENDERS = ['Mujer', 'Hombre', 'Unisex', 'Niño/a'] as const
type Gender = (typeof GENDERS)[number]

interface UploadZoneProps {
  onGenerate: (frontFile: File, backFile: File | null, gender: Gender) => void
}

interface PhotoSlotProps {
  label: string
  required?: boolean
  preview: string | null
  onFile: (f: File) => void
  onClear: () => void
  inputId: string
}

function PhotoSlot({ label, required, preview, onFile, onClear, inputId }: PhotoSlotProps) {
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f && f.type.startsWith('image/')) onFile(f)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
      <div className="flex items-center gap-1">
        <span className="text-xs font-medium text-zinc-600">{label}</span>
        {required
          ? <span className="text-xs text-red-400">*</span>
          : <span className="text-xs text-zinc-400">(opcional)</span>}
      </div>
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed cursor-pointer overflow-hidden bg-zinc-50 aspect-[3/4] w-full transition-colors',
          preview ? 'border-zinc-300' : 'border-zinc-300 hover:border-zinc-500 active:border-zinc-700'
        )}
        onClick={() => document.getElementById(inputId)?.click()}
      >
        {preview ? (
          <>
            <img src={preview} alt={label} className="w-full h-full object-contain" />
            <button
              onClick={(e) => { e.stopPropagation(); onClear() }}
              className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400 p-2">
            <ImagePlus className="w-8 h-8" />
            <p className="text-xs text-center leading-tight">Toca para seleccionar</p>
          </div>
        )}
      </div>
      <input
        id={inputId}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleInput}
      />
    </div>
  )
}

export function UploadZone({ onGenerate }: UploadZoneProps) {
  const [frontFile, setFrontFile] = useState<File | null>(null)
  const [frontPreview, setFrontPreview] = useState<string | null>(null)
  const [backFile, setBackFile] = useState<File | null>(null)
  const [backPreview, setBackPreview] = useState<string | null>(null)
  const [gender, setGender] = useState<Gender>('Mujer')

  const loadFile = useCallback((
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => (f: File) => {
    setFile(f)
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const clearSlot = useCallback((
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => () => { setFile(null); setPreview(null) }, [])

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm mx-auto">
      <div className="flex gap-3">
        <PhotoSlot
          label="Frontal"
          required
          preview={frontPreview}
          onFile={loadFile(setFrontFile, setFrontPreview)}
          onClear={clearSlot(setFrontFile, setFrontPreview)}
          inputId="upload-front"
        />
        <PhotoSlot
          label="Trasera"
          preview={backPreview}
          onFile={loadFile(setBackFile, setBackPreview)}
          onClear={clearSlot(setBackFile, setBackPreview)}
          inputId="upload-back"
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-zinc-600">Género del maniquí</p>
        <div className="grid grid-cols-4 gap-2">
          {GENDERS.map((g) => (
            <button
              key={g}
              onClick={() => setGender(g)}
              className={cn(
                'py-2 px-1 text-xs rounded-lg border font-medium transition-colors',
                gender === g
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400'
              )}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      <Button
        disabled={!frontFile}
        className="w-full bg-zinc-900 hover:bg-zinc-700 text-white disabled:opacity-50"
        onClick={() => frontFile && onGenerate(frontFile, backFile, gender)}
      >
        Generar contenido
      </Button>
    </div>
  )
}
