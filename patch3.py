p = 'app/api/shopify/submit-checkin/route.ts'
s = open(p).read()

# 1. Calcola i prodotti posseduti ma non ancora in routine
a1 = "    const crossSellCandidates = scoredCandidates.slice(0, 10).map(c => c.p)\n"
assert s.count(a1) == 1, f"a1: {s.count(a1)}"

np = """
    // Posseduti ma non ancora in routine: comprati in un ordine successivo a
    // quello che ha originato il piano. Non sono cross-sell (il cliente li ha
    // gia' pagati), vanno integrati negli step della settimana.
    const newlyPurchased = productsContext.filter(
      pc =>
        pc.shopify_product_id &&
        ownedProductIds.has(pc.shopify_product_id) &&
        !routineProductIds.has(String(pc.id))
    )
    console.log('[submit-checkin] owned not in routine:', newlyPurchased.length)
"""
s = s.replace(a1, a1 + np, 1)

# 2. Sezione dedicata nel prompt, prima dei candidati cross-sell
a2 = "CROSS-SELL CANDIDATES (ranked, best fit first"
assert s.count(a2) == 1, f"a2: {s.count(a2)}"

sec = """ALREADY OWNED, NOT YET IN THE ROUTINE (bought in a later order — the customer already paid for these, they are NOT cross-sell):
${newlyPurchased.length ? JSON.stringify(newlyPurchased, null, 2) : 'None.'}

"""
s = s.replace(a2, sec + a2, 1)

# 3. Regola esplicita
a3 = "7. Return ONLY valid JSON"
assert s.count(a3) == 1, f"a3: {s.count(a3)}"

rule = """7. ALREADY OWNED products: any product in the ALREADY OWNED list must be worked into this week's morning or evening routine with real instructions and a frequency, exactly like the products carried over from the previous plan. Do NOT set recommended_product_id to one of them and do NOT describe them as something to buy: the customer already has them. If one genuinely does not fit yet (a reported reaction, or it would clash with a product already in use), leave it out and say why in adaptation_note.
8. Return ONLY valid JSON"""
s = s.replace(a3, rule, 1)

open(p, 'w').write(s)
print('scritto')
