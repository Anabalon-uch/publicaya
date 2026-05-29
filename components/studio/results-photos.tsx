'use client'

import { Download, RefreshCw, Loader2 } from 'lucide-react'

interface ResultsPhotosProps {
  originalUrl: string
  ghostUrls: (string | null)[]
  isProcessing: boolean
  regeneratingIndices: number[]
  onRegenerate: (shotIndex: number) => void
}

const SHOT_LABELS = ['Frontal', 'Ángulo 3/4', 'Trasera / Detalle']

export function ResultsPhotos({ originalUrl, ghostUrls, isProcessing, regeneratingIndices, onRegenerate }: ResultsPhotosProps) {
  const handleDownload = (url: string, label: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = `foto-${label.toLowerCase().replace(/\s/g, '-')}.jpg`
    a.click()
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
        Fotos generadas (maniquí invisible)
      </p>

      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => {
          const url = ghostUrls[i]
          const isThisRegenerating = regeneratingIndices.includes(i)
          const isLoading = isThisRegenerating || (!url && isProcessing)

          return (
            <div key={i} className="relative group flex flex-col gap-1.5">
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

                {/* Download — top right, on hover */}
                {url && !isThisRegenerating && (
                  <button
                    onClick={() => handleDownload(url, SHOT_LABELS[i]!)}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
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

      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">Foto original</p>
        <div className="w-20 rounded-xl overflow-hidden border border-zinc-200 bg-zinc-50 aspect-[3/4]">
          <img src={originalUrl} alt="Original" className="w-full h-full object-contain" />
        </div>
      </div>
    </div>
  )
}
