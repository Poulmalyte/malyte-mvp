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
    <main style={{ minHeight: '100vh', background: '#F5F4F0', fontFamily: "'Inter', sans-serif" }}>

      {/* HERO DARK */}
      <div style={{ background: '#14182A', padding: '20px 24px 40px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>

          {/* Topbar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
            <Link href="/marketplace" style={{ fontSize: 12, color: '#6B7280', textDecoration: 'none' }}>
              ← Back to marketplace
            </Link>
            <Link href="/" style={{ textDecoration: 'none' }}>
              <span style={{ color: '#4DFFD2', fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20 }}>malyte</span>
            </Link>
          </div>

          {/* Category + title */}
          <div style={{ marginBottom: 12 }}>
            <span style={{ background: 'rgba(124,92,252,0.2)', color: '#A78BFA', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {expert?.category || 'Wellness'}
            </span>
            {duration && (
              <span style={{ marginLeft: 10, fontSize: 11, color: '#6B7280' }}>
                {duration} month{duration > 1 ? 's' : ''} program
              </span>
            )}
          </div>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 32, color: '#F1F3F9', margin: '0 0 10px', lineHeight: 1.2, wordBreak: 'break-word' }}>
            {product.title}
          </h1>
          <p style={{ color: '#8B92A5', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px' }}>
            {product.description}
          </p>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Price</p>
              <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 24, fontWeight: 800, color: '#F1F3F9' }}>€{product.price}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Expert</p>
              <p style={{ fontSize: 15, fontWeight: 600, color: '#4DFFD2' }}>{expert?.name}</p>
            </div>
            <div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 }}>Model</p>
              <p style={{ fontSize: 13, color: '#E8EAF0' }}>{product.pricing_model === 'one_time' ? 'One-time payment' : 'Monthly'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY LIGHT */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 32, alignItems: 'start' }}>

          {/* Left: content */}
          <div>
            {/* Expert methodology */}
            {expert?.methodology_name && (
              <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
                <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Methodology</p>
                <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{expert.methodology_name}</p>
                {expert.methodology_description && (
                  <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7 }}>{expert.methodology_description}</p>
                )}
              </div>
            )}

            {/* How it works */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px', marginBottom: 20 }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>How it works</p>
              {[
                { icon: '🛒', title: 'Purchase', desc: 'Complete your order with a single payment' },
                { icon: '📋', title: 'Answer questions', desc: 'Tell us about your goals, habits and preferences' },
                { icon: '✨', title: 'Get your plan', desc: 'AI generates a personalized week-by-week program' },
                { icon: '📈', title: 'Track progress', desc: 'Weekly check-ins adapt the plan to your results' },
              ].map((step, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: i < 3 ? 16 : 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEE9FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {step.icon}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 }}>{step.title}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Expert profile */}
            <div style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #EDE9E2', padding: '20px 24px' }}>
              <p style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>About the expert</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#EEE9FD', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 16, color: '#6D45E8', flexShrink: 0 }}>
                  {expert?.name?.charAt(0) || 'E'}
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>{expert?.name}</p>
                  <p style={{ fontSize: 12, color: '#7C5CFC' }}>{expert?.category} Expert</p>
                </div>
              </div>
              {expert?.methodology_description && (
                <p style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.7, fontStyle: 'italic' }}>
                  "{expert.methodology_description?.slice(0, 180)}{expert.methodology_description?.length > 180 ? '...' : ''}"
                </p>
              )}
            </div>
          </div>

          {/* Right: purchase box */}
          <div style={{ background: '#1E2337', borderRadius: 16, padding: '24px', position: 'sticky', top: 24 }}>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 32, color: '#F1F3F9', marginBottom: 4 }}>€{product.price}</p>
            <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 20 }}>
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
                  <span style={{ color: '#4DFFD2', fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 12, color: '#9CA3AF' }}>{item}</span>
                </div>
              ))}
            </div>

            <BuyNowButton
              productId={product.id}
              price={product.price}
              variantId={product.lemonsqueezy_variant_id}
            />

            <p style={{ fontSize: 11, color: '#4B5563', textAlign: 'center', marginTop: 12 }}>
              Personalized plan generated after purchase
            </p>
          </div>

        </div>
      </div>

      {/* FOOTER DARK */}
      <div style={{ background: '#1E2337', padding: '40px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 26, color: '#F1F3F9', marginBottom: 10 }}>
            Ready to start?
          </h2>
          <p style={{ color: '#8B92A5', fontSize: 14, marginBottom: 24 }}>
            After purchase you will receive a fully personalized plan based on {expert?.name}&apos;s methodology.
          </p>
          <BuyNowButton
            productId={product.id}
            price={product.price}
            variantId={product.lemonsqueezy_variant_id}
          />
        </div>
      </div>

    </main>
  )
}