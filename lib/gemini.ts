import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { TAXONOMY } from './taxonomy'

export { TAXONOMY }

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? '' })

const TEXT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
]

const IMAGE_MODELS = [
  'gemini-3.1-flash-image-preview',
  'gemini-2.5-flash-image',
]

// Per-call ceiling — if Gemini never responds, bail and move on
const SHOT_TIMEOUT_MS = 55_000

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

type ImageBase64 = { mimeType: string; data: string }

// Pass image as inlineData — no Files API upload, no hanging uploads
function makeImagePart(img: ImageBase64) {
  return { inlineData: { mimeType: img.mimeType, data: img.data } }
}

async function generateTextWithFallback(
  img: ImageBase64,
  textPrompt: string,
  img2?: ImageBase64
): Promise<string> {
  const parts = img2
    ? [makeImagePart(img), makeImagePart(img2), { text: textPrompt }]
    : [makeImagePart(img), { text: textPrompt }]
  let lastErr: unknown

  for (const model of TEXT_MODELS) {
    try {
      console.log(`[gemini:text] trying ${model}`)
      const r = await withTimeout(
        ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts }],
        }),
        30_000
      )
      if (!r) { console.warn(`[gemini:text] timeout on ${model}`); continue }
      console.log(`[gemini:text] done with ${model}`)
      return r.text ?? ''
    } catch (err: any) {
      lastErr = err
      console.error(`[gemini:text] error ${model}:`, err?.status, err?.message?.slice(0, 120))
      if (err?.status === 503 || err?.status === 429) {
        await new Promise((r) => setTimeout(r, 2000))
        continue
      }
      if (err?.status === 404) continue
      throw err
    }
  }
  throw lastErr
}

async function generateOneShot(img: ImageBase64, prompt: string, shotIndex: number, img2?: ImageBase64): Promise<string | null> {
  const parts = img2
    ? [makeImagePart(img), makeImagePart(img2), { text: prompt }]
    : [makeImagePart(img), { text: prompt }]

  for (const model of IMAGE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        console.log(`[gemini:img${shotIndex}] ${model} attempt ${attempt}`)
        const r = await withTimeout(
          ai.models.generateContent({
            model,
            contents: [{ role: 'user', parts }],
            config: { responseModalities: ['IMAGE'] },
          }),
          SHOT_TIMEOUT_MS
        )
        if (!r) {
          console.warn(`[gemini:img${shotIndex}] timeout on ${model}`)
          break // try next model
        }
        const parts = r.candidates?.[0]?.content?.parts ?? []
        for (const part of parts) {
          if ((part as any).inlineData?.data) {
            const { mimeType, data } = (part as any).inlineData
            console.log(`[gemini:img${shotIndex}] success with ${model}`)
            return `data:${mimeType};base64,${data}`
          }
        }
        console.warn(`[gemini:img${shotIndex}] no image in response from ${model}`)
        break
      } catch (err: any) {
        console.error(`[gemini:img${shotIndex}] error ${model}:`, err?.status, err?.message?.slice(0, 120))
        if (err?.status === 429 || err?.status === 503) {
          await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)))
          continue
        }
        break // fatal error, try next model
      }
    }
  }
  console.warn(`[gemini:img${shotIndex}] all models exhausted, returning null`)
  return null
}

