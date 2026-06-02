'use client'

const DEMO_PLAN: Record<string, any> = {
  Skincare: {
    customer_name: 'Sarah',
    headline: 'Building Your Foundation: Hydration & Gentle Care',
    intro_message: 'Week 1 is all about establishing a simple, effective routine that your skin can adapt to. We start with only the essentials — no actives yet — to let your skin barrier strengthen before introducing more powerful ingredients.',
    morning_routine: [
      { step_number: 1, product_title: 'Gentle Foaming Cleanser', instructions: 'Use a small amount with lukewarm water, massage for 30 seconds, rinse thoroughly.', why: 'Removes overnight buildup without stripping your skin barrier.', price: 24.90 },
      { step_number: 2, product_title: 'Hydrating Toner', instructions: 'Apply to clean skin with gentle patting motions.', why: 'Hyaluronic acid preps your skin to absorb the next steps better.', price: 32.00 },
      { step_number: 3, product_title: 'Daily Moisturizer SPF30', instructions: 'Apply generously to face and neck every morning — even on cloudy days.', why: 'SPF is non-negotiable for your brightening goals. Sun damage undoes everything.', price: 44.00 },
    ],
    evening_routine: [
      { step_number: 1, product_title: 'Gentle Foaming Cleanser', instructions: 'Double cleanse if you wore sunscreen or makeup. Take extra time tonight.', why: 'Evening cleansing removes the day\'s oxidative stress from your skin.', price: 24.90 },
      { step_number: 2, product_title: 'Hydrating Toner', instructions: 'Apply while skin is still slightly damp for maximum absorption.', why: 'Evening application allows hyaluronic acid to work overnight.', price: 32.00 },
      { step_number: 3, product_title: 'Nourishing Night Cream', instructions: 'Apply a slightly thicker layer than your morning moisturizer.', why: 'Peptides and squalane work overnight to repair and strengthen your barrier.', price: 52.00 },
    ],
    weekly_notes: 'Stick to just these 3 steps for the full first week. Consistency matters more than adding more products right now. If you notice any tightness, add an extra layer of toner.',
    what_changes_next_week: 'In Week 2 we introduce the Vitamin C Brightening Serum in your morning routine — your skin will be ready for it after a week of barrier repair.',
    products_to_introduce_next_week: ['Vitamin C Brightening Serum'],
    demo_profile: { skin_type: 'combination', objectives: ['hydration', 'brightening'] },
  },
  Fitness: {
    customer_name: 'Marco',
    headline: 'Week 1: Building Your Base',
    intro_message: 'We start with foundational movements to assess your current fitness level and prepare your body for progressive overload. No ego lifting this week — perfect form first.',
    morning_routine: [
      { step_number: 1, product_title: 'Pre-Workout Energy Boost', instructions: 'Take 20-30 minutes before training with 300ml water.', why: 'Caffeine and beta-alanine will improve your focus and delay fatigue.', price: 39.90 },
    ],
    evening_routine: [
      { step_number: 1, product_title: 'Whey Protein Isolate', instructions: 'Mix 1 scoop with 250ml water or milk within 30 minutes post-workout.', why: 'The anabolic window is real — fast protein delivery maximises muscle protein synthesis.', price: 54.90 },
      { step_number: 2, product_title: 'Post-Workout Recovery', instructions: 'Take with your protein shake or before bed.', why: 'BCAAs and glutamine reduce muscle soreness so you can train again sooner.', price: 34.90 },
    ],
    weekly_notes: 'Focus on mastering the movement patterns this week. Log your weights so we can track progression.',
    what_changes_next_week: 'Week 2 adds a creatine loading phase to maximise strength gains.',
    products_to_introduce_next_week: ['Creatine Monohydrate'],
    demo_profile: { goal: 'muscle gain', experience: 'intermediate' },
  },
  Nutrition: {
    customer_name: 'Laura',
    headline: 'Week 1: Foundation Supplements',
    intro_message: 'Before changing your diet, we fill the nutritional gaps that affect your energy and metabolism. A well-supported body responds better to any dietary change.',
    morning_routine: [
      { step_number: 1, product_title: 'Daily Multivitamin', instructions: 'Take with breakfast to improve absorption of fat-soluble vitamins.', why: 'Covers micronutrient deficiencies that can slow metabolism and cause cravings.', price: 28.90 },
      { step_number: 2, product_title: 'Omega-3 Fish Oil', instructions: 'Take 2 capsules with your morning meal.', why: 'Reduces inflammation that can interfere with fat loss and energy levels.', price: 34.90 },
    ],
    evening_routine: [
      { step_number: 1, product_title: 'Probiotic Complex', instructions: 'Take on an empty stomach, 30 minutes before dinner.', why: 'Gut health directly affects how you absorb nutrients and manage hunger hormones.', price: 42.00 },
    ],
    weekly_notes: 'Don\'t change your diet this week — just add these supplements. We need a clean baseline before making further changes.',
    what_changes_next_week: 'Week 2 introduces a structured meal timing protocol alongside your supplements.',
    products_to_introduce_next_week: ['Meal Replacement Shake'],
    demo_profile: { goal: 'weight loss', activity_level: 'moderate' },
  },
}

