/**
 * Malyte — Catena di risoluzione durata step (redesign-brief.md §4)
 * -------------------------------------------------------------------
 * Unico punto da toccare quando il prompt inizierà a emettere
 * `duration_seconds` sullo step. Fino ad allora la catena scende
 * su categoria -> parola chiave sul titolo -> default.
 *
 * Nessun accesso DB qui: riceve dati già risolti da enrich-step.ts.
 */

export type DurationSource = 'step' | 'category' | 'keyword' | 'default'

export interface DurationResolutionInput {
  /** Non esiste ancora in nessun piano reale, ma la catena lo prevede per primo. */
  duration_seconds?: number | null
  /**
   * Categoria normalizzata (es. valore di catalog_item_tags.routine_step,
   * dopo il mapping alias in resolveStepDuration).
   */
  category?: string | null
  product_title?: string | null
}

export interface DurationResolution {
  seconds: number
  source: DurationSource
}

export const DURATIONS: Record<string, number> = {
  cleanser: 30,
  serum: 30,
  moisturizer: 20,
  sunscreen: 20,
  toner: 15,
  eye_cream: 20,
  exfoliant: 60,
  mask: 600,
  essence: 15,
  oil: 30,
  treatment: 45,
  default: 30,
}

/**
 * Il vocabolario AI in catalog_item_tags (routine_step, vedi
 * lib/shopify/sync-and-tag.ts) non coincide 1:1 con le chiavi di DURATIONS:
 * usa 'spf' invece di 'sunscreen' e 'eye' invece di 'eye_cream'. Il mapping
 * vive solo qui, così un domani un cambio di vocabolario tag si aggiorna
 * in un solo punto.
 */
const CATEGORY_ALIASES: Record<string, string> = {
  spf: 'sunscreen',
  eye: 'eye_cream',
}

/**
 * Fallback per titolo prodotto. Copre anche le categorie (exfoliant,
 * essence, oil) che il tagger AI non emette mai oggi (vedi vocabolario in
 * sync-and-tag.ts) e che quindi arrivano SOLO da qui, mai dall'anello 2.
 */
const KEYWORD_MAP: Array<[RegExp, string]> = [
  [/sunscreen|spf/i, 'sunscreen'],
  [/cleanser|cleansing|face wash/i, 'cleanser'],
  [/serum/i, 'serum'],
  [/eye cream|eye contour|eye gel/i, 'eye_cream'],
  [/moisturi[sz]er/i, 'moisturizer'],
  [/toner/i, 'toner'],
  [/exfoliant|exfoliat|peel/i, 'exfoliant'],
  [/mask/i, 'mask'],
  [/essence/i, 'essence'],
  [/\boil\b/i, 'oil'],
  [/treatment/i, 'treatment'],
]

export function resolveStepDuration(input: DurationResolutionInput): DurationResolution {
  if (typeof input.duration_seconds === 'number' && input.duration_seconds > 0) {
    return { seconds: input.duration_seconds, source: 'step' }
  }

  if (input.category) {
    const normalized = CATEGORY_ALIASES[input.category] || input.category
    if (normalized in DURATIONS) {
      return { seconds: DURATIONS[normalized], source: 'category' }
    }
  }

  if (input.product_title) {
    for (const [pattern, key] of KEYWORD_MAP) {
      if (pattern.test(input.product_title)) {
        return { seconds: DURATIONS[key], source: 'keyword' }
      }
    }
  }

  return { seconds: DURATIONS.default, source: 'default' }
}

/** Es. 30 -> "30 sec", 600 -> "10 min". Condiviso tra layer stack e Guided Routine. */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} sec`
  return `${Math.round(seconds / 60)} min`
}
