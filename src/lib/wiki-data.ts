import { createClient } from '@/lib/supabase/server'
import { cache } from 'react'
import type { Pays } from '@/data/pays'
import type { Race } from '@/data/races'
import type { Ryximus } from '@/data/ryximus'
import type { Block } from '@/types/blocks'

type MagieData = {
  intro?: string
  sections: { titre: string; contenu: string }[]
  affinites: { element: string; description: string }[]
  blocks?: Block[]
}
type AnnexeData = { label: string; titre: string; contenu: string }
export type AnnexeWithTs = AnnexeData & { updatedAt: string | null }

function isConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

const LOREM_HTML = '<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'

function placeholderBlock(titre = 'Contenu à venir'): Block {
  return { id: 'placeholder', type: 'text', titre, contenu: LOREM_HTML }
}

function placeholderPays(slug = 'exemple'): Pays {
  return { slug, nom: 'Lorem Ipsum', couleur: '#747474', blocks: [placeholderBlock()] }
}

function placeholderRace(slug = 'exemple'): Race {
  return { slug, nom: 'Lorem Ipsum', couleur: '#747474', image: '', population: 0, esperanceVie: '—', blocks: [placeholderBlock()] }
}

function placeholderRyximus(slug = 'exemple'): Ryximus {
  return { slug, nom: 'Lorem Ipsum', genre: 'Masculin', element: 'Lorem', couleur: '#747474', image: '', personnalite: LOREM_HTML, conditionPacte: LOREM_HTML, blocks: [placeholderBlock()] }
}

function placeholderMagie(): MagieData {
  return { intro: 'Lorem ipsum dolor sit amet.', sections: [], affinites: [], blocks: [placeholderBlock()] }
}

export type NavigationItem = {
  slug: string
  nom: string
  isDraft: boolean
}

async function getNavigationItems(table: 'pays' | 'races' | 'ryximus', fallback: NavigationItem[]): Promise<NavigationItem[]> {
  if (!isConfigured()) return fallback

  try {
    const supabase = await createClient()
    const { data } = await supabase.from(table).select('slug,nom:data->>nom,isDraft:data->>isDraft')
    if (!data?.length) return fallback

    return (data as unknown as { slug: string; nom: string | null; isDraft: string | null }[]).map((row) => ({
      slug: row.slug,
      nom: row.nom ?? '',
      isDraft: row.isDraft === 'true',
    }))
  } catch {
    return fallback
  }
}

export function getPaysNavigationItems() {
  return getNavigationItems('pays', [{ slug: 'exemple', nom: 'Lorem Ipsum', isDraft: false }])
}

export function getRacesNavigationItems() {
  return getNavigationItems('races', [{ slug: 'exemple', nom: 'Lorem Ipsum', isDraft: false }])
}

export function getRyximusNavigationItems() {
  return getNavigationItems('ryximus', [{ slug: 'exemple', nom: 'Lorem Ipsum', isDraft: false }])
}
function makeBlock(titre: string, contenu: unknown, type: Block['type'] = 'text'): Block | null {
  if (!contenu || typeof contenu !== 'string' || !contenu.trim()) return null
  return { id: titre.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''), type, titre, contenu }
}

function migratePaysData(slug: string, data: unknown): Pays {
  const d = data as Record<string, unknown>
  const isDraft = d.isDraft === true
  if (Array.isArray(d.blocks)) return { slug, nom: String(d.nom ?? ''), couleur: String(d.couleur ?? '#747474'), blocks: d.blocks as Block[], isDraft }
  const blocks: Block[] = [
    makeBlock('Géographie', d.geographie),
    makeBlock('Histoire', d.histoire),
    makeBlock('Politique interne', d.politiqueInterne),
    makeBlock('Politique externe', d.politiqueExterne),
    makeBlock('Mode de vie', d.modeDeVie),
    makeBlock('Traditions', d.traditions, 'list'),
    makeBlock('Société', d.societe),
    makeBlock('Magie', d.magie),
  ].filter((b): b is Block => b !== null)
  return { slug, nom: String(d.nom ?? ''), couleur: String(d.couleur ?? '#747474'), blocks, isDraft }
}

function migrateRaceData(slug: string, data: unknown): Race {
  const d = data as Record<string, unknown>
  const isDraft = d.isDraft === true
  if (Array.isArray(d.blocks)) {
    return {
      slug,
      nom: String(d.nom ?? ''),
      couleur: String(d.couleur ?? '#747474'),
      image: String(d.image ?? ''),
      population: Number(d.population ?? 0),
      esperanceVie: String(d.esperanceVie ?? ''),
      blocks: d.blocks as Block[],
      isDraft,
    }
  }
  const blocks: Block[] = [
    makeBlock('Description', d.description),
    makeBlock('Histoire', d.histoire),
    makeBlock('Apparence physique', d.physique),
    makeBlock('Magie', d.magie),
    makeBlock('Société', d.societe),
  ].filter((b): b is Block => b !== null)
  return {
    slug,
    nom: String(d.nom ?? ''),
    couleur: String(d.couleur ?? '#747474'),
    image: String(d.image ?? ''),
    population: Number(d.population ?? 0),
    esperanceVie: String(d.esperanceVie ?? ''),
    blocks,
    isDraft,
  }
}

