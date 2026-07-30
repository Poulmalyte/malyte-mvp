import { createServerSupabaseClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { syncAndTagProducts } from '@/lib/shopify/sync-and-tag'
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

    const { data: installation } = await supabaseAdmin
      .from('shopify_installations')
      .select('shop_domain')
      .eq('expert_id', user.id)
      .maybeSingle()

    if (!installation) {
      return NextResponse.json({ error: 'No Shopify store connected' }, { status: 400 })
    }

    const result = await syncAndTagProducts(user.id, installation.shop_domain)

    if (!result.ok) {
      return NextResponse.json({ error: result.error || 'Sync failed' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      tagged: result.tagged,
      failed: result.failed,
      total: result.total,
    })

  } catch (err: any) {
    console.error('tag-products error:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
