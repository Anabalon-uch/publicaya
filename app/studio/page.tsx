'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { toast } from 'sonner'
import { Menu, Shirt } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { SessionSidebar } from '@/components/studio/session-sidebar'
import { UploadZone } from '@/components/studio/upload-zone'
import { ProcessingView } from '@/components/studio/processing-view'
import { ResultsPhotos } from '@/components/studio/results-photos'
import { ResultsDescription } from '@/components/studio/results-description'
import { ResultsCategories } from '@/components/studio/results-categories'
import { loadSession, saveSession } from '@/lib/session'
import type { SessionItem } from '@/lib/session'
import type { ClothingAnalysis } from '@/lib/gemini'

type WorkspaceState = 'empty' | 'processing' | 'results'

export default function StudioPage() {
  const [items, setItems] = useState<SessionItem[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [workspace, setWorkspace] = useState<WorkspaceState>('empty')
  const [photosReceived, setPhotosReceived] = useState(0)
  const [analysisReceived, setAnalysisReceived] = useState(false)
  const [regeneratingIndices, setRegeneratingIndices] = useState<number[]>([])
  const [isRegeneratingDescription, setIsRegeneratingDescription] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const stored = loadSession()
    setItems(stored)
    if (stored.length > 0) {
      const last = stored[stored.length - 1]!
      setActiveId(last.id)
      setWorkspace(last.status === 'done' || last.status === 'error' ? 'results' : 'empty')
    }
  }, [])

  const activeItem = items.find((i) => i.id === activeId) ?? null

  const updateItem = useCallback((id: string, patch: Partial<SessionItem>) => {
    setItems((prev) => {
      const next = prev.map((i) => i.id === id ? { ...i, ...patch } : i)
      saveSession(next)
      return next
    })
  }, [])

  const handleNew = useCallback(() => {
    abortRef.current?.abort()
    setWorkspace('empty')
    setActiveId(null)
    setPhotosReceived(0)
    setAnalysisReceived(false)
  }, [])

  const handleSelect = useCallback((id: string) => {
    abortRef.current?.abort()
    setActiveId(id)
    const item = items.find((i) => i.id === id)
    setWorkspace(item?.status === 'processing' ? 'processing' : 'results')
    setPhotosReceived(item?.ghostPhotoUrls.filter(Boolean).length ?? 0)
    setAnalysisReceived(!!item?.description)
  }, [items])

  const handleDelete = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id)
      saveSession(next)
      if (activeId === id) {
        setActiveId(next.length > 0 ? next[next.length - 1]!.id : null)
        setWorkspace(next.length > 0 ? 'results' : 'empty')
      }
      return next
    })
  }, [activeId])

  const readSSE = useCallback(async (
    res: Response,
    onPhoto: (url: string, shotIndex: number) => void,
    onAnalysis: (analysis: ClothingAnalysis) => void,
  ) => {
    if (!res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const event = JSON.parse(line.slice(6))
        if (event.type === 'photo') onPhoto(event.url, event.shotIndex)
        if (event.type === 'analysis') onAnalysis(event.analysis)
      }
    }
  }, [])

  const handleRegeneratePhoto = useCallback(async (shotIndex: number) => {
    const id = activeId
    const item = items.find((i) => i.id === id)
    if (!id || !item) return

    setRegeneratingIndices((prev) => [...prev, shotIndex])
    setItems((prev) => {
      const next = prev.map((i) => {
        if (i.id !== id) return i
        const urls = [...i.ghostPhotoUrls]
        urls[shotIndex] = null
        return { ...i, ghostPhotoUrls: urls }
      })
      saveSession(next)
      return next
    })

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.originalPhotoUrl,
          imageUrl2: item.backPhotoUrl ?? null,
          mode: 'photo',
          shotIndex,
          gender: item.categories.genero || 'Unisex',
        }),
      })
      await readSSE(res, (url, idx) => {
        setItems((prev) => {
          const next = prev.map((i) => {
            if (i.id !== id) return i
            const urls = [...i.ghostPhotoUrls]
            urls[idx] = url
            return { ...i, ghostPhotoUrls: urls }
          })
          saveSession(next)
          return next
        })
      }, () => {})
    } catch {
      toast.error('Error al regenerar la foto')
    } finally {
      setRegeneratingIndices((prev) => prev.filter((i) => i !== shotIndex))
    }
  }, [activeId, items, readSSE])

  const handleRegenerateDescription = useCallback(async () => {
    const id = activeId
    const item = items.find((i) => i.id === id)
    if (!id || !item) return

    setIsRegeneratingDescription(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: item.originalPhotoUrl,
          imageUrl2: item.backPhotoUrl ?? null,
          mode: 'description',
        }),
      })
      await readSSE(res, () => {}, (analysis) => {
        setItems((prev) => {
          const next = prev.map((i) => i.id !== id ? i : {
            ...i,
            name: analysis.name || i.name,
            description: analysis.description,
            categories: analysis.categories,
          })
          saveSession(next)
          return next
        })
      })
    } catch {
      toast.error('Error al regenerar la descripción')
    } finally {
      setIsRegeneratingDescription(false)
    }
  }, [activeId, items, readSSE])

  const handleGenerate = useCallback(async (frontFile: File, backFile: File | null, gender: string) => {
    const id = uuidv4()
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    // Bloquear UI inmediatamente antes de cualquier await
    setWorkspace('processing')
    setPhotosReceived(0)
    setAnalysisReceived(false)

    // Upload photos — si falla aquí volvemos al formulario
    let originalPhotoUrl: string
    let backPhotoUrl: string | null = null
    try {
      const fd1 = new FormData()
      fd1.append('file', frontFile)
      fd1.append('type', 'originals')
      const res1 = await fetch('/api/upload-image', { method: 'POST', body: fd1 }).then(r => r.json())
      originalPhotoUrl = res1.url

      if (backFile) {
        const fd2 = new FormData()
        fd2.append('file', backFile)
        fd2.append('type', 'originals')
        const res2 = await fetch('/api/upload-image', { method: 'POST', body: fd2 }).then(r => r.json())
        backPhotoUrl = res2.url
      }
    } catch {
      setWorkspace('empty')
      toast.error('Error al subir las fotos. Intenta de nuevo.')
      return
    }

    const newItem: SessionItem = {
      id,
      name: '',
      originalPhotoUrl,
      backPhotoUrl,
      ghostPhotoUrls: [null, null, null],
      description: '',
      categories: { genero: gender, tipo: '', estilo: [], ocasion: [], temporada: '', colores: [] },
      status: 'processing',
    }

    setItems((prev) => {
      const next = [...prev, newItem]
      saveSession(next)
      return next
    })
    setActiveId(id)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: originalPhotoUrl, imageUrl2: backPhotoUrl, gender }),
        signal: abort.signal,
      })

      if (!res.body) throw new Error('No stream')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const event = JSON.parse(line.slice(6))

          if (event.type === 'photo') {
            const shotIndex = event.shotIndex as number
            setPhotosReceived((n) => n + 1)
            setItems((prev) => {
              const next = prev.map((i) => {
                if (i.id !== id) return i
                const urls = [...i.ghostPhotoUrls]
                urls[shotIndex] = event.url
                return { ...i, ghostPhotoUrls: urls }
              })
              saveSession(next)
              return next
            })
          }

          if (event.type === 'analysis') {
            const analysis = event.analysis as ClothingAnalysis
            setAnalysisReceived(true)
            setItems((prev) => {
              const next = prev.map((i) => i.id !== id ? i : {
                ...i,
                name: analysis.name,
                description: analysis.description,
                categories: { ...analysis.categories, genero: gender },
              })
              saveSession(next)
              return next
            })
          }

          if (event.type === 'done') {
            setItems((prev) => {
              const next = prev.map((i) => i.id !== id ? i : { ...i, status: 'done' as const })
              saveSession(next)
              return next
            })
            setWorkspace('results')
          }

          if (event.type === 'error') {
            updateItem(id, { status: 'error' })
            setWorkspace('results')
            toast.error('Error al generar el contenido. Intenta de nuevo.')
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        updateItem(id, { status: 'error' })
        setWorkspace('results')
        toast.error('Error de conexión. Intenta de nuevo.')
      }
    }
  }, [updateItem])

  const handleExport = useCallback(async () => {
    const { default: JSZip } = await import('jszip')
    const { saveAs } = await import('file-saver')

    const done = items.filter((i) => i.status === 'done')
    if (done.length === 0) return

    const zip = new JSZip()
    const fotosFolder = zip.folder('fotos')!
    const datos = []

    for (const item of done) {
      const slug = (item.name || item.id).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
      const folder = fotosFolder.folder(slug)!

      for (let i = 0; i < item.ghostPhotoUrls.length; i++) {
        const url = item.ghostPhotoUrls[i]
        if (!url) continue
        try {
          const res = await fetch(url)
          const blob = await res.blob()
          folder.file(`foto_${i + 1}.jpg`, blob)
        } catch {}
      }

      datos.push({
        nombre: item.name,
        descripcion: item.description,
        categorias: item.categories,
      })
    }

    zip.file('datos.json', JSON.stringify(datos, null, 2))
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, `publicaya-export.zip`)
    toast.success(`Exportadas ${done.length} prendas`)
  }, [items])

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-white">
      {/* Mobile header */}
      <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-zinc-200 bg-zinc-50 flex-shrink-0">
        <Shirt className="w-5 h-5 text-zinc-700" />
        <span className="font-semibold text-zinc-900 text-sm flex-1">PublicaYa</span>
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="p-1.5 text-zinc-500 hover:text-zinc-800 relative"
          aria-label="Historial"
        >
          <Menu className="w-5 h-5" />
          {items.length > 0 && (
            <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-zinc-700 rounded-full" />
          )}
        </button>
      </header>

      <SessionSidebar
        items={items}
        activeId={activeId}
        onSelect={handleSelect}
        onNew={handleNew}
        onExport={handleExport}
        onDelete={handleDelete}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <main className="flex-1 overflow-y-auto">
        {workspace === 'empty' && (
          <div className="flex flex-col items-center justify-center min-h-full p-6">
            <div className="w-full max-w-md">
              <h2 className="text-xl font-semibold text-zinc-800 mb-1 text-center">Nueva prenda</h2>
              <p className="text-zinc-500 text-sm text-center mb-8">
                Sube fotos de la prenda y la IA generará fotos profesionales, descripción y categorías
              </p>
              <UploadZone onGenerate={handleGenerate} />
            </div>
          </div>
        )}

        {workspace === 'processing' && (
          <div className="flex items-center justify-center min-h-full p-8">
            <ProcessingView photosReceived={photosReceived} analysisReceived={analysisReceived} />
          </div>
        )}

        {workspace === 'results' && activeItem && (
          <div className="p-4 md:p-6 max-w-3xl mx-auto">
            <div className="mb-6">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5 block">
                Nombre de la prenda
              </label>
              <Input
                value={activeItem.name}
                onChange={(e) => updateItem(activeItem.id, { name: e.target.value })}
                placeholder="Nombre generado por IA..."
                className="text-base font-medium"
              />
            </div>

            <div className="flex flex-col gap-10">
              <ResultsPhotos
                originalUrl={activeItem.originalPhotoUrl}
                backUrl={activeItem.backPhotoUrl}
                ghostUrls={activeItem.ghostPhotoUrls}
                isProcessing={activeItem.status === 'processing'}
                regeneratingIndices={regeneratingIndices}
                onRegenerate={handleRegeneratePhoto}
              />

              <Separator />

              <ResultsDescription
                description={activeItem.description}
                onChange={(description) => updateItem(activeItem.id, { description })}
                isRegenerating={isRegeneratingDescription}
                onRegenerate={handleRegenerateDescription}
              />

              <Separator />

              <ResultsCategories
                categories={activeItem.categories}
                onChange={(categories) => updateItem(activeItem.id, { categories })}
              />

              <div className="h-6" />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
