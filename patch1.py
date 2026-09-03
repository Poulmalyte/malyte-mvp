p = 'app/api/shopify/generate-followup-plan/route.ts'
s = open(p).read()

anchor = "      .from('merchant_profiles').select('*').eq('merchant_id', merchant_id).maybeSingle()\n"
assert s.count(anchor) == 1, f"anchor trovato {s.count(anchor)} volte"

block = anchor + """
    // Riuso della catena esistente.
    // Un secondo ordine dello stesso cliente non deve aprire una routine nuova
    // da week 1: va agganciato alla catena che il cliente sta gia' seguendo.
    // Riutilizzabile solo se la catena non ha esaurito le settimane E non e'
    // stata abbandonata da tempo.
    const normalizedEmail = (order.buyer_email || order.customer_email || '')
      .trim()
      .toLowerCase()
    const programDurationWeeks = merchantProfile?.program_duration_weeks || 8

    if (normalizedEmail) {
      const staleBefore = new Date()
      staleBefore.setDate(staleBefore.getDate() - (programDurationWeeks + 3) * 7)

      const { data: recentPlans } = await supabaseAdmin
        .from('brand_plans')
        .select('id, token, week_number, created_at, customer_email, customer_id')
        .eq('merchant_id', merchant_id)
        .gte('created_at', staleBefore.toISOString())
        .order('week_number', { ascending: false })
        .order('created_at', { ascending: false })

      // Match esatto sull'email normalizzata lato JS: evita i wildcard di ilike
      // e replica esattamente lower(trim()). L'ordinamento SQL garantisce che
      // il primo match sia week_number piu' alto, poi created_at piu' recente.
      const latest = (recentPlans || []).find(
        (pl: any) => (pl.customer_email || '').trim().toLowerCase() === normalizedEmail
      )

      if (latest?.token && (latest.week_number || 1) < programDurationWeeks) {
        await supabaseAdmin
          .from('shopify_orders')
          .update({
            followup_plan_id: latest.id,
            merchant_id,
            status: 'plan_generated',
            questionnaire_answers: quiz_answers,
          })
          .eq('token', order_token)

        await supabaseAdmin.from('event_stream').insert({
          merchant_id,
          customer_id: latest.customer_id || null,
          event_type: 'order_linked_to_existing_plan',
          event_data: {
            order_token,
            shopify_order_id: order.shopify_order_id,
            brand_plan_id: latest.id,
            week_number: latest.week_number,
            plan_token: latest.token,
            program_duration_weeks: programDurationWeeks,
          },
        })

        console.log(
          '[FollowupPlan] ordine collegato a piano esistente:',
          latest.id,
          'week',
          latest.week_number,
          'di',
          programDurationWeeks
        )

        return NextResponse.json({
          ok: true,
          plan_token: latest.token,
          plan_url: `${APP_URL}/routine/${latest.token}`,
          linked_to_existing: true,
        })
      }
    }
"""

s = s.replace(anchor, block, 1)
open(p, 'w').write(s)
print('scritto')