// Quick gender detection — runs before photo generation so the mannequin sex is correct
export async function detectGender(img: ImageBase64): Promise<string> {
  const prompt = `Look at this clothing image and determine the intended wearer. Reply with ONLY one of these exact values, nothing else: "Mujer", "Hombre", "Unisex", "Niño/a"`
  try {
    console.log('[gemini:gender] detecting gender...')
    const text = await generateTextWithFallback(img, prompt)
    const cleaned = text.trim().replace(/['".,\n]/g, '')
    const valid = TAXONOMY.genero
    const match = valid.find((v) => cleaned.includes(v))
    const result = match ?? 'Unisex'
    console.log(`[gemini:gender] detected: ${result}`)
    return result
  } catch (err: any) {
    console.warn('[gemini:gender] detection failed, defaulting to Unisex:', err?.message)
    return 'Unisex' // never block photo generation over this
  }
}

// Build studio base prompt with the correct mannequin sex
function makeStudioBase(gender: string): string {
  const mannequinDesc =
    gender === 'Niño/a'
      ? 'CHILD — smaller frame, child-sized proportions, shorter stature'
      : gender === 'Mujer'
      ? 'FEMALE — feminine proportions: narrower shoulders, defined waist, curved hips, female body shape'
      : 'MALE — masculine proportions: broader shoulders, flat chest, straight hips, male body shape' // Hombre + Unisex → always male

  return `Generate a professional fashion editorial photograph using the provided clothing image as the exact reference for the garment.

LIGHTING — READ THIS FIRST:
Dramatic directional studio lighting — strong key light from one side for shape and depth, with a fill light close to the same intensity (maximum 1.5 stops under key) so shadow areas are dark but still show garment texture and color. NO crushed blacks. NO area of the garment is unreadable. Cinematic rim/edge lights from behind to sculpt the silhouette. The garment must be well-exposed and fully detailed everywhere.
INVISIBLE LIGHTS: The lighting is achieved by off-camera invisible light sources only. No physical lamps, no softboxes, no light fixtures, no studio equipment of any kind is visible anywhere in the image. The light sources do not appear — only their effect on the garment and silhouette is visible.

GARMENT FIDELITY — non-negotiable: reproduce every single detail of the garment faithfully: exact colors, fabric texture, weave, seams, stitching, prints, patterns, embroidery, buttons, zippers, cut, silhouette. Do not alter, smooth or invent any garment detail.

MANNEQUIN SEX: ${mannequinDesc}. This is mandatory — the ghost silhouette must have exactly these proportions and sex characteristics throughout the entire image.

GHOST SILHOUETTE — full body phantom:
The garment is worn by a full-body semi-transparent ghost/phantom silhouette visible from head to feet. The ghost body and ALL clothing worn by the ghost are made of the same uniform semi-transparent frosted-glass material — translucent throughout.
When the garment is a top/shirt/jacket: the ghost wears semi-transparent ghost trousers/pants on the lower body. These ghost pants are the same frosted-glass translucent material as the rest of the ghost — NOT opaque, NOT skin-colored, NOT bare legs.
When the garment is pants/skirt: the ghost wears a semi-transparent ghost shirt on the torso. Same translucent material.
THE GARMENT ITSELF must be fully opaque, sharp, and crisp — it is the only solid element. The ghost body and ghost clothing beneath are all uniformly translucent.

BACKGROUND: Plain light gray seamless gradient — clean empty background with nothing in it. No objects, no floor lines, no studio walls, no equipment, no props — only the smooth gradient and the figure.

COMPOSITION: Vertical portrait format, 3:4 aspect ratio. Generous breathing room on all sides. Sharp focus on garment.`
}

function makeGhostMannequinShots(gender: string): string[] {
  const base = makeStudioBase(gender)
  return [
    `${base}

SHOT 1 — Low boom, XYZ compound angle, explosive stride:
Camera: low (below hip level) boomed upward ~30° (Y-axis) + orbited left of center (X-axis) + 8° Dutch tilt clockwise (Z-axis roll). All three axes.
Pose: mid-explosive stride freeze-frame — front leg fully extended heel-striking, back leg pushing off, torso in full counter-rotation, one arm swung far forward, opposite arm back. Raw walking energy captured mid-motion.
Key light from front-left, fill from camera-right, cinematic rim from behind-right haloing the silhouette.`,

    `${base}

SHOT 2 — High crane, opposite XYZ compound, mid-spin toward left:
Camera: high (above shoulder level) angled down ~25° (Y-axis) + orbited far right of center (X-axis) + 10° Dutch tilt counter-clockwise (Z-axis). Three axes, mirrored configuration from Shot 1.
Pose: the figure moves and faces toward the LEFT — the complete mirror image of Shot 1 which moved toward the right. Mid-spin/pivot with the body rotating to the left: weight shifts left, leading shoulder drops left, the stride opens toward the left side of the frame. This creates a deliberate visual contrast with Shot 1 — same energy, opposite direction.
Garment fabric caught in implied motion flutter matching the leftward movement.
Key light from front-right, fill from camera-left, strong top-light from above accentuating the crane angle, rim from behind-left.`,

    `${base}

SHOT 3 — Eye-level rear diagonal, compound angle, garment tension:
Camera: mid-torso height (Y neutral) + rear-left diagonal ~150° from front (X-axis, mostly back with sliver of left side) + 6° Dutch tilt clockwise (Z-axis).
Pose: mid-lean-and-reach — upper body angled forward as if reaching, weight dramatically shifted to one hip, one heel lifted. The motion pulls and reveals back garment construction.
Shows clearly: back seams, rear neckline, back panels, closures, how the garment drapes during movement.
Key from front, dual cinematic rims from both rear sides painting the silhouette edge and revealing back garment construction.`,
  ]
}

export interface ClothingAnalysis {
  name: string
  description: string
  categories: {
    genero: string
    tipo: string
    estilo: string[]
    ocasion: string[]
    temporada: string
    colores: string[]
  }
}

export async function analyzeClothing(img: ImageBase64, img2?: ImageBase64): Promise<ClothingAnalysis> {
  const prompt = `Analyze this clothing photo and return ONLY a valid JSON object (no markdown, no explanation) with this exact structure:
{
  "name": "short product name in Spanish (e.g. 'Vestido floral manga larga')",
  "description": "Marketing description in Spanish divided into exactly 3 short labeled sections separated by newlines. Maximum 120 words total. Format:\nEstilo: [1-2 sentences about the garment's look, silhouette and personality]\nMaterial: [1-2 sentences about fabric feel, weight, and finish]\nCómo usarlo: [1-2 sentences with styling and occasion suggestions]",
  "categories": {
    "genero": one of ${JSON.stringify(TAXONOMY.genero)},
    "tipo": one of ${JSON.stringify(TAXONOMY.tipo)},
    "estilo": array of 1-2 values from ${JSON.stringify(TAXONOMY.estilo)},
    "ocasion": array of 1-2 values from ${JSON.stringify(TAXONOMY.ocasion)},
    "temporada": one of ${JSON.stringify(TAXONOMY.temporada)},
    "colores": array of 1-3 main colors in Spanish (e.g. "azul marino", "blanco roto", "estampado floral")
  }
}`

  const text = await generateTextWithFallback(img, prompt, img2)
  const cleaned = text.replace(/```json\n?|\n?```/g, '').trim()
  return JSON.parse(cleaned)
}

// Generate a single shot by index — used for per-photo regeneration
export async function generateGhostMannequinShot(
  img: ImageBase64,
  shotIndex: number,
  gender = 'Unisex',
  img2?: ImageBase64
): Promise<string | null> {
  const shots = makeGhostMannequinShots(gender)
  const prompt = shots[shotIndex]
  if (!prompt) return null
  return generateOneShot(img, prompt, shotIndex, img2)
}

export async function generateGhostMannequinStreaming(
  img: ImageBase64,
  onImage: (dataUrl: string, shotIndex: number) => Promise<void>,
  gender = 'Unisex',
  img2?: ImageBase64
): Promise<void> {
  const shots = makeGhostMannequinShots(gender)
  console.log(`[gemini] starting 3 shots in parallel (gender: ${gender})`)
  await Promise.allSettled(
    shots.map(async (prompt, i) => {
      const dataUrl = await generateOneShot(img, prompt, i, img2)
      if (dataUrl) await onImage(dataUrl, i)
    })
  )
  console.log('[gemini] all shots settled')
}
