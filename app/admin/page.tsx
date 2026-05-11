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
  const { secret, type } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (type === 'sellers') {
    const { data } = await supabaseAdmin
      .from('experts')
      .select('*, profiles(email)')
      .order('created_at', { ascending: false })

    const sellersWithStats = await Promise.all((data || []).map(async (s: any) => {
      const { count: productsCount } = await supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('expert_id', s.id)
      const { data: purchases } = await supabaseAdmin.from('purchases').select('amount').in('product_id', (await supabaseAdmin.from('products').select('id').eq('expert_id', s.id)).data?.map((p: any) => p.id) || [])
      const totalRevenue = purchases?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0
      return { ...s, email: s.profiles?.email, products_count: productsCount, total_revenue: totalRevenue }
    }))

    return NextResponse.json({ data: sellersWithStats })
  }

  if (type === 'products') {
    const { data } = await supabaseAdmin
      .from('products')
      .select('*, experts(name)')
      .order('created_at', { ascending: false })

    const productsWithStats = await Promise.all((data || []).map(async (p: any) => {
      const { count } = await supabaseAdmin.from('purchases').select('*', { count: 'exact', head: true }).eq('product_id', p.id)
      return { ...p, purchases_count: count }
    }))

    return NextResponse.json({ data: productsWithStats })
  }

  if (type === 'purchases') {
    const { data } = await supabaseAdmin
      .from('purchases')
      .select('*, profiles(name, email), products(title, experts(name))')
      .order('created_at', { ascending: false })

    return NextResponse.json({ data: data || [] })
  }

  if (type === 'buyers') {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('role', 'client')
      .order('created_at', { ascending: false })

    const buyersWithStats = await Promise.all((data || []).map(async (b: any) => {
      const { count } = await supabaseAdmin.from('purchases').select('*', { count: 'exact', head: true }).eq('client_id', b.id)
      return { ...b, purchases_count: count }
    }))

    return NextResponse.json({ data: buyersWithStats })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}

export async function PATCH(request: NextRequest) {
  const { secret, type, id, data } = await request.json()
  if (!checkSecret(secret)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (type === 'seller') {
    await supabaseAdmin.from('experts').update({
      category: data.category,
      is_published: data.is_published,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  if (type === 'product') {
    await supabaseAdmin.from('products').update({
      price: parseFloat(data.price),
      is_published: data.is_published,
      lemonsqueezy_variant_id: data.lemonsqueezy_variant_id,
    }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
}