# PublicaYa — Clothing Studio

Genera fotos profesionales con maniquí invisible, descripción y categorías para publicaciones de ropa, directamente desde tu teléfono.

## Requisitos

- Node.js v18+
- API Key de Google Gemini

## Setup

```bash
# 1. Clonar el repo
git clone git@github.com:Anabalon-uch/publicaya.git
cd publicaya

# 2. Instalar dependencias
npm install

# 3. Crear archivo de variables de entorno
cp .env.example .env.local
# Edita .env.local y agrega tu GEMINI_API_KEY
```

## Obtener una API Key de Gemini

1. Ve a https://aistudio.google.com/apikey
2. Crea una API key gratuita
3. Pégala en `.env.local` como `GEMINI_API_KEY=tu_key_aqui`

## Correr el proyecto

```bash
npm run dev
```

Abre http://localhost:3000 en tu navegador, o http://localhost:3000/studio para ir directo al studio.

## Uso

1. Sube una foto frontal de la prenda (y opcionalmente la trasera)
2. Elige el género del maniquí
3. Haz clic en **Generar contenido**
4. La IA genera 3 fotos con maniquí invisible + descripción + categorías
5. Descarga las fotos o copia la descripción para tu publicación
