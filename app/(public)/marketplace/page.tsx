import { createServerSupabaseClient } from '@/lib/supabase-server'
import Link from 'next/link'
import MarketplaceFilters from './MarketplaceFilters'

async function getProducts(category?: string, query?: string) {
  const supabase = await createServerSupabaseClient()

  let q = supabase
    .from('products')
    .select('*, experts(name, category, slug, methodology_name)')
    .eq('is_published', true)
    .not('ai_generated_content', 'is', null)

  if (category) q = q.eq('experts.category', category)
  if (query) q = q.ilike('title', `%${query}%`)

  const { data } = await q.order('created_at', { ascending: false })
  return data || []
}

const CATEGORIES = ['Tutti', 'Nutrizione', 'Fitness', 'Skincare', 'Benessere', 'Coaching']

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { cat?: string; q?: string }
}) {
  const category = searchParams.cat
  const query = searchParams.q
  const products = await getProducts(category, query)

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--neon)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 22 }}>malyte</span>
          </Link>
          <h1 style={{
            color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: 40, margin: '16px 0 12px 0', lineHeight: 1.2,
          }}>
            Trova il tuo <span style={{ color: 'var(--violet-light)' }}>piano personalizzato</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 17, margin: 0 }}>
            Metodologie reali di esperti, trasformate in piani digitali su misura per te.
          </p>
        </div>

        {/* Filtri + Ricerca */}
        <MarketplaceFilters
          categories={CATEGORIES}
          activeCategory={category}
          activeQuery={query}
        />

        {/* Risultati */}
        <div style={{ marginTop: 8, marginBottom: 16 }}>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>
            {products.length} {products.length === 1 ? 'prodotto' : 'prodotti'} disponibili
          </span>
        </div>

        {/* Grid prodotti */}
        {products.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            color: 'var(--muted)', fontSize: 15,
          }}>
            Nessun prodotto trovato. Prova a modificare i filtri.
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 24,
          }}>
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

      </div>
    </main>
  )
}

function ProductCard({ product }: { product: any }) {
  const content = product.ai_generated_content
  const tagline = content?.tagline || product.description
  const whatYouGet = content?.what_you_get?.slice(0, 2) || []

  return (
    <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid rgba(99,130,255,0.12)',
        borderRadius: 20,
        padding: '28px 24px',
        cursor: 'pointer',
        transition: 'border-color 0.2s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
        
      >
        {/* Category badge */}
        <div style={{ marginBottom: 16 }}>
          <span style={{
            background: 'rgba(124,92,252,0.12)',
            color: '#A78BFA',
            fontSize: 11, fontWeight: 600,
            padding: '4px 12px', borderRadius: 100,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {product.experts?.category || 'Wellness'}
          </span>
        </div>

        {/* Titolo */}
        <h2 style={{
          color: 'var(--text)', fontFamily: 'Syne, sans-serif',
          fontWeight: 700, fontSize: 20, margin: '0 0 10px 0', lineHeight: 1.3,
        }}>
          {product.title}
        </h2>

        {/* Tagline */}
        <p style={{
          color: 'var(--muted)', fontSize: 14, margin: '0 0 16px 0',
          lineHeight: 1.6, flex: 1,
        }}>
          {tagline?.length > 100 ? tagline.slice(0, 100) + '...' : tagline}
        </p>

        {/* Cosa ottieni preview */}
        {whatYouGet.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {whatYouGet.map((item: string, i: number) => (
              <div key={i} style={{
                color: '#6B7A99', fontSize: 12, padding: '4px 0',
                display: 'flex', alignItems: 'flex-start', gap: 6,
              }}>
                <span style={{ color: '#4DFFD2', flexShrink: 0 }}>✓</span>
                <span>{item.length > 60 ? item.slice(0, 60) + '...' : item}</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer card */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          paddingTop: 16, borderTop: '1px solid rgba(99,130,255,0.08)',
        }}>
          <div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: 20 }}>
              €{product.price}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 12 }}>
              by {product.experts?.name || 'Expert'}
            </div>
          </div>
          <div style={{
            background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
            color: '#fff', fontSize: 13, fontWeight: 600,
            padding: '8px 18px', borderRadius: 100,
          }}>
            Scopri →
          </div>
        </div>
      </div>
    </Link>
  )
}