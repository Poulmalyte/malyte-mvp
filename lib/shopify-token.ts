import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// Margine di sicurezza: rinnova il token se scade entro 5 min.
// L'access token dura ~60 min; rinnovando in anticipo evitiamo chiamate al limite.
const REFRESH_MARGIN_MS = 5 * 60 * 1000

type Installation = {
  shop_domain: string
  access_token: string | null
  refresh_token: string | null
  token_expires_at: string | null
}

/**
 * Ritorna un access_token Shopify SEMPRE valido per lo shop indicato.
 * Se il token è ancora buono lo restituisce; se sta per scadere (o è scaduto)
 * usa il refresh_token per ottenerne uno nuovo, lo salva nel DB e lo restituisce.
 *
 * Ogni chiamata all'Admin API di Shopify deve passare da qui, MAI leggere
 * access_token grezzo dalla tabella.
 */
export async function getValidAccessToken(shop: string): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from('shopify_installations')
    .select('shop_domain, access_token, refresh_token, token_expires_at')
    .eq('shop_domain', shop)
    .single()

  if (error || !data) {
    throw new Error(`[shopify-token] Nessuna installazione trovata per ${shop}`)
  }

  const inst = data as Installation

  if (!inst.access_token) {
    throw new Error(`[shopify-token] access_token mancante per ${shop}`)
  }

  // Token ancora valido con margine? Restituiscilo così com'è.
  if (inst.token_expires_at) {
    const expiresAt = new Date(inst.token_expires_at).getTime()
    if (expiresAt - Date.now() > REFRESH_MARGIN_MS) {
      return inst.access_token
    }
  } else {
    // Nessuna scadenza registrata: token vecchio stile, lo usiamo com'è
    // (verrà sostituito da uno expiring al prossimo refresh/reinstall).
    return inst.access_token
  }

  // Token scaduto o in scadenza: serve il refresh.
  if (!inst.refresh_token) {
    console.warn(`[shopify-token] refresh_token mancante per ${shop}, uso token esistente`)
    return inst.access_token
  }

  return await refreshAccessToken(shop, inst.refresh_token)
}

/**
 * Scambia refresh_token -> nuova coppia (access + refresh) e salva nel DB.
 * Gestisce il retry one-shot richiesto da Shopify: se la prima richiesta non
 * risponde, Shopify può restituire la stessa coppia entro una breve finestra.
 */
async function refreshAccessToken(shop: string, refreshToken: string): Promise<string> {
  const doRefresh = async () =>
    fetch(`https://${shop}/admin/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.SHOPIFY_CLIENT_ID,
        client_secret: process.env.SHOPIFY_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

  let res: Response
  try {
    res = await doRefresh()
  } catch {
    // Nessuna risposta: retry immediato con lo stesso refresh_token (regola Shopify).
    res = await doRefresh()
  }

  const tokenData = await res.json()

  if (!res.ok || !tokenData.access_token) {
    console.error(`[shopify-token] Refresh fallito per ${shop}:`, JSON.stringify(tokenData))
    throw new Error(`[shopify-token] Refresh token fallito per ${shop}`)
  }

  const access_token = tokenData.access_token as string
  const new_refresh_token = (tokenData.refresh_token as string) || refreshToken
  const expires_in = (tokenData.expires_in as number) || null
  const token_expires_at = expires_in
    ? new Date(Date.now() + expires_in * 1000).toISOString()
    : null

  const { error: updateError } = await supabaseAdmin
    .from('shopify_installations')
    .update({
      access_token,
      refresh_token: new_refresh_token,
      token_expires_at,
    })
    .eq('shop_domain', shop)

  if (updateError) {
    console.error(`[shopify-token] Errore salvataggio token rinnovato per ${shop}:`, updateError)
    // Il token è comunque valido in memoria: lo restituiamo per non bloccare la chiamata.
  }

  console.log(`[shopify-token] Token rinnovato per ${shop}, scade ${token_expires_at}`)
  return access_token
}
