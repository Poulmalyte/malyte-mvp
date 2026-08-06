import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Completamento giornaliero degli step (step_completions).
 *
 * GET  ?token=...  -> gli step gia' completati OGGI per quel token
 * POST { token, period, stepNumber } -> segna lo step come fatto oggi
 *
 * Il giorno e' calcolato server-side e fa parte della chiave unica: non
 * serve nessun reset notturno, domani le stesse righe semplicemente non
 * corrispondono piu' alla data corrente e la routine risulta da fare.
 * Il token e' l'unica credenziale, come per la pagina che lo mostra.
 */
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'token mancante' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('step_completions')
    .select('period, step_number')
    .eq('token', token)
    .eq('completed_on', today())

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    completed: (data || []).map((row) => `${row.period}-${row.step_number}`),
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const token = body?.token
  const period = body?.period
  const stepNumber = body?.stepNumber

  if (!token || (period !== 'morning' && period !== 'evening') || typeof stepNumber !== 'number') {
    return NextResponse.json({ error: 'parametri non validi' }, { status: 400 })
  }

  // Il token deve esistere: senza questo controllo chiunque potrebbe
  // riempire la tabella con token inventati.
  const { data: plan } = await supabaseAdmin
    .from('brand_plans')
    .select('token')
    .eq('token', token)
    .maybeSingle()

  if (!plan) {
    return NextResponse.json({ error: 'token non valido' }, { status: 404 })
  }

  // onConflict sulla chiave unica: premere due volte non crea doppioni
  // e non e' un errore per il client.
  const { error } = await supabaseAdmin
    .from('step_completions')
    .upsert(
      { token, completed_on: today(), period, step_number: stepNumber },
      { onConflict: 'token,completed_on,period,step_number' }
    )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
