import { createServerSupabaseClient } from '@/lib/supabase-server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function ExpertProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  // Carica il profilo expert
  const { data: expert } = await supabase
    .from('experts')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!expert) notFound()

  // Carica i prodotti dell'expert
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('expert_id', expert.id)
    .eq('is_published', false) // mostra anche bozze per ora

  const categoryLabels: Record<string, string> = {
    fitness: '🏋️ Fitness & Allenamento',
    nutrition: '🥗 Nutrizione',
    skincare: '✨ Skincare & Bellezza',
    mental: '🧠 Mental Wellness',
    running: '🏃 Running & Endurance',
    yoga: '💆 Yoga & Mindfulness',
  }

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '780px', margin: '0 auto' }}>

        {/* Nav */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '48px' }}>
          <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px' }}>
            maly<span style={{ color: 'var(--neon)' }}>te</span>
          </div>
          <Link href="/marketplace" style={{ fontSize: '14px', color: 'var(--muted)', textDecoration: 'none' }}>
            ← Torna al marketplace
          </Link>
        </div>

        {/* Hero profilo */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '24px', padding: '40px', marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '24px', marginBottom: '28px' }}>
            {/* Avatar */}
            <div style={{
              width: '72px', height: '72px', borderRadius: '20px', flexShrink: 0,
              background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne', fontWeight: 800, fontSize: '28px', color: 'white'
            }}>
              {expert.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontFamily: 'Syne', fontSize: '26px', fontWeight: 800, marginBottom: '8px' }}>
                {expert.name}
              </h1>
              {expert.category && (
                <div style={{
                  display: 'inline-block', padding: '4px 14px', borderRadius: '100px',
                  background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.3)',
                  fontSize: '13px', color: '#A78BFA'
                }}>
                  {categoryLabels[expert.category] || expert.category}
                </div>
              )}
            </div>
          </div>

          {/* Metodologia */}
          {expert.methodology_name && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Il suo metodo
              </div>
              <div style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, color: 'var(--violet-light)', marginBottom: '10px' }}>
                {expert.methodology_name}
              </div>
              {expert.methodology_description && (
                <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.7 }}>
                  {expert.methodology_description}
                </p>
              )}
            </div>
          )}

          {/* Risultati */}
          {expert.results_description && (
            <div style={{
              background: 'rgba(77,255,210,0.05)', border: '1px solid rgba(77,255,210,0.15)',
              borderRadius: '14px', padding: '20px'
            }}>
              <div style={{ fontSize: '11px', color: 'var(--neon)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
                Risultati dei clienti
              </div>
              <p style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.7 }}>
                {expert.results_description}
              </p>
            </div>
          )}
        </div>

        {/* Prodotti */}
        <div>
          <h2 style={{ fontFamily: 'Syne', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
            Prodotti disponibili
          </h2>

          {products && products.length > 0 ? (
            products.map((product) => (
              <div key={product.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: '20px', padding: '28px', marginBottom: '16px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '24px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
                    {product.title}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '12px' }}>
                    {product.description}
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {product.pricing_model === 'one_time' && '💳 Pagamento unico'}
                    {product.pricing_model === 'subscription' && '🔄 Abbonamento mensile'}
                    {product.pricing_model === 'bundle' && '📦 Bundle'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px' }}>
                    €{product.price}
                  </div>
                  <button style={{
                    padding: '10px 24px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #7C5CFC, #5B3FD4)',
                    color: 'white', fontWeight: 600, fontSize: '14px',
                    border: 'none', cursor: 'pointer'
                  }}>
                    Acquista
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '20px', padding: '40px', textAlign: 'center', color: 'var(--muted)'
            }}>
              Nessun prodotto disponibile ancora.
            </div>
          )}
        </div>
      </div>
    </main>
  )
} 