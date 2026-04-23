'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const categories = [
  { id: 'fitness', label: '🏋️ Fitness & Training' },
  { id: 'nutrition', label: '🥗 Nutrition' },
  { id: 'skincare', label: '✨ Skincare & Beauty' },
  { id: 'mental', label: '🧠 Mental Wellness' },
  { id: 'running', label: '🏃 Running & Endurance' },
  { id: 'yoga', label: '💆 Yoga & Mindfulness' },
]

const pricingModels = [
  { id: 'one_time', label: '💳 One-time payment', desc: 'Client pays once and gets lifetime access' },
  { id: 'subscription', label: '🔄 Monthly subscription', desc: 'Client pays monthly for continued access' },
  { id: 'bundle', label: '📦 Bundle', desc: 'Offer base + premium at different price points' },
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

  // Step 3
  const [productTitle, setProductTitle] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [price, setPrice] = useState('')
  const [pricingModel, setPricingModel] = useState('')

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

      const materialUrls: string[] = []
      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const filePath = `${user.id}/${Date.now()}-${file.name}`
          const { error: uploadError } = await supabase.storage
            .from('expert-materials')
            .upload(filePath, file)
          if (!uploadError) materialUrls.push(filePath)
        }
      }

      const expertSlug = generateSlug(name)

      const { error: expertError } = await supabase
        .from('experts')
        .upsert({
          id: user.id,
          name,
          slug: expertSlug,
          category,
          methodology_name: methodologyName,
          methodology_description: methodologyDesc,
          results_description: resultsDesc,
          materials_urls: materialUrls,
          is_published: false,
        })

      if (expertError) {
        setError('Error saving profile: ' + expertError.message)
        setLoading(false)
        return
      }

      const { error: productError } = await supabase
        .from('products')
        .insert({
          expert_id: user.id,
          title: productTitle,
          description: productDesc,
          price: parseFloat(price),
          pricing_model: pricingModel,
          is_published: false,
        })

      if (productError) {
        setError('Error creating product: ' + productError.message)
        setLoading(false)
        return
      }

      router.push('/dashboard')

    } catch {
      setError('Unexpected error. Please try again.')
      setLoading(false)
    }
  }

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 24px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>

        {/* Logo */}
        <div style={{ fontFamily: 'Satoshi', fontWeight: 800, fontSize: '22px', marginBottom: '40px' }}>
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
              Step 1 of 3
            </div>
            <h1 style={{ fontFamily: 'Satoshi', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Who are you? 👋
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.6 }}>
              Start with the basics. This information will appear on your public profile.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Full name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. John Smith"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Your profession</label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. Personal Trainer — Strength & Hypertrophy"
                style={{
                  width: '100%', padding: '12px 16px', borderRadius: '10px',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  color: 'var(--text)', fontSize: '15px', outline: 'none'
                }}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '12px' }}>What category do you work in?</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {categories.map((cat) => (
                  <button
                    type="button"
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

            {error && <div style={{ background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#FF5C7A', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <button
              onClick={() => {
                if (!name || !profession || !category) { setError('Please fill in all fields and select a category'); return }
                setError(''); setStep(2)
              }}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C5CFC, #5B3FD4)', color: 'white', fontWeight: 600, fontSize: '15px', border: 'none', cursor: 'pointer' }}
            >
              Continue →
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Step 2 of 3
            </div>
            <h1 style={{ fontFamily: 'Satoshi', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Your method 🧬
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.6 }}>
              The more detail you provide, the better the digital product the AI will generate for you.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>What is your method called?</label>
              <input
                type="text"
                value={methodologyName}
                onChange={(e) => setMethodologyName(e.target.value)}
                placeholder="e.g. The 3F Method — Force, Form, Function"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Describe your methodology</label>
              <textarea
                value={methodologyDesc}
                onChange={(e) => setMethodologyDesc(e.target.value)}
                placeholder="e.g. My approach is based on 3 pillars..."
                rows={4}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>What results do you achieve with your clients?</label>
              <textarea
                value={resultsDesc}
                onChange={(e) => setResultsDesc(e.target.value)}
                placeholder="e.g. My clients lose an average of 8kg in 12 weeks..."
                rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Upload your materials (PDF, documents) — optional</label>
              <div
                style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '32px', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <div style={{ fontSize: '28px', marginBottom: '8px' }}>📁</div>
                <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                  {files && files.length > 0 ? `${files.length} file(s) selected` : 'Click to upload — PDF, DOCX (Max 50MB)'}
                </div>
              </div>
              <input id="file-upload" type="file" multiple accept=".pdf,.doc,.docx" onChange={(e) => setFiles(e.target.files)} style={{ display: 'none' }} />
            </div>

            {error && <div style={{ background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#FF5C7A', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(1)} style={{ padding: '14px 24px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 500, fontSize: '15px', cursor: 'pointer' }}>← Back</button>
              <button
                onClick={() => {
                  if (!methodologyName || !methodologyDesc || !resultsDesc) { setError('Please fill in all required fields'); return }
                  setError(''); setStep(3)
                }}
                style={{ flex: 1, padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #7C5CFC, #5B3FD4)', color: 'white', fontWeight: 600, fontSize: '15px', border: 'none', cursor: 'pointer' }}
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '8px', letterSpacing: '2px', textTransform: 'uppercase' }}>
              Step 3 of 3
            </div>
            <h1 style={{ fontFamily: 'Satoshi', fontSize: '28px', fontWeight: 800, marginBottom: '8px' }}>
              Your product 🚀
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '15px', marginBottom: '36px', lineHeight: 1.6 }}>
              Define your digital product and price. You can edit it at any time.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Product name</label>
              <input
                type="text"
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="e.g. 12-Week Transformation Plan"
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Short product description</label>
              <textarea
                value={productDesc}
                onChange={(e) => setProductDesc(e.target.value)}
                placeholder="e.g. A personalized 12-week plan to transform your body..."
                rows={3}
                style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', outline: 'none', resize: 'vertical', lineHeight: 1.6, fontFamily: 'Inter, sans-serif' }}
              />
            </div>

            <div style={{ marginBottom: '28px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '8px' }}>Price (€)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="e.g. 49"
                min="1"
                style={{ width: '200px', padding: '12px 16px', borderRadius: '10px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '15px', outline: 'none' }}
              />
            </div>

            <div style={{ marginBottom: '36px' }}>
              <label style={{ fontSize: '13px', color: 'var(--muted)', display: 'block', marginBottom: '12px' }}>Sales model</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {pricingModels.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setPricingModel(model.id)}
                    style={{
                      padding: '16px 20px', borderRadius: '12px', textAlign: 'left',
                      border: `1px solid ${pricingModel === model.id ? '#7C5CFC' : 'var(--border)'}`,
                      background: pricingModel === model.id ? 'rgba(124,92,252,0.1)' : 'var(--surface)',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '14px', color: pricingModel === model.id ? '#A78BFA' : 'var(--text)', marginBottom: '4px' }}>
                      {model.label}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{model.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {error && <div style={{ background: 'rgba(255,92,122,0.1)', border: '1px solid rgba(255,92,122,0.3)', borderRadius: '10px', padding: '12px 16px', color: '#FF5C7A', fontSize: '13px', marginBottom: '16px' }}>{error}</div>}

            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={() => setStep(2)} style={{ padding: '14px 24px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 500, fontSize: '15px', cursor: 'pointer' }}>← Back</button>
              <button
                onClick={() => {
                  if (!productTitle || !productDesc || !price || !pricingModel) { setError('Please fill in all fields and select a sales model'); return }
                  handleSubmit()
                }}
                disabled={loading}
                style={{
                  flex: 1, padding: '14px', borderRadius: '12px',
                  background: loading ? 'var(--surface2)' : 'linear-gradient(135deg, #4DFFD2, #3BC4A8)',
                  color: loading ? 'var(--muted)' : '#070B14',
                  fontWeight: 700, fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Saving...' : '🎉 Launch my product!'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}