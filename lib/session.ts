export interface SessionItem {
  id: string
  name: string
  originalPhotoUrl: string
  backPhotoUrl?: string | null
  ghostPhotoUrls: (string | null)[]
  description: string
  categories: {
    genero: string
    tipo: string
    estilo: string[]
    ocasion: string[]
    temporada: string
    colores: string[]
  }
  status: 'idle' | 'processing' | 'done' | 'error'
}

const SESSION_KEY = 'clothing-studio-session'

export function loadSession(): SessionItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveSession(items: SessionItem[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SESSION_KEY, JSON.stringify(items))
}

export function clearSession(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(SESSION_KEY)
}
