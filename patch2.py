p = 'app/api/shopify/submit-checkin/route.ts'
s = open(p).read()

# 1. Espone shopify_product_id su productsContext (serve per il match con gli ordini)
a1 = "        id: item.id,\n        title: item.title,\n"
assert s.count(a1) == 1, f"a1: {s.count(a1)}"
s = s.replace(a1, a1 + "        shopify_product_id: item.shopify_product_id ? String(item.shopify_product_id) : null,\n", 1)

# 2. Raccoglie i prodotti di TUTTI gli ordini del cliente su questo shop
a2 = "    // --- CROSS-SELL: selezione candidati"
assert s.count(a2) == 1, f"a2: {s.count(a2)}"

owned = """    // Prodotti gia' posseduti: tutti gli ordini del cliente su questo shop,
    // non solo quello che ha originato il piano. Filtra su shop_domain (NOT NULL,
    // scritto dal webhook) e non su merchant_id, che resta null sugli ordini per
    // cui il cliente non ha mai aperto il link.
    const checkinEmail = (brandPlan.customer_email || '').trim().toLowerCase()
    const ownedProductIds = new Set<string>()
    const ownedProductTitles: string[] = []

    if (checkinEmail) {
      const base = supabaseAdmin
        .from('shopify_orders')
        .select('line_items, shopify_product_id, customer_email, buyer_email')
      const { data: customerOrders } = installation?.shop_domain
        ? await base.eq('shop_domain', installation.shop_domain)
        : await base.eq('merchant_id', merchant_id)

      for (const o of customerOrders || []) {
        const oEmail = (o.buyer_email || o.customer_email || '').trim().toLowerCase()
        if (oEmail !== checkinEmail) continue

        if (Array.isArray(o.line_items)) {
          for (const li of o.line_items as any[]) {
            const pid = li?.shopify_product_id ? String(li.shopify_product_id) : null
            if (!pid || ownedProductIds.has(pid)) continue
            ownedProductIds.add(pid)
            if (li?.title) ownedProductTitles.push(String(li.title))
          }
        } else if (o.shopify_product_id) {
          try {
            const parsed = JSON.parse(o.shopify_product_id)
            for (const pid of Array.isArray(parsed) ? parsed : [parsed]) {
              ownedProductIds.add(String(pid))
            }
          } catch {
            ownedProductIds.add(String(o.shopify_product_id))
          }
        }
      }
    }
    console.log('[submit-checkin] owned products:', ownedProductIds.size, Array.from(ownedProductIds).join(','))

"""
s = s.replace(a2, owned + a2, 1)

# 3. Esclude i prodotti gia' acquistati dai candidati cross-sell
a3 = "      .filter(p => !routineProductIds.has(String(p.id)))\n"
assert s.count(a3) == 1, f"a3: {s.count(a3)}"
s = s.replace(a3, a3 + "      .filter(p => !p.shopify_product_id || !ownedProductIds.has(p.shopify_product_id))\n", 1)

open(p, 'w').write(s)
print('scritto')
