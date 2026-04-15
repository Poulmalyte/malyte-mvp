'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function GeneratePage() {
  const [loading, setLoading] = useState(false)
  const [generated, setGenerated] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleGenerate() {
    setLoading(true)
    setError('')
    setGenerated(null)

    try {
      const res = await fetch('/api/generate-product', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Errore generazione')
      setGenerated(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!generated) return
    setSaving(true)

    try {
      const { error } = await supabase
        .from('products')
        .update({
          ai_generated_content: generated.generated_content,
          is_published: true,
        })
        .eq('id', generated.product_id)

      if (error) throw error
      setSaved(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const content = generated?.generated_content

  return (
    <div style={{ minHeight: '100vh', background: '#070B14', padding: '40px 20px', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ color: '#E8EDF8', fontSize: 28, fontFamily: 'Syne, sans-serif', fontWeight: 800, margin: 0 }}>
            Genera Prodotto AI
          </h1>
          <p style={{ color: '#6B7A99', marginTop: 8, fontSize: 15 }}>
            L'AI strutturerà il tuo prodotto usando <strong style={{ color: '#A78BFA' }}>solo la tua metodologia</strong>. Nulla viene inventato.
          </p>
        </div>

        {/* Avviso filosofia */}
        {!generated && !loading && (
          <div style={{
            background: 'rgba(77,255,210,0.06)',
            border: '1px solid rgba(77,255,210,0.2)',
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 32,
          }}>
            <p style={{ color: '#4DFFD2', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
              ✦ L'AI agisce come <strong>archivista</strong>, non come inventore.<br />
              Tutto l'output è tracciato alla fonte — se un'informazione manca, verrà segnalata come "Da specificare" invece di essere inventata.<br />
              <strong>Dovrai approvare il risultato prima che venga salvato.</strong>
            </p>
          </div>
        )}

        {/* Bottone genera */}
        {!generated && (
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              background: loading ? '#1a1f35' : 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
              color: '#fff',
              border: 'none',
              borderRadius: 100,
              padding: '16px 40px',
              fontSize: 16,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              width: '100%',
              transition: 'opacity 0.2s',
            }}
          >
            {loading ? '⟳ Generazione in corso...' : '✦ Genera il tuo prodotto digitale'}
          </button>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ color: '#7C5CFC', fontSize: 40, marginBottom: 16 }}>◌</div>
            <p style={{ color: '#6B7A99', fontSize: 15 }}>Claude sta leggendo la tua metodologia...</p>
            <p style={{ color: '#4B5568', fontSize: 13, marginTop: 8 }}>Solo le tue parole verranno usate.</p>
          </div>
        )}

        {/* Errore */}
        {error && (
          <div style={{
            background: 'rgba(255,80,80,0.08)',
            border: '1px solid rgba(255,80,80,0.3)',
            borderRadius: 12,
            padding: '16px 20px',
            marginTop: 24,
            color: '#FF6B6B',
            fontSize: 14,
          }}>
            ⚠ {error}
          </div>
        )}

        {/* Output generato */}
        {content && (
          <div style={{ marginTop: 16 }}>

            {/* Avviso approvazione */}
            <div style={{
              background: 'rgba(124,92,252,0.08)',
              border: '1px solid rgba(124,92,252,0.3)',
              borderRadius: 12,
              padding: '16px 20px',
              marginBottom: 32,
              color: '#A78BFA',
              fontSize: 14,
            }}>
              ⚠ Rivedi attentamente prima di approvare. Le sezioni "Da specificare dall'expert" richiedono integrazione manuale.
            </div>

            {/* Nome + tagline */}
            <Section title="Prodotto">
              <Field label="Nome" value={content.product_name} />
              <Field label="Tagline" value={content.tagline} />
              <Field label="Per chi è" value={content.for_who} />
              <Field label="Non adatto a" value={content.not_for_who} />
            </Section>

            {/* Cosa ottieni */}
            <Section title="Cosa ottieni">
              {content.what_you_get?.map((item: string, i: number) => (
                <div key={i} style={{ padding: '10px 0', borderBottom: '1px solid rgba(99,130,255,0.08)', color: '#E8EDF8', fontSize: 14 }}>
                  · {item}
                </div>
              ))}
            </Section>

            {/* Principi metodologia */}
            <Section title="Principi della metodologia">
              {content.methodology_principles?.map((p: any, i: number) => (
                <div key={i} style={{ marginBottom: 20, padding: 16, background: '#0D1525', borderRadius: 10 }}>
                  <div style={{ color: '#A78BFA', fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{p.title}</div>
                  <div style={{ color: '#E8EDF8', fontSize: 14, marginBottom: 6 }}>{p.description}</div>
                  <div style={{ color: '#4DFFD2', fontSize: 12 }}>📎 {p.source}</div>
                </div>
              ))}
            </Section>

            {/* Risultati attesi */}
            <Section title="Risultati attesi">
              {content.expected_results?.map((r: any, i: number) => (
                <div key={i} style={{ marginBottom: 14, padding: 14, background: '#0D1525', borderRadius: 10 }}>
                  <div style={{ color: '#E8EDF8', fontSize: 14, marginBottom: 4 }}>✓ {r.result}</div>
                  <div style={{ color: '#4DFFD2', fontSize: 12 }}>📎 {r.source}</div>
                </div>
              ))}
            </Section>

            {/* Struttura programma */}
            <Section title="Struttura programma">
              <Field label="Durata" value={content.program_structure?.duration} />
              <Field label="Frequenza" value={content.program_structure?.frequency} />
            </Section>

            {/* Note generazione */}
            {content.generation_notes && (
              <div style={{
                background: 'rgba(255,200,50,0.06)',
                border: '1px solid rgba(255,200,50,0.2)',
                borderRadius: 12,
                padding: '16px 20px',
                marginTop: 8,
                color: '#FFD166',
                fontSize: 13,
              }}>
                📝 {content.generation_notes}
              </div>
            )}

            {/* Bottoni azione */}
            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button
                onClick={() => { setGenerated(null); setSaved(false) }}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid rgba(99,130,255,0.3)',
                  color: '#6B7A99',
                  borderRadius: 100,
                  padding: '14px 24px',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                ↺ Rigenera
              </button>

              <button
                onClick={handleApprove}
                disabled={saving || saved}
                style={{
                  flex: 2,
                  background: saved ? '#0D1525' : 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
                  color: saved ? '#4DFFD2' : '#fff',
                  border: saved ? '1px solid #4DFFD2' : 'none',
                  borderRadius: 100,
                  padding: '14px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: saving || saved ? 'not-allowed' : 'pointer',
                }}
              >
                {saved ? '✓ Salvato — redirect...' : saving ? 'Salvataggio...' : '✓ Approvo e pubblico'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componenti helper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h3 style={{
        color: '#6385FF',
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 14,
        margin: '0 0 14px 0',
      }}>
        {title}
      </h3>
      <div style={{
        background: '#0D1525',
        borderRadius: 12,
        padding: '16px 20px',
        border: '1px solid rgba(99,130,255,0.1)',
      }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  const isMissing = !value || value.toLowerCase().includes('da specificare')
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(99,130,255,0.08)' }}>
      <div style={{ color: '#6B7A99', fontSize: 12, marginBottom: 4 }}>{label}</div>
      <div style={{ color: isMissing ? '#FF6B6B' : '#E8EDF8', fontSize: 14 }}>
        {value || 'Da specificare dall\'expert'}
      </div>
    </div>
  )
}