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

  const content = product.ai_generated_content
  const expert = product.experts as any

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Nav */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(99,130,255,0.1)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/marketplace" style={{ textDecoration: 'none', color: 'var(--muted)', fontSize: 14 }}>
            ← Torna al marketplace
          </Link>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <span style={{ color: 'var(--neon)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 20 }}>malyte</span>
          </Link>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 48, marginBottom: 48 }}>
          <div>
            <div style={{ marginBottom: 16 }}>
              <span style={{
                background: 'rgba(124,92,252,0.12)', color: '#A78BFA',
                fontSize: 11, fontWeight: 600, padding: '4px 12px',
                borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.08em',
              }}>
                {expert?.category || 'Wellness'}
              </span>
            </div>
            <h1 style={{
              color: 'var(--text)', fontFamily: 'Syne, sans-serif',
              fontWeight: 800, fontSize: 36, margin: '0 0 16px 0', lineHeight: 1.2,
            }}>
              {product.title}
            </h1>
            {content?.tagline && (
              <p style={{ color: 'var(--muted)', fontSize: 18, lineHeight: 1.6, margin: 0 }}>
                {content.tagline}
              </p>
            )}
          </div>

          {/* Box acquisto */}
          <div style={{
            background: 'var(--surface)',
            border: '1px solid rgba(124,92,252,0.2)',
            borderRadius: 20, padding: '28px 24px',
            height: 'fit-content',
          }}>
            <div style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 36, marginBottom: 4 }}>
              €{product.price}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 24 }}>
              {product.pricing_model === 'one_time' ? 'Pagamento unico' : 'Abbonamento mensile'}
            </div>
            <Link href="/login">
              <button style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
                color: '#fff', border: 'none', borderRadius: 100,
                padding: '16px', fontSize: 16, fontWeight: 700,
                cursor: 'pointer', marginBottom: 12,
              }}>
                Acquista ora
              </button>
            </Link>
            <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center', margin: 0 }}>
              Piano personalizzato generato dopo l'acquisto
            </p>

            {/* Expert mini profile */}
            <div style={{
              marginTop: 24, paddingTop: 20,
              borderTop: '1px solid rgba(99,130,255,0.1)',
            }}>
              <div style={{ color: 'var(--muted)', fontSize: 11, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Expert</div>
              <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: 15 }}>{expert?.name}</div>
              <div style={{ color: '#A78BFA', fontSize: 13 }}>{expert?.category}</div>
              {expert?.methodology_name && (
                <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                  "{expert.methodology_name}"
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cosa ottieni */}
        {content?.what_you_get?.length > 0 && (
          <Section title="Cosa ottieni">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
              {content.what_you_get.map((item: string, i: number) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  padding: '12px 16px',
                  background: 'rgba(77,255,210,0.04)',
                  borderRadius: 10, border: '1px solid rgba(77,255,210,0.1)',
                }}>
                  <span style={{ color: '#4DFFD2', flexShrink: 0, fontWeight: 700 }}>✓</span>
                  <span style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.5 }}>{item}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Principi metodologia */}
        {content?.methodology_principles?.length > 0 && (
          <Section title="La metodologia">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {content.methodology_principles.map((p: any, i: number) => (
                <div key={i} style={{
                  padding: '20px',
                  background: 'var(--surface2)',
                  borderRadius: 12,
                  borderLeft: '3px solid #7C5CFC',
                }}>
                  <div style={{ color: '#A78BFA', fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{p.title}</div>
                  <div style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{p.description}</div>
                  {p.source && (
                    <div style={{ color: '#4DFFD2', fontSize: 12 }}>📎 {p.source}</div>
                  )}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Risultati attesi */}
        {content?.expected_results?.length > 0 && (
          <Section title="Risultati attesi">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {content.expected_results.map((r: any, i: number) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  padding: '16px', background: 'var(--surface2)', borderRadius: 10,
                }}>
                  <span style={{ color: '#4DFFD2', fontSize: 18, flexShrink: 0 }}>✦</span>
                  <div>
                    <div style={{ color: 'var(--text)', fontSize: 14, lineHeight: 1.5 }}>{r.result}</div>
                    {r.source && <div style={{ color: '#6B7A99', fontSize: 12, marginTop: 4 }}>{r.source}</div>}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* CTA finale */}
        <div style={{
          textAlign: 'center', marginTop: 48, padding: '48px',
          background: 'var(--surface)', borderRadius: 20,
          border: '1px solid rgba(124,92,252,0.2)',
        }}>
          <h2 style={{ color: 'var(--text)', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, margin: '0 0 12px 0' }}>
            Pronto a iniziare?
          </h2>
          <p style={{ color: 'var(--muted)', fontSize: 16, margin: '0 0 28px 0' }}>
            Dopo l'acquisto riceverai un piano completamente personalizzato basato sulla metodologia di {expert?.name}.
          </p>
          <Link href="/login">
            <button style={{
              background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
              color: '#fff', border: 'none', borderRadius: 100,
              padding: '16px 48px', fontSize: 17, fontWeight: 700, cursor: 'pointer',
            }}>
              Acquista per €{product.price}
            </button>
          </Link>
        </div>

      </div>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        color: '#6385FF', fontSize: 11, fontWeight: 600,
        letterSpacing: '0.12em', textTransform: 'uppercase',
        margin: '0 0 16px 0',
      }}>{title}</h2>
      {children}
    </div>
  )
}