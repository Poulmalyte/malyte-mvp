'use client'

import { useState } from 'react'

const CATEGORIES = ['Skincare', 'Fitness', 'Nutrition', 'Mental Coaching', 'Wellness', 'Business Coaching', 'Other']

const SELLER_TYPES = [
  { value: 'brand', emoji: '🏪', label: 'Brand', desc: 'I have a brand with physical or digital products' },
  { value: 'practitioner', emoji: '👩‍⚕️', label: 'Practitioner', desc: 'I am a professional with a personal method' },
  { value: 'pdf_seller', emoji: '📄', label: 'PDF Seller', desc: 'I have a guide or digital program' },
]

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid #E8EDF8', fontSize: 13, color: '#0F172A',
  background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', lineHeight: 1.6,
}

interface Props {
  initialData: any
  onComplete: (data: any) => void
}

export default function Step1Identity({ initialData, onComplete }: Props) {
  const [sellerType, setSellerType] = useState(initialData?.seller_type || 'brand')
  const [category, setCategory] = useState(initialData?.category || '')
  const [targetCustomer, setTargetCustomer] = useState(initialData?.target_customer || '')
  const [philosophy, setPhilosophy] = useState(initialData?.philosophy || '')
  const [toneOfVoice, setToneOfVoice] = useState(initialData?.tone_of_voice || '')
  const [heroIngredients, setHeroIngredients] = useState(initialData?.hero_ingredients || '')
  const [avoidIngredients, setAvoidIngredients] = useState(initialData?.avoid_ingredients || '')
  const [showOptional, setShowOptional] = useState(false)
  const [error, setError] = useState('')

  function handleContinue() {
    if (!category) { setError('Please select a category.'); return }
    if (!targetCustomer.trim()) { setError('Please describe your ideal customer.'); return }
    setError('')
    onComplete({
      seller_type: sellerType,
      category,
      target_customer: targetCustomer,
      philosophy,
      tone_of_voice: toneOfVoice,
      hero_ingredients: heroIngredients,
      avoid_ingredients: avoidIngredients,
    })
  }

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>
        Tell us about your business
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 28px', lineHeight: 1.6 }}>
        This helps Malyte generate the right plans for your customers.
      </p>

      {/* Seller type */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
          WHAT BEST DESCRIBES YOU?
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {SELLER_TYPES.map(t => (
            <div key={t.value} onClick={() => setSellerType(t.value)}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: `2px solid ${sellerType === t.value ? '#7C5CFC' : '#E8EDF8'}`, background: sellerType === t.value ? '#F5F3FF' : '#FAFAFA', transition: 'all 0.15s' }}>
              <span style={{ fontSize: 24 }}>{t.emoji}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: sellerType === t.value ? '#7C5CFC' : '#0F172A', margin: '0 0 2px' }}>{t.label}</p>
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{t.desc}</p>
              </div>
              <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: `2px solid ${sellerType === t.value ? '#7C5CFC' : '#CBD5E1'}`, background: sellerType === t.value ? '#7C5CFC' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {sellerType === t.value && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>
          CATEGORY *
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CATEGORIES.map(cat => (
            <button key={cat} onClick={() => setCategory(cat)}
              style={{ padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: `1px solid ${category === cat ? '#7C5CFC' : '#E8EDF8'}`, background: category === cat ? '#EDE9FE' : '#F8FAFC', color: category === cat ? '#7C5CFC' : '#64748B', transition: 'all 0.15s' }}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Target customer */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
          WHO IS YOUR IDEAL CUSTOMER? *
        </label>
        <input
          type="text"
          value={targetCustomer}
          onChange={e => setTargetCustomer(e.target.value)}
          placeholder="e.g. Women 25-45 with sensitive skin looking for clean beauty"
          style={inputStyle}
        />
      </div>

      {/* Optional fields */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={() => setShowOptional(!showOptional)}
          style={{ fontSize: 13, color: '#7C5CFC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
          {showOptional ? '▲ Hide' : '▼ Add more detail'} (optional)
        </button>

        {showOptional && (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>BRAND PHILOSOPHY</label>
              <textarea value={philosophy} onChange={e => setPhilosophy(e.target.value)}
                placeholder="e.g. Clean, science-backed skincare that respects your skin barrier"
                style={{ ...inputStyle, height: 80, resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>TONE OF VOICE</label>
              <input type="text" value={toneOfVoice} onChange={e => setToneOfVoice(e.target.value)}
                placeholder="e.g. Professional but approachable, science-focused"
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>HERO INGREDIENTS</label>
              <input type="text" value={heroIngredients} onChange={e => setHeroIngredients(e.target.value)}
                placeholder="e.g. Niacinamide, Hyaluronic Acid, Peptides"
                style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>INGREDIENTS TO AVOID</label>
              <input type="text" value={avoidIngredients} onChange={e => setAvoidIngredients(e.target.value)}
                placeholder="e.g. Parabens, Sulfates, Artificial fragrances"
                style={inputStyle} />
            </div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 13 }}>
          {error}
        </div>
      )}

      <button onClick={handleContinue}
        style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>
        Continue →
      </button>
    </div>
  )
}