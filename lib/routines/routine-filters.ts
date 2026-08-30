/**
 * Valutazione dei filtri "Who should receive this routine?".
 * Funzione pura: nessun accesso al DB, testabile in isolamento.
 */

export type FilterRule =
  | { type: 'order_value'; op: 'gt' | 'lt'; value: number }
  | { type: 'item_count'; op: 'gte' | 'lte'; value: number }

export type RoutineFilters = {
  all_customers: boolean
  rules: FilterRule[]
}

export const DEFAULT_FILTERS: RoutineFilters = {
  all_customers: true,
  rules: [],
}

type OrderLike = {
  total_price: number | string | null
  order_currency: string | null
  line_items: Array<{ quantity?: number | null }> | null
}

export type FilterDecision = {
  send: boolean
  reason: string
}

/** Somma le quantita' di tutte le righe d'ordine (pezzi, non SKU). */
export function countItems(lineItems: OrderLike['line_items']): number | null {
  if (!Array.isArray(lineItems) || lineItems.length === 0) return null
  return lineItems.reduce((sum, i) => {
    const q = typeof i?.quantity === 'number' ? i.quantity : 1
    return sum + (q > 0 ? q : 0)
  }, 0)
}

function normalizeFilters(raw: unknown): RoutineFilters {
  if (!raw || typeof raw !== 'object') return DEFAULT_FILTERS
  const f = raw as Partial<RoutineFilters>
  if (f.all_customers === true) return DEFAULT_FILTERS
  if (!Array.isArray(f.rules)) return DEFAULT_FILTERS
  return { all_customers: false, rules: f.rules }
}

/**
 * Ritorna se la routine va inviata a questo ordine.
 * Regole in AND. Dato mancante su regola attiva => non invia.
 */
export function evaluateFilters(
  order: OrderLike,
  rawFilters: unknown,
  storeCurrency?: string | null,
): FilterDecision {
  const filters = normalizeFilters(rawFilters)

  if (filters.rules.length === 0) {
    return { send: true, reason: 'no_filters' }
  }

  for (const rule of filters.rules) {
    if (rule.type === 'order_value') {
      const raw = order.total_price
      const price = typeof raw === 'string' ? parseFloat(raw) : raw
      if (price == null || Number.isNaN(price)) {
        return { send: false, reason: 'order_value_missing' }
      }
      if (
        order.order_currency &&
        storeCurrency &&
        order.order_currency !== storeCurrency
      ) {
        return { send: false, reason: 'currency_mismatch' }
      }
      if (rule.op === 'gt' && !(price > rule.value)) {
        return { send: false, reason: 'order_value_below' }
      }
      if (rule.op === 'lt' && !(price < rule.value)) {
        return { send: false, reason: 'order_value_above' }
      }
      continue
    }

    if (rule.type === 'item_count') {
      const count = countItems(order.line_items)
      if (count == null) {
        return { send: false, reason: 'item_count_missing' }
      }
      if (rule.op === 'gte' && !(count >= rule.value)) {
        return { send: false, reason: 'item_count_below' }
      }
      if (rule.op === 'lte' && !(count <= rule.value)) {
        return { send: false, reason: 'item_count_above' }
      }
      continue
    }
  }

  return { send: true, reason: 'all_rules_passed' }
}
