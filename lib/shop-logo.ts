const API_VERSION = process.env.SHOPIFY_API_VERSION ?? '2026-07'

export type ShopLogo = { url: string; width: number | null; height: number | null } | null

/**
 * Legge il logo del brand dalla Storefront API in tokenless access.
 *
 * Non richiede access token ne scope aggiuntivi: il campo shop.brand.logo
 * non esiste nell'Admin API, vive solo nella Storefront API, ed e'
 * raggiungibile senza autenticazione.
 *
 * Ritorna null in ogni caso di fallimento — merchant senza brand asset
 * compilata, canale Online Store bloccato (tipico dei dev store), negozio
 * headless, throttling, errore di rete. Il chiamante ricade sul wordmark.
 */
export async function fetchShopLogo(shop: string): Promise<ShopLogo> {
  try {
    const res = await fetch(`https://${shop}/api/${API_VERSION}/graphql.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `{ shop { brand { logo { image { url width height } } } } }`,
      }),
      // niente token: tokenless access
    })

    if (!res.ok) {
      console.warn(`[shop-logo] ${shop}: HTTP ${res.status}`)
      return null
    }

    const json = await res.json()

    if (json.errors) {
      console.warn(`[shop-logo] ${shop}: ${json.errors[0]?.message ?? 'errore sconosciuto'}`)
      return null
    }

    const img = json?.data?.shop?.brand?.logo?.image
    if (!img?.url) {
      console.warn(`[shop-logo] ${shop}: nessun logo impostato nelle brand asset`)
      return null
    }

    return { url: img.url, width: img.width ?? null, height: img.height ?? null }
  } catch (err) {
    console.warn(`[shop-logo] ${shop}: ${err instanceof Error ? err.message : String(err)}`)
    return null
  }
}

/**
 * Il CDN Shopify accetta i parametri di trasformazione: evita di servire
 * un PNG da 2000px dove ne bastano 240.
 */
export function sizedLogoUrl(url: string, width = 240): string {
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}width=${width}`
}
