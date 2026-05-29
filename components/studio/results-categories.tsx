'use client'

import { TAXONOMY } from '@/lib/taxonomy'
import { cn } from '@/lib/utils'
import type { SessionItem } from '@/lib/session'

type Categories = SessionItem['categories']

interface ResultsCategoriesProps {
  categories: Categories
  onChange: (categories: Categories) => void
}

function Chip({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
        selected
          ? 'bg-zinc-900 text-white border-zinc-900'
          : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-400 hover:text-zinc-800'
      )}
    >
      {label}
    </button>
  )
}

interface ChipGroupProps {
  label: string
  options: string[]
  multi?: boolean
  value: string | string[]
  onChange: (v: string | string[]) => void
}

function ChipGroup({ label, options, multi, value, onChange }: ChipGroupProps) {
  const selected = Array.isArray(value) ? value : [value]

  const toggle = (opt: string) => {
    if (multi) {
      const arr = Array.isArray(value) ? value : [value]
      onChange(arr.includes(opt) ? arr.filter((v) => v !== opt) : [...arr, opt])
    } else {
      onChange(opt)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <Chip
            key={opt}
            label={opt}
            selected={selected.includes(opt)}
            onClick={() => toggle(opt)}
          />
        ))}
      </div>
    </div>
  )
}

export function ResultsCategories({ categories, onChange }: ResultsCategoriesProps) {
  const update = (key: keyof Categories) => (v: string | string[]) => {
    onChange({ ...categories, [key]: v })
  }

  return (
    <div className="flex flex-col gap-6">
      <ChipGroup
        label="Género"
        options={TAXONOMY.genero}
        value={categories.genero}
        onChange={update('genero')}
      />
      <ChipGroup
        label="Tipo de prenda"
        options={TAXONOMY.tipo}
        value={categories.tipo}
        onChange={update('tipo')}
      />
      <ChipGroup
        label="Estilo"
        options={TAXONOMY.estilo}
        multi
        value={categories.estilo}
        onChange={update('estilo')}
      />
      <ChipGroup
        label="Ocasión"
        options={TAXONOMY.ocasion}
        multi
        value={categories.ocasion}
        onChange={update('ocasion')}
      />
      <ChipGroup
        label="Temporada"
        options={TAXONOMY.temporada}
        value={categories.temporada}
        onChange={update('temporada')}
      />

      {categories.colores.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Colores detectados</p>
          <div className="flex flex-wrap gap-2">
            {categories.colores.map((c) => (
              <span key={c} className="px-3 py-1.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
