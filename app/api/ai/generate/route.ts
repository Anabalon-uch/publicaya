import { NextRequest } from 'next/server'
import { readFile, writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { generateGhostMannequinStreaming, generateGhostMannequinShot, analyzeClothing } from '@/lib/gemini'

export const maxDuration = 180

const MAX_SIDE = 1024

async function padToPortrait(buf: Buffer): Promise<Buffer> {
  const { width = 1024, height = 1024 } = await sharp(buf).metadata()
  const targetH = Math.max(height, Math.round(width * 4 / 3))
  const targetW = Math.round(targetH * 3 / 4)
  return sharp(buf)
    .resize(targetW, targetH, { fit: 'contain', background: { r: 230, g: 230, b: 230 } })
    .jpeg({ quality: 92 })
    .toBuffer()
}

async function readAndResize(imageUrl: string): Promise<{ mimeType: string; data: string }> {
  const localPath = path.join(process.cwd(), 'public', imageUrl)
  const fileBuffer = await readFile(localPath)
  const resized = await sharp(fileBuffer)
    .resize(MAX_SIDE, MAX_SIDE, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer()
  return { mimeType: 'image/jpeg', data: resized.toString('base64') }
}

// Anverso (izquierda) + reverso (derecha) en una sola imagen para el modelo generador
async function compositeForGeneration(
  img: { mimeType: string; data: string },
  img2: { mimeType: string; data: string }
): Promise<{ mimeType: string; data: string }> {
  const SIDE = 512
  const H = Math.round(SIDE * 4 / 3)
  const bg = { r: 230, g: 230, b: 230 }
  const [r1, r2] = await Promise.all([
    sharp(Buffer.from(img.data, 'base64')).resize(SIDE, H, { fit: 'contain', background: bg }).jpeg({ quality: 85 }).toBuffer(),
    sharp(Buffer.from(img2.data, 'base64')).resize(SIDE, H, { fit: 'contain', background: bg }).jpeg({ quality: 85 }).toBuffer(),
  ])
  const combined = await sharp({ create: { width: SIDE * 2, height: H, channels: 3, background: bg } })
    .composite([{ input: r1, left: 0, top: 0 }, { input: r2, left: SIDE, top: 0 }])
    .jpeg({ quality: 85 })
    .toBuffer()
  return { mimeType: 'image/jpeg', data: combined.toString('base64') }
}

export async function POST(request: NextRequest) {
  const { imageUrl, imageUrl2, mode = 'all', shotIndex, gender: clientGender } = await request.json() as {
    imageUrl: string
    imageUrl2?: string | null
    mode?: 'all' | 'photo' | 'description'
    shotIndex?: number
    gender?: string
  }

  const aiDir = path.join(process.cwd(), 'public', 'uploads', 'ai')
  await mkdir(aiDir, { recursive: true })

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))

      const keepAlive = setInterval(
        () => controller.enqueue(encoder.encode(': keepalive\n\n')),
        15_000
      )

      const saveImage = async (dataUrl: string): Promise<string> => {
        const base64Data = dataUrl.split(',')[1]
        if (!base64Data) return ''
        const raw = Buffer.from(base64Data, 'base64')
        const padded = await padToPortrait(raw)
        const filename = `${uuidv4()}.jpg`
        await writeFile(path.join(aiDir, filename), padded)
        return `/uploads/ai/${filename}`
      }

      try {
        console.log('[generate] reading images...')
        const img = await readAndResize(imageUrl)
        const img2 = imageUrl2 ? await readAndResize(imageUrl2) : undefined
        console.log(`[generate] mode=${mode}, img2=${!!img2}, gender=${clientGender}`)

        if (mode === 'photo') {
          const gender = clientGender || 'Unisex'
          const idx = shotIndex ?? 0
          const imgForGen = img2 ? await compositeForGeneration(img, img2) : img
          const dataUrl = await generateGhostMannequinShot(imgForGen, idx, gender, !!img2)
          if (dataUrl) {
            const url = await saveImage(dataUrl)
            if (url) send({ type: 'photo', url, shotIndex: idx })
          }
        } else if (mode === 'description') {
          await analyzeClothing(img, img2)
            .then((analysis) => send({ type: 'analysis', analysis }))
            .catch(() => send({ type: 'analysis_error' }))
        } else {
          // 'all' — gender comes from client, no detection needed
          const gender = clientGender || 'Unisex'
          console.log(`[generate] gender=${gender}, starting photos + analysis`)
          const imgForGen = img2 ? await compositeForGeneration(img, img2) : img

          await Promise.allSettled([
            generateGhostMannequinStreaming(imgForGen, async (dataUrl, idx) => {
              const url = await saveImage(dataUrl)
              if (url) send({ type: 'photo', url, shotIndex: idx })
            }, gender, !!img2),
            analyzeClothing(img, img2)
              .then((analysis) => {
                console.log('[generate] analysis done')
                send({ type: 'analysis', analysis })
              })
              .catch((err) => {
                console.error('[generate] analysis error:', err?.message)
                send({ type: 'analysis_error' })
              }),
          ])
        }

        console.log('[generate] all done, sending done event')
        send({ type: 'done' })
      } catch (err: any) {
        console.error('[generate] fatal error:', err?.message)
        send({ type: 'error' })
      } finally {
        clearInterval(keepAlive)
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Cache-Control': 'no-cache',
    },
  })
}
