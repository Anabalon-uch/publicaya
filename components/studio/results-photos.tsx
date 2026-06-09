'use client'

import { useState } from 'react'
import { Download, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface ResultsPhotosProps {
  originalUrl: string
  backUrl?: string | null
  ghostUrls: (string | null)[]
  isProcessing: boolean
  regeneratingIndices: number[]
  onRegenerate: (shotIndex: number) => void
}

const SHOT_LABELS = ['Frontal', 'Ángulo 3/4', 'Trasera / Detalle']

export function ResultsPhotos({ originalUrl, backUrl, ghostUrls, isProcessing, regeneratingIndices, onRegenerate }: ResultsPhotosProps) {
  const availableUrls = ghostUrls.filter((u): u is string => !!u)
  const [isSaving, setIsSaving] = useState(false)

  const fileName = (i: number) => `foto-${SHOT_LABELS[i]!.toLowerCase().replace(/[\s/]/g, '-')}.jpg`

  // Trigger one-by-one browser downloads (desktop fallback).
  const downloadIndividually = (photos: { url: string; i: number }[]) => {
    photos.forEach(({ url, i }, n) => {
      setTimeout(() => {
        const a = document.createElement('a')
        a.href = url
        a.download = fileName(i)
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }, n * 300)
    })
  }

  const handleDownloadAll = async () => {
    const photos = ghostUrls
      .map((url, i) => ({ url, i }))
      .filter((p): p is { url: string; i: number } => !!p.url)
    if (photos.length === 0) return

    setIsSaving(true)
    try {
      // Fetch the images as File objects so we can offer the native share sheet,
      // which on mobile lets the user save straight to Photos/Gallery.
      const files = await Promise.all(
        photos.map(async ({ url, i }) => {
          const res = await fetch(url)
          const blob = await res.blob()
          return new File([blob], fileName(i), { type: blob.type || 'image/jpeg' })
        }),
      )

      if (typeof navigator !== 'undefined' && navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files, title: 'Fotos del producto' })
        } catch (err) {
          // User dismissed the share sheet — don't fall back to downloads.
          if ((err as Error)?.name !== 'AbortError') {
            downloadIndividually(photos)
          }
        }
      } else {
        // Desktop / unsupported: fall back to individual downloads.
        downloadIndividually(photos)
      }
    } catch {
      toast.error('No se pudieron preparar las fotos para descargar')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Fotos generadas (maniquí invisible)
        </p>
        {availableUrls.length > 0 && !isProcessing && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadAll}
            disabled={isSaving}
            className="h-7 px-3 text-xs gap-1.5"
          >
            {isSaving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Guardar fotos
          </Button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => {
          const url = ghostUrls[i]
          const isThisRegenerating = regeneratingIndices.includes(i)
          const isLoading = isThisRegenerating || (!url && isProcessing)

          return (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="aspect-[3/4] rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200">
                {url && !isThisRegenerating ? (
                  <img src={url} alt={SHOT_LABELS[i]} className="w-full h-full object-contain" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-300">
                    <Loader2 className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                    {isThisRegenerating && (
                      <p className="text-xs text-zinc-400 text-center px-2">Regenerando...</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-0.5">
                <p className="text-xs text-zinc-500">{SHOT_LABELS[i]}</p>
                <button
                  onClick={() => onRegenerate(i)}
                  disabled={isThisRegenerating}
                  className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isThisRegenerating ? 'animate-spin' : ''}`} />
                  Regenerar
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex gap-3">
        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Foto original</p>
          <div className="w-16 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 aspect-[3/4]">
            <img src={originalUrl} alt="Frontal original" className="w-full h-full object-contain" />
          </div>
        </div>
        {backUrl && (
          <div>
            <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Foto trasera</p>
            <div className="w-16 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 aspect-[3/4]">
              <img src={backUrl} alt="Trasera original" className="w-full h-full object-contain" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
