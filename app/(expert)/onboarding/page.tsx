'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const categories = [
  { id: 'fitness', label: '🏋️ Fitness & Allenamento' },
  { id: 'nutrition', label: '🥗 Nutrizione' },
  { id: 'skincare', label: '✨ Skincare & Bellezza' },
  { id: 'mental', label: '🧠 Mental Wellness' },
  { id: 'running', label: '🏃 Running & Endurance' },
  { id: 'yoga', label: '💆 Yoga & Mindfulness' },
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  // Step 1
  const [name, setName] = useState('')
  const [profession, setProfession] = useState('')
  const [category, setCategory] = useState('')

  // Step 2
  const [methodologyName, setMethodologyName] = useState('')
  const [methodologyDesc, setMethodologyDesc] = useState('')
  const [resultsDesc, setResultsDesc] = useState('')
  const [files, setFiles] = useState<FileList | null>(null)

  function generateSlug(name: string) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 6)
  }

  async function handleSubmit() {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      // Carica i file su Storage
      const materialUrls: string[] = []
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const filePath = `${user.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('expert-materials')
            .upload(filePath, file)
          if (!uploadError) {
            materialUrls.push(filePath)
          }
        }
      }

      // Salva il profilo expert nel DB
      const { error: dbError } = await supabase
        .from('experts')
        .upsert({
          id: user.id,
          name,
          slug: generateSlug(name),
          category,
          methodology_name: methodologyName,
          methodology_description: methodologyDesc,
          results_description: resultsDesc,
          materials_urls: materialUrls,
          is_published: false,
        })

      if (dbError) {
        setError('Errore nel salvataggio: ' + dbError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')

    } catch {
      setError('Errore imprevisto. Riprova.')
      setLoading(false)
    }
  }

  const progress = step === 1 ? 50 : 100

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px', marginBottom: '40px' }}>
          maly<span style={{ color: 'var(--neon)' }}>te</span>
        </div>

        {/* Progress bar */}
        <div style={{ height: '3px', background: 'var(--surface2)', borderRadius: '100px', marginBottom: '48px' }}>
          <div style={{
            height: '100%', borderRadius: '100px',
            background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)',
            width: `${progress}%`, transition: 'width 0.5s ease'
          }} />
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Passo 1 di 2
            </div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Chi sei? 👋
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.6 }}>
              Inizia con le basi. Questi dati appariranno sul tuo profilo pubblico.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                Nome completo
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="es. Marco Bianchi"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                La tua professione
              </label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="es. Personal Trainer — Forza e Ipertrofia"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '12px' }}>
                In quale categoria operi?
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    style={{
                      padding: '8px 16px', borderRadius: '100px',
                      border: `1px solid ${category === cat.id ? '#7C5CFC' : 'var(--border)'}`,
                      background: category === cat.id ? 'rgba(124,92,252,0.1)' : 'transparent',
                      color: category === cat.id ? '#A78BFA' : 'var(--muted)',
                      fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.3)',
                borderRadius: '10px', padding: '12px 16px',
                color: '#FF5C7A', fontSize: '13px', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <button
              onClick={() => {
                if (!name || !profession || !category) {
                  setError('Compila tutti i campi e seleziona una categoria')
                  return
                }
                setError('')
                setStep(2)
              }}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #7C5CFC, #5B3FD4)',
                color: 'white', fontWeight: 600, fontSize: '15px',
                border: 'none', cursor: 'pointer'
              }}
            >
              Continua →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Passo 2 di 2
            </div>
            <h1 style={{ fontFamily: 'Syne', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Il tuo metodo 🧬
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.6 }}>
              Più dettagli dai, migliore sarà il prodotto digitale che l&apos;AI genererà per te.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                Come si chiama il tuo metodo?
              </label>
              <input
                type="text"
                value={methodologyName}
                onChange={(e) => setMethodologyName(e.target.value)}
                placeholder="es. Metodo 3F — Forza, Forma, Funzione"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                Descrivi la tua metodologia
              </label>
              <textarea
                value={methodologyDesc}
                onChange={(e) => setMethodologyDesc(e.target.value)}
                placeholder="es. Il mio approccio si basa su 3 pilastri: forza funzionale, composizione corporea e abitudini sostenibili..."
                rows={4}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none',
                  resize: 'vertical', lineHeight: 1.6,
                  fontFamily: 'DM Sans, sans-serif'
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                Che risultati ottieni con i tuoi clienti?
              </label>
              <textarea
                value={resultsDesc}
                onChange={(e) => setResultsDesc(e.target.value)}
                placeholder="es. I miei clienti perdono in media 8kg in 12 settimane mantenendo la massa muscolare..."
                rows={3}
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none',
                  resize: 'vertical', lineHeight: 1.6,
                  fontFamily: 'DM Sans, sans-serif'
                }}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>
                Carica i tuoi materiali (PDF, documenti) — opzionale
              </label>
              <div
                style={{
                  border: '2px dashed var(--border)', borderRadius: '12px',
                  padding: '32px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  {files && files.length > 0
                    ? `${files.length} file selezionati`
                    : 'Clicca per caricare — PDF, DOCX (Max 50MB)'}
                </div>
              </div>
              <input
                id="file-upload"
                type="file"
                multiple
                accept=".pdf,.doc,.docx"
                onChange={(e) => setFiles(e.target.files)}
                style={{ display: 'none' }}
              />
            </div>

            {error && (
              <div style={{
                background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.3)',
                borderRadius: '10px', padding: '12px 16px',
                color: '#FF5C7A', fontSize: '13px', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  padding: '14px 24px', borderRadius: '12px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontWeight: 500, fontSize: '15px',
                  cursor: 'pointer'
                }}
              >
                ← Indietro
              </button>
              <button
                onClick={() => {
                  if (!methodologyName || !methodologyDesc || !resultsDesc) {
                    setError('Compila tutti i campi obbligatori')
                    return
                  }
                  handleSubmit()
                }}
                disabled={loading}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, #4DFFD2, #3BC4A8)',
                  color: loading ? 'var(--muted)' : '#070B14',
                  fontWeight: 700, fontSize: '15px',
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Salvataggio...' : '🚀 Completa il profilo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}