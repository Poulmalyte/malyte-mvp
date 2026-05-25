import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File
  const shopifyProductId = formData.get('shopify_product_id') as string
  const shop = formData.get('shop') as string

  if (!file || !shopifyProductId || !shop) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Only PDF files accepted' }, { status: 400 })
  }

  const fileName = `${shop}/${shopifyProductId}/${Date.now()}_${file.name}`
  const arrayBuffer = await file.arrayBuffer()
  const uint8Array = new Uint8Array(arrayBuffer)

  const { error: uploadError } = await supabaseAdmin.storage
    .from('shopify-pdfs')
    .upload(fileName, uint8Array, {
      contentType: 'application/pdf',
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('shopify_products')
    .update({ pdf_path: fileName, updated_at: new Date().toISOString() })
    .eq('shop', shop)
    .eq('shopify_product_id', shopifyProductId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, path: fileName })
}