// ── Pays ──────────────────────────────────────────────────────────────────────

export async function getAllPays(): Promise<Pays[]> {
  if (!isConfigured()) return [placeholderPays()]
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('pays').select('slug, data')
    if (!data?.length) return [placeholderPays()]
    return data.map((row) => migratePaysData(row.slug, row.data))
  } catch {
    return [placeholderPays()]
  }
}

export async function getPays(slug: string): Promise<{ data: Pays | null; updatedAt: string | null }> {
  if (!isConfigured()) {
    const data = placeholderPays(slug)
    return { data, updatedAt: null }
  }
  try {
    const supabase = await createClient()
    const { data: row } = await supabase.from('pays').select('slug, data, updated_at').eq('slug', slug).single()
    if (!row) {
      return { data: placeholderPays(slug), updatedAt: null }
    }
    return {
      data: migratePaysData(row.slug, row.data),
      updatedAt: row.updated_at ?? null,
    }
  } catch {
    return { data: placeholderPays(slug), updatedAt: null }
  }
}

// ── Races ─────────────────────────────────────────────────────────────────────

export async function getAllRaces(): Promise<Race[]> {
  if (!isConfigured()) return [placeholderRace()]
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('races').select('slug, data')
    if (!data?.length) return [placeholderRace()]
    return data.map((row) => migrateRaceData(row.slug, row.data))
  } catch {
    return [placeholderRace()]
  }
}

export async function getRace(slug: string): Promise<{ data: Race | null; updatedAt: string | null }> {
  if (!isConfigured()) {
    const data = placeholderRace(slug)
    return { data, updatedAt: null }
  }
  try {
    const supabase = await createClient()
    const { data: row } = await supabase.from('races').select('slug, data, updated_at').eq('slug', slug).single()
    if (!row) {
      return { data: placeholderRace(slug), updatedAt: null }
    }
    return {
      data: migrateRaceData(row.slug, row.data),
      updatedAt: row.updated_at ?? null,
    }
  } catch {
    return { data: placeholderRace(slug), updatedAt: null }
  }
}

// ── Ryximus ───────────────────────────────────────────────────────────────────

export async function getAllRyximus(): Promise<Ryximus[]> {
  if (!isConfigured()) return [placeholderRyximus()]
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('ryximus').select('slug, data')
    if (!data?.length) return [placeholderRyximus()]
    return data.map((row) => ({ slug: row.slug, ...(row.data as Omit<Ryximus, 'slug'>) }))
  } catch {
    return [placeholderRyximus()]
  }
}

export async function getRyximus(slug: string): Promise<{ data: Ryximus | null; updatedAt: string | null }> {
  if (!isConfigured()) {
    const data = placeholderRyximus(slug)
    return { data, updatedAt: null }
  }
  try {
    const supabase = await createClient()
    const { data: row } = await supabase.from('ryximus').select('slug, data, updated_at').eq('slug', slug).single()
    if (!row) {
      return { data: placeholderRyximus(slug), updatedAt: null }
    }
    return {
      data: { slug: row.slug, ...(row.data as Omit<Ryximus, 'slug'>) },
      updatedAt: row.updated_at ?? null,
    }
  } catch {
    return { data: placeholderRyximus(slug), updatedAt: null }
  }
}

// ── Magie ─────────────────────────────────────────────────────────────────────

export async function getMagie(): Promise<{ data: MagieData; updatedAt: string | null }> {
  if (!isConfigured()) return { data: placeholderMagie(), updatedAt: null }
  try {
    const supabase = await createClient()
    const { data: row } = await supabase.from('magie').select('data, updated_at').eq('id', 1).single()
    if (!row?.data) return { data: placeholderMagie(), updatedAt: null }
    return { data: row.data as MagieData, updatedAt: row.updated_at ?? null }
  } catch {
    return { data: placeholderMagie(), updatedAt: null }
  }
}

// ── Annexes ───────────────────────────────────────────────────────────────────

const DEFAULT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

export async function getAllAnnexes(): Promise<AnnexeWithTs[]> {
  if (!isConfigured()) {
    return DEFAULT_LABELS.map((label) => ({ label, titre: `Annexe ${label}`, contenu: LOREM_HTML, updatedAt: null }))
  }
  try {
    const supabase = await createClient()
    const { data } = await supabase.from('annexes').select('label, data, updated_at')
    if (!data?.length) {
      return DEFAULT_LABELS.map((label) => ({ label, titre: `Annexe ${label}`, contenu: LOREM_HTML, updatedAt: null }))
    }
    return data.map((row) => ({
      label: row.label,
      ...(row.data as Omit<AnnexeData, 'label'>),
      updatedAt: row.updated_at ?? null,
    }))
  } catch {
    return DEFAULT_LABELS.map((label) => ({ label, titre: `Annexe ${label}`, contenu: LOREM_HTML, updatedAt: null }))
  }
}

// ── Current user ──────────────────────────────────────────────────────────────

export const getCurrentUser = cache(async () => {
  if (!isConfigured()) return null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch {
    return null
  }
})