const FALLBACK = DEMO_PLAN['Skincare']

export default function Step4Preview({ onComplete, onBack, category }: { onComplete: (data: any) => void, onBack: () => void, category?: string }) {
  const plan = DEMO_PLAN[category || 'Skincare'] || FALLBACK

  const allProducts = [...(plan.morning_routine || []), ...(plan.evening_routine || [])]
  const uniqueProducts = allProducts.filter((p, i, arr) => arr.findIndex(x => x.product_title === p.product_title) === i)
  const weeklyTotal = uniqueProducts.reduce((sum: number, p: any) => sum + (p.price || 0), 0)

  const RoutineItem = ({ item, color, bg, borderColor }: { item: any, color: string, bg: string, borderColor: string }) => (
    <div style={{ padding: '12px 14px', background: bg, borderRadius: 10, border: `1px solid ${borderColor}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: borderColor, padding: '2px 8px', borderRadius: 100 }}>Step {item.step_number}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{item.product_title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item.price && <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>€{item.price.toFixed(2)}</span>}
          <span style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', background: '#EDE9FE', padding: '3px 10px', borderRadius: 100 }}>Your store →</span>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
      {item.why && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
    </div>
  )

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Plan Preview</h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 16px', lineHeight: 1.6 }}>
        This is exactly what <strong>{plan.customer_name}</strong> will see after completing the intake quiz.
      </p>

      {/* Banner evoluzione routine */}
      <div style={{ padding: '16px', background: '#F5F3FF', borderRadius: 12, border: '1px solid #DDD6FE', marginBottom: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#7C5CFC', margin: '0 0 10px' }}>How your customers experience Malyte</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            { week: 'Week 1', text: 'Essential products only — skin learns the routine', icon: '🌱' },
            { week: 'Week 2-3', text: 'Active ingredients introduced progressively', icon: '⚡' },
            { week: 'Every week', text: 'Plan adapts based on their check-in responses', icon: '🔄' },
            { week: 'Always', text: 'Only the products they actually need right now — no overwhelm', icon: '🎯' },
          ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC' }}>{item.week}: </span>
                <span style={{ fontSize: 12, color: '#5B21B6' }}>{item.text}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Demo banner */}
      <div style={{ padding: '10px 14px', background: '#FEF3C7', borderRadius: 10, border: '1px solid #FDE68A', marginBottom: 20 }}>
        <p style={{ fontSize: 12, color: '#92400E', margin: 0 }}>
          Demo preview using example products. Once you connect your store, your real products and prices will appear here.
        </p>
      </div>

      {/* Profilo demo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
          {plan.customer_name[0]}
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', margin: '0 0 2px' }}>Demo customer: {plan.customer_name}</p>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
            {plan.demo_profile?.skin_type && `${plan.demo_profile.skin_type} skin · `}
            {Array.isArray(plan.demo_profile?.objectives) ? plan.demo_profile.objectives.join(', ') : plan.demo_profile?.goal || ''}
          </p>
        </div>
      </div>

      {/* Headline + intro */}
      <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', marginBottom: 16 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: '0 0 6px' }}>{plan.headline}</p>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>{plan.intro_message}</p>
      </div>

      {/* Morning */}
      {plan.morning_routine?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Morning routine</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.morning_routine.map((item: any, i: number) => (
              <RoutineItem key={i} item={item} color="#F59E0B" bg="#FFFBEB" borderColor="#FDE68A" />
            ))}
          </div>
        </div>
      )}

      {/* Evening */}
      {plan.evening_routine?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>Evening routine</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {plan.evening_routine.map((item: any, i: number) => (
              <RoutineItem key={i} item={item} color="#6385FF" bg="#EEF2FF" borderColor="#C7D2FE" />
            ))}
          </div>
        </div>
      )}

      {/* Totale prodotti */}
      <div style={{ padding: '14px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #6EE7B7', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#059669', margin: 0 }}>Products in this routine</p>
          <p style={{ fontSize: 14, fontWeight: 800, color: '#059669', margin: 0 }}>€{weeklyTotal.toFixed(2)} total</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {uniqueProducts.map((p: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#065F46' }}>{p.product_title}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>€{p.price?.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* What changes next week */}
      {plan.what_changes_next_week && (
        <div style={{ padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next week</p>
          <p style={{ fontSize: 13, color: '#0F172A', margin: 0, lineHeight: 1.6 }}>{plan.what_changes_next_week}</p>
          {plan.products_to_introduce_next_week?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {plan.products_to_introduce_next_week.map((p: string, i: number) => (
                <span key={i} style={{ fontSize: 11, padding: '3px 10px', borderRadius: 100, background: '#EDE9FE', color: '#7C5CFC', fontWeight: 600 }}>{p}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>Back</button>
        <button onClick={() => onComplete({ preview_approved: true })} style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>Looks great → Go live</button>
      </div>
    </div>
  )
}
