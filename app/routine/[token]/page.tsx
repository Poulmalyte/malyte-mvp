import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function RoutinePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: brandPlan } = await supabaseAdmin
    .from('brand_plans')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!brandPlan) notFound()

  const plan = brandPlan.plan_data
  const pkg = brandPlan.package_data
  const brandName = brandPlan.merchant_name || 'Your Brand'
  const category = brandPlan.category || 'Skincare'

  const RoutineItem = ({ item, color, bg, border }: any) => (
    <div style={{ padding: '14px 16px', background: bg, borderRadius: 12, border: `1px solid ${border}`, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color, background: border, padding: '2px 8px', borderRadius: 100, flexShrink: 0 }}>Step {item.step_number}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_title}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {item.price && <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>€{Number(item.price).toFixed(2)}</span>}
          {item.product_url && (
            <a href={item.product_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '3px 10px', borderRadius: 100, whiteSpace: 'nowrap' }}>
              View →
            </a>
          )}
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
      {item.why && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A' }}>{brandName}</span>
          <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '4px 12px', borderRadius: 100 }}>Week {brandPlan.week_number}</span>
        </div>
      </div>

      <div style={{ maxWidth: 560, margin: '0 auto', padding: '24px 24px 80px' }}>

        {/* Hero */}
        <div style={{ background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', borderRadius: 20, padding: '24px', marginBottom: 20, color: '#fff' }}>
          <p style={{ fontSize: 12, fontWeight: 600, opacity: 0.8, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Your personalised plan · Week {brandPlan.week_number}
          </p>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 10px', fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3 }}>
            {plan?.headline || `Your ${category} Routine`}
          </h1>
          {brandPlan.week_number === 1 && brandPlan.customer_summary && (
            <p style={{ fontSize: 13, opacity: 0.9, margin: 0, lineHeight: 1.5 }}>{brandPlan.customer_summary}</p>
          )}
        </div>

        {/* Weekly notes */}
        {plan?.weekly_notes && (
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #E8EDF8', padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>"{plan.weekly_notes}"</p>
          </div>
        )}

        {/* Morning routine */}
        {plan?.morning_routine?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              ☀️ Morning routine
            </p>
            {plan.morning_routine.map((item: any, i: number) => (
              <RoutineItem key={i} item={item} color="#F59E0B" bg="#FFFBEB" border="#FDE68A" />
            ))}
          </div>
        )}

        {/* Evening routine */}
        {plan?.evening_routine?.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#6385FF', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 10px' }}>
              🌙 Evening routine
            </p>
            {plan.evening_routine.map((item: any, i: number) => (
              <RoutineItem key={i} item={item} color="#6385FF" bg="#EEF2FF" border="#C7D2FE" />
            ))}
          </div>
        )}

        {/* Bundle */}
        {pkg && (
          <div style={{ background: '#fff', borderRadius: 20, border: '2px solid #7C5CFC', padding: '20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#7C5CFC', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Starter Bundle</p>
                <p style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{pkg.package_name}</p>
              </div>
              {pkg.total_price > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 2px' }}>Total</p>
                  <p style={{ fontSize: 20, fontWeight: 800, color: '#7C5CFC', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>
                    €{Number(pkg.total_price).toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            {(pkg.items || []).map((item: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.product_title}</p>
                  {item.reason && <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{item.reason}</p>}
                </div>
                {item.price && <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', flexShrink: 0, marginLeft: 8 }}>€{Number(item.price).toFixed(2)}</span>}
              </div>
            ))}

            {pkg.cart_url ? (
              <a href={pkg.cart_url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'block', width: '100%', padding: '16px', borderRadius: 12, fontWeight: 800, fontSize: 15, background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', color: '#fff', border: 'none', cursor: 'pointer', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', boxShadow: '0 4px 20px rgba(124,92,252,0.3)' }}>
                Add bundle to cart →
              </a>
            ) : (
              <div style={{ padding: '12px 16px', background: '#F5F3FF', borderRadius: 10, textAlign: 'center' }}>
                <p style={{ fontSize: 13, color: '#7C5CFC', margin: 0, fontWeight: 600 }}>Visit {brandName} to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Next week */}
        {plan?.what_changes_next_week && (
          <div style={{ background: '#F0FDF4', borderRadius: 14, border: '1px solid #6EE7B7', padding: '16px 20px', marginBottom: 20 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#059669', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Next week</p>
            <p style={{ fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.6 }}>{plan.what_changes_next_week}</p>
          </div>
        )}

        {/* Evolution */}
        <div style={{ background: '#F5F3FF', borderRadius: 14, border: '1px solid #DDD6FE', padding: '16px 20px' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC', margin: '0 0 8px' }}>Your routine evolves with you</p>
          <p style={{ fontSize: 12, color: '#5B21B6', margin: 0, lineHeight: 1.6 }}>
            Every week your plan adapts based on your progress. New products are introduced at exactly the right moment — never too much, never too soon.
          </p>
        </div>

      </div>
    </div>
  )
}
