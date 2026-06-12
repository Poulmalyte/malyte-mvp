import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Sincronizza experts (flusso legacy practitioner/pdf_seller) → merchants + merchant_profiles.
// Idempotente: chiamabile a ogni completamento onboarding o modifica domande.
export async function POST(request: NextRequest) {
  const token = (request.headers.get('authorization') || '').replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const expertId = user.id
  const { data: expert } = await supabaseAdmin
    .from('experts').select('*').eq('id', expertId).maybeSingle()
  if (!expert) return NextResponse.json({ error: 'Expert not found' }, { status: 404 })

  // I brand passano dall'onboarding wizard Shopify, che crea già tutto
  if (expert.seller_type !== 'practitioner' && expert.seller_type !== 'pdf_seller') {
    return NextResponse.json({ ok: true, skipped: 'not a legacy seller type' })
  }

  // 1. Upsert merchants (id = expert_id, convenzione esistente)
  const { error: merchantError } = await supabaseAdmin.from('merchants').upsert({
    id: expertId,
    expert_id: expertId,
    seller_type: expert.seller_type,
    name: expert.name,
    slug: expert.slug,
    category: expert.category || null,
    is_published: true,
  }, { onConflict: 'id' })
  if (merchantError) {
    console.error('[SellerBridge] merchants upsert error:', merchantError)
    return NextResponse.json({ error: 'merchants upsert failed' }, { status: 500 })
  }

  // 2. Domande dell'ultimo prodotto → formato customer_questions del quiz
  const { data: latestProduct } = await supabaseAdmin
    .from('products').select('id')
    .eq('expert_id', expertId)
    .order('created_at', { ascending: false })
    .limit(1).maybeSingle()

  let customerQuestions: any[] | null = null
  if (latestProduct) {
    const { data: pqs } = await supabaseAdmin
      .from('product_questions')
      .select('question_text, question_type, options, order_index')
      .eq('product_id', latestProduct.id)
      .order('order_index', { ascending: true })
    if (pqs && pqs.length > 0) {
      customerQuestions = pqs.map((q, i) => ({
        id: `q${i + 1}`,
        text: q.question_text,
        type: q.question_type === 'select' ? 'select' : 'text',
        options: q.question_type === 'select' ? (q.options || []) : undefined,
        enabled: true,
      }))
    }
  }

  // 3. merchant_profiles: insert con defaults se manca, altrimenti update solo delle domande
  const { data: existingProfile } = await supabaseAdmin
    .from('merchant_profiles').select('id').eq('merchant_id', expertId).maybeSingle()

  if (!existingProfile) {
    const { error: profileError } = await supabaseAdmin.from('merchant_profiles').insert({
      merchant_id: expertId,
      customer_questions: customerQuestions || [],
      onboarding_completed: true,
      checkin_frequency_days: 7,
      max_journey_weeks: 8,
      abandonment_days: 21,
      reengage_email: true,
      after_completion: 'stop',
      program_duration_weeks: 8,
    })
    if (profileError) {
      console.error('[SellerBridge] profile insert error:', profileError)
      return NextResponse.json({ error: 'profile insert failed' }, { status: 500 })
    }
  } else if (customerQuestions) {
    const { error: updateError } = await supabaseAdmin
      .from('merchant_profiles')
      .update({ customer_questions: customerQuestions, onboarding_completed: true })
      .eq('merchant_id', expertId)
    if (updateError) {
      console.error('[SellerBridge] profile update error:', updateError)
      return NextResponse.json({ error: 'profile update failed' }, { status: 500 })
    }
  }

  console.log('[SellerBridge] synced:', { expertId, sellerType: expert.seller_type, questions: customerQuestions?.length ?? 0 })
  return NextResponse.json({ ok: true, questions_synced: customerQuestions?.length ?? 0 })
}
