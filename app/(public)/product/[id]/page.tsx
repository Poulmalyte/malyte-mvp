import BuyNowButton from './BuyNowButton'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()

  const { data: product } = await supabase
    .from('products')
    .select('*, experts(name, category, methodology_name, methodology_description, slug)')
    .eq('id', id)
    .eq('is_published', true)
    .single()

  if (!product) notFound()

  const expert = product.experts as any
  const duration = product.duration_months

  return (
    <main style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

      {/* NAV */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '16px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/marketplace" style={{ fontSize: 13, color: '#64748B', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
            ← Back to marketplace
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </Link>
        </div>
      </div>

      {/* HERO */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '40px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ background: '#EDE9FE', color: '#7C5CFC', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {expert?.category || 'Wellness'}
            </span>
            {duration && (
              <span style={{ fontSize: 12, color: '#94A3B8', background: '#F1F5F9', padding: '4px 12px', borderRadius: 100 }}>
                {duration} month{duration > 1 ? 's' : ''} program
              </span>
            )}
          </div>

          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 'clamp(24px, 4vw, 36px)', color: '#0F172A', margin: '0 0 12px', lineHeight: 1.2 }}>
            {product.title}
          </h1>
          <p style={{ color: '#64748B', fontSize: 15, lineHeight: 1.7, margin: '0 0 28px', maxWidth: 600 }}>
            {product.description}
          </p>

          <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 500 }}>Price</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 28, fontWeight: 800, color: '#7C5CFC', margin: 0 }}>€{product.price}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 500 }}>Expert</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{expert?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 500 }}>Model</p>
              <p style={{ fontSize: 13, color: '#334155', margin: 0 }}>{product.pricing_model === 'one_time' ? 'One-time payment' : 'Monthly'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>

          {/* LEFT */}
          <div>
            {expert?.methodology_name && (
              <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8, fontWeight: 600 }}>Methodology</p>
                <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 16, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{expert.methodology_name}</p>
                {expert.methodology_description && (
                  <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, margin: 0 }}>{expert.methodology_description}</p>
                )}
              </div>
            )}

            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px 24px', marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16, fontWeight: 600 }}>How it works</p>
              {[
                { icon: '🛒', title: 'Purchase', desc: 'Complete your order with a single payment' },
                { icon: '📋', title: 'Answer questions', desc: 'Tell us about your goals, habits and preferences' },
                { icon: '✨', title: 'Get your plan', desc: 'AI generates a personalized week-by-week program' },
                { icon: '📈', title: 'Track progress', desc: 'Weekly check-ins adapt the plan to your results' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 16 : 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', marginBottom: 2 }}>{step.title}</p>
                    <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px 24px' }}>
              <p style={{ fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14, fontWeight: 600 }}>About the expert</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #6385FF)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 16, color: '#fff', flexShrink: 0 }}>
                  {expert?.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', margin: '0 0 2px' }}>{expert?.name}</p>
                  <p style={{ fontSize: 12, color: '#7C5CFC', margin: 0, fontWeight: 500 }}>{expert?.category} Expert</p>
                </div>
              </div>
              {expert?.methodology_description && (
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, fontStyle: 'italic', margin: 0 }}>
                  "{expert.methodology_description?.slice(0, 180)}{expert.methodology_description?.length > 180 ? '...' : ''}"
                </p>
              )}
              {expert?.slug && (
                <Link href={`/expert/${expert.slug}`} style={{ display: 'inline-block', marginTop: 12, fontSize: 13, color: '#7C5CFC', textDecoration: 'none', fontWeight: 600 }}>
                  View full profile →
                </Link>
              )}
            </div>
          </div>

          {/* RIGHT — purchase box */}
          <div style={{ background: '#FFFFFF', borderRadius: 16, border: '2px solid #7C5CFC', padding: '24px', position: 'sticky', top: 24, boxShadow: '0 4px 24px rgba(124,92,252,0.10)' }}>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 36, color: '#7C5CFC', marginBottom: 4 }}>€{product.price}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20 }}>
              {product.pricing_model === 'one_time' ? 'One-time payment · lifetime access' : 'Monthly subscription'}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                `${duration} month${duration > 1 ? 's' : ''} personalized program`,
                'Weekly AI-adapted plans',
                'Expert methodology',
                'Progress tracking',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: '#059669', fontSize: 13, fontWeight: 700 }}>✓</span>
                  <span style={{ fontSize: 13, color: '#334155' }}>{item}</span>
                </div>
              ))}
            </div>

            <BuyNowButton
              productId={product.id}
              price={product.price}
              variantId={product.lemonsqueezy_variant_id}
            />

            <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 12 }}>
              Personalized plan generated after purchase
            </p>
          </div>
        </div>
      </div>

      {/* CTA FOOTER */}
      <div style={{ background: '#EDE9FE', borderTop: '1px solid #C4B5FD', padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 28, color: '#0F172A', marginBottom: 10 }}>
            Ready to start?
          </h2>
          <p style={{ color: '#64748B', fontSize: 14, marginBottom: 28 }}>
            After purchase you will receive a fully personalized plan based on {expert?.name}&apos;s methodology.
          </p>
          <BuyNowButton
            productId={product.id}
            price={product.price}
            variantId={product.lemonsqueezy_variant_id}
          />
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '24px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>© 2026 Malyte · AI-powered wellness programs</p>
      </div>
    </main>
  )
}