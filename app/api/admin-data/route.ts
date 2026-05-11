import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function checkSecret(secret: string) {
  return secret === process.env.ADMIN_SECRET
}

export async function POST(request: NextRequest) {
  const { secret, type, seller_id } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (type === 'sellers') {
    const { data: expertsData } = await supabaseAdmin
      .from('experts')
      .select('id, name, slug, category, is_published, created_at, tagline')
      .order('created_at', { ascending: false })
    const ids = (expertsData || []).map((e: any) => e.id)
    const { data: profilesData } = await supabaseAdmin.from('profiles').select('id, email').in('id', ids)
    const profileMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p]))
    const data = (expertsData || []).map((e: any) => ({ ...e, email: profileMap[e.id]?.email || null }))
    const result = await Promise.all((data || []).map(async (s: any) => {
      const { count: productsCount } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('expert_id', s.id)
      const { data: productIds } = await supabaseAdmin.from('products').select('id').eq('expert_id', s.id)
      const pids = productIds?.map((p: any) => p.id) || []
      let totalRevenue = 0
      if (pids.length > 0) {
        const { data: purchases } = await supabaseAdmin.from('purchases').select('amount').in('product_id', pids)
        totalRevenue = purchases?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
      }
      return { ...s, products_count: productsCount, total_revenue: totalRevenue }
    }))
    return NextResponse.json({ data: result })
  }

  if (type === 'seller_detail') {
    const { data: expert } = await supabaseAdmin.from('experts').select('*').eq('id', seller_id).single()
    const { data: profile } = await supabaseAdmin.from('profiles').select('id, email').eq('id', seller_id).single()
    const { data: products } = await supabaseAdmin.from('products').select('*').eq('expert_id', seller_id).order('created_at', { ascending: false })
    return NextResponse.json({ expert: { ...expert, email: profile?.email || null }, products: products || [] })
  }

  if (type === 'products') {
    const { data } = await supabaseAdmin.from('products').select('*, experts(name)').order('created_at', { ascending: false })
    const result = await Promise.all((data || []).map(async (p: any) => {
      const { count } = await supabaseAdmin.from('purchases').select('*', { count: 'exact', head: true }).eq('product_id', p.id)
      return { ...p, purchases_count: count }
    }))
    return NextResponse.json({ data: result })
  }

  if (type === 'purchases') {
    const { data: purchasesData } = await supabaseAdmin.from('purchases').select('id, client_id, product_id, amount, created_at, stripe_payment_id').order('created_at', { ascending: false })
    const clientIds = [...new Set((purchasesData || []).map((p: any) => p.client_id))]
    const productIds = [...new Set((purchasesData || []).map((p: any) => p.product_id))]
    const { data: profilesData } = await supabaseAdmin.from('profiles').select('id, name, email').in('id', clientIds)
    const { data: productsData } = await supabaseAdmin.from('products').select('id, title, expert_id').in('id', productIds)
    const expertIds = [...new Set((productsData || []).map((p: any) => p.expert_id))]
    const { data: expertsData } = await supabaseAdmin.from('experts').select('id, name').in('id', expertIds)
    const profileMap = Object.fromEntries((profilesData || []).map((p: any) => [p.id, p]))
    const productMap = Object.fromEntries((productsData || []).map((p: any) => [p.id, p]))
    const expertMap = Object.fromEntries((expertsData || []).map((e: any) => [e.id, e]))
    const data = (purchasesData || []).map((p: any) => ({
      ...p,
      buyer_name: profileMap[p.client_id]?.name || null,
      buyer_email: profileMap[p.client_id]?.email || null,
      product_title: productMap[p.product_id]?.title || null,
      seller_name: expertMap[productMap[p.product_id]?.expert_id]?.name || null,
    }))
    return NextResponse.json({ data })
  }

  if (type === 'buyers') {
    const { data } = await supabaseAdmin.from('profiles').select('*').eq('role', 'client').order('created_at', { ascending: false })
    const result = await Promise.all((data || []).map(async (b: any) => {
      const { count } = await supabaseAdmin.from('purchases').select('*', { count: 'exact', head: true }).eq('client_id', b.id)
      return { ...b, purchases_count: count }
    }))
    return NextResponse.json({ data: result })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function PATCH(request: NextRequest) {
  const { secret, type, id, data } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (type === 'seller') {
    await supabaseAdmin.from('experts').update({
      name: data.name,
      category: data.category,
      is_published: data.is_published,
      tagline: data.tagline,
      bio: data.bio,
      short_bio: data.short_bio,
      long_bio: data.long_bio,
      years_experience: data.years_experience ? parseInt(data.years_experience) : null,
      credentials: data.credentials,
      instagram_url: data.instagram_url,
      website_url: data.website_url,
      tiktok_url: data.tiktok_url,
      youtube_url: data.youtube_url,
      linkedin_url: data.linkedin_url,
      iban: data.iban,
      methodology_name: data.methodology_name,
      methodology_description: data.methodology_description,
      results_description: data.results_description,
      allow_substitutions: data.allow_substitutions,
      calorie_metodo: data.calorie_metodo,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'product') {
    await supabaseAdmin.from('products').update({
      title: data.title,
      description: data.description,
      price: parseFloat(data.price),
      duration_months: parseInt(data.duration_months),
      is_published: data.is_published,
      lemonsqueezy_variant_id: data.lemonsqueezy_variant_id,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'buyer') {
    await supabaseAdmin.from('profiles').update({ name: data.name, email: data.email }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const { secret, type, id } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (type === 'purchase') {
    await supabaseAdmin.from('purchases').delete().eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}