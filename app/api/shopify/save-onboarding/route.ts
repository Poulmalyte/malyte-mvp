import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { step, data } = body

    if (!step || !data) {
      return NextResponse.json({ error: 'Missing step or data' }, { status: 400 })
    }

    switch (step) {

      case 1: {
        // Aggiorna merchants
        const merchantUpdate: Record<string, any> = {}
        if (data.seller_type) merchantUpdate.seller_type = data.seller_type
        if (data.category) merchantUpdate.category = data.category
        if (data.name) merchantUpdate.name = data.name

        if (Object.keys(merchantUpdate).length > 0) {
          await supabaseAdmin
            .from('merchants')
            .update(merchantUpdate)
            .eq('id', user.id)
        }

        // Aggiorna anche experts per compatibilità legacy
        await supabaseAdmin
          .from('experts')
          .update({
            ...(data.seller_type && { seller_type: data.seller_type }),
            ...(data.category && { category: data.category }),
          })
          .eq('id', user.id)

        // Aggiorna merchant_profiles
        await supabaseAdmin
          .from('merchant_profiles')
          .upsert({
            merchant_id: user.id,
            philosophy: data.philosophy || null,
            tone_of_voice: data.tone_of_voice || null,
            hero_ingredients: data.hero_ingredients || null,
            avoid_ingredients: data.avoid_ingredients || null,
            target_skin_types: data.target_customer ? [data.target_customer] : null,
            customer_questions: data.customer_questions || [],
            onboarding_step: 2,
          }, { onConflict: 'merchant_id' })

        break
      }

      case 2: {
        // Step 2 — catalog taggato approvato
        // I catalog_items e tag vengono salvati dalla tag-products API
        // Qui aggiorniamo solo lo step
        await supabaseAdmin
          .from('merchant_profiles')
          .update({ onboarding_step: 3 })
          .eq('merchant_id', user.id)
        break
      }

      case 3: {
        // Salva questionario cliente
        await supabaseAdmin
          .from('merchant_profiles')
          .update({
            customer_questions: data.customer_questions || [],
            onboarding_step: 4,
          })
          .eq('merchant_id', user.id)
        break
      }

      case 4: {
        // Preview approvata
        await supabaseAdmin
          .from('merchant_profiles')
          .update({ onboarding_step: 5 })
          .eq('merchant_id', user.id)
        break
      }

      case 5: {
        // Go live — onboarding completato
        await supabaseAdmin
          .from('merchants')
          .update({ is_published: true })
          .eq('id', user.id)

        await supabaseAdmin
          .from('merchant_profiles')
          .update({
            onboarding_step: 5,
            onboarding_completed: true,
          })
          .eq('merchant_id', user.id)

        // Evento stream
        await supabaseAdmin
          .from('event_stream')
          .insert({
            merchant_id: user.id,
            event_type: 'merchant_onboarded',
            event_data: {
              seller_type: data.seller_type,
              category: data.category,
              completed_at: new Date().toISOString(),
            },
          })

        break
      }

      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    return NextResponse.json({ ok: true, step })

  } catch (err: any) {
    console.error('save-onboarding error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}