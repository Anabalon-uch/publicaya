'use client'

import { Progress } from '@/components/ui/progress'
import { Loader2, ImageIcon, FileText } from 'lucide-react'

interface ProcessingViewProps {
  photosReceived: number
  analysisReceived: boolean
}

export function ProcessingView({ photosReceived, analysisReceived }: ProcessingViewProps) {
  const totalSteps = 4
  const completed = photosReceived + (analysisReceived ? 1 : 0)
  const progress = Math.round((completed / totalSteps) * 100)

  return (
    <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto py-12">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
        <p className="text-zinc-600 font-medium">Generando contenido con IA...</p>
        <p className="text-zinc-400 text-sm">Esto puede tomar hasta 2 minutos</p>
      </div>

      <div className="w-full flex flex-col gap-2">
        <div className="flex justify-between text-xs text-zinc-500 mb-1">
          <span>{completed} de {totalSteps} completados</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <div className="w-full flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 text-sm">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
              i < photosReceived ? 'bg-green-500' : 'bg-zinc-200'
            }`}>
              {i < photosReceived ? (
                <span className="text-white text-xs">✓</span>
              ) : (
                <ImageIcon className="w-3 h-3 text-zinc-400" />
              )}
            </div>
            <span className={i < photosReceived ? 'text-zinc-700' : 'text-zinc-400'}>
              {i === 0 ? 'Foto frontal (maniquí invisible)' : i === 1 ? 'Foto ángulo 3/4' : 'Foto trasera / detalle'}
            </span>
          </div>
        ))}

        <div className="flex items-center gap-3 text-sm">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
            analysisReceived ? 'bg-green-500' : 'bg-zinc-200'
          }`}>
            {analysisReceived ? (
              <span className="text-white text-xs">✓</span>
            ) : (
              <FileText className="w-3 h-3 text-zinc-400" />
            )}
          </div>
          <span className={analysisReceived ? 'text-zinc-700' : 'text-zinc-400'}>
            Descripción y categorías
          </span>
        </div>
      </div>
    </div>
  )
}
