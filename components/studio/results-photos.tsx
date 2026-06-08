'use client'

import { Download, RefreshCw, Loader2 } from 'lucide-react'
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

  const handleDownloadAll = async () => {
    for (let i = 0; i < ghostUrls.length; i++) {
      const url = ghostUrls[i]
      if (!url) continue
      const a = document.createElement('a')
      a.href = url
      a.download = `foto-${SHOT_LABELS[i]!.toLowerCase().replace(/[\s/]/g, '-')}.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      // Small delay so the browser doesn't block multiple downloads
      await new Promise((r) => setTimeout(r, 200))
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
            className="h-7 px-3 text-xs gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Descargar fotos
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
