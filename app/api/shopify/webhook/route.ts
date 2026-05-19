import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import crypto from 'crypto'

// Verifica che il webhook venga da Shopify
function verifyWebhook(body: string, hmac: string): boolean {
  const secret = process.env.SHOPIFY_CLIENT_SECRET!
  const hash = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return hash === hmac
}

export async function POST(request: NextRequest) {
  const hmac = request.headers.get('x-shopify-hmac-sha256') || ''
  const topic = request.headers.get('x-shopify-topic') || ''
  const shop = request.headers.get('x-shopify-shop-domain') || ''

  const body = await request.text()

  // Verifica autenticità
  if (!verifyWebhook(body, hmac)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (topic !== 'orders/create') {
    return NextResponse.json({ ok: true })
  }

  const order = JSON.parse(body)
  const customerEmail = order.customer?.email
  const customerName = order.customer?.first_name || 'Cliente'

  if (!customerEmail) {
    return NextResponse.json({ ok: true })
  }

  const supabase = await createServerSupabaseClient()

  // Trova il seller collegato a questo shop
  const { data: installation } = await supabase
    .from('shopify_installations')
    .select('*')
    .eq('shop_domain', shop)
    .single()

  if (!installation) {
    return NextResponse.json({ error: 'Shop not found' }, { status: 404 })
  }

  // Registra l'ordine come pending — il buyer riceverà un'email con il link al questionario
  const { error } = await supabase
    .from('shopify_orders')
    .insert({
      shop_domain: shop,
      shopify_order_id: String(order.id),
      customer_email: customerEmail,
      customer_name: customerName,
      status: 'pending',
    })

  if (error) {
    console.error('Error saving order:', error)
    return NextResponse.json({ error: 'Database error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}