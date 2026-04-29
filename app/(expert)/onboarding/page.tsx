'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗', desc: 'Meal plans, macros, dietary protocols' },
  { id: 'fitness', label: 'Fitness & Training', emoji: '🏋️', desc: 'Strength, hypertrophy, conditioning' },
  { id: 'running', label: 'Running & Endurance', emoji: '🏃', desc: 'Marathon, trail, cycling, triathlon' },
  { id: 'yoga', label: 'Yoga & Mindfulness', emoji: '💆', desc: 'Yoga, meditation, breathwork' },
  { id: 'skincare', label: 'Skincare & Beauty', emoji: '✨', desc: 'Skin health, routines, wellness' },
  { id: 'mental', label: 'Mental Wellness', emoji: '🧠', desc: 'Coaching, therapy, stress management' },
  { id: 'wellness', label: 'Holistic Wellness', emoji: '🌿', desc: 'Lifestyle, longevity, integrative health' },
  { id: 'other', label: 'Other', emoji: '➕', desc: 'Any other professional category' },
]

const input: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '10px',
  background: '#F5F7FA', border: '1px solid #E8EDF8',
  color: '#0F172A', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
}

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [category, setCategory] = useState('')

  const selectedCategory = CATEGORIES.find(c => c.id === category)

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 6)
  }

  async function handleSubmit() {
    if (!firstName || !lastName || !age || !sex || !category) {
      setError('Please fill in all fields'); return
    }
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const fullName = `${firstName} ${lastName}`.trim()
      const expertSlug = generateSlug(fullName || firstName)

      const { error: expertError } = await supabase.from('experts').upsert({
        id: user.id,
        name: fullName,
        slug: expertSlug,
        category,
        methodology_name: selectedCategory?.label || category,
        is_published: false,
      })
      if (expertError) { setError('Error saving profile: ' + expertError.message); setLoading(false); return }

      await supabase.from('profiles').upsert({
        id: user.id, name: fullName, role: 'expert',
      }, { onConflict: 'id' })

      router.push('/dashboard?tab=method')
    } catch {
      setError('Unexpected error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .ob-grid { grid-template-columns: 1fr !important; }
          .ob-modal { padding: 28px 20px !important; }
          .cat-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F0EFFE 0%, #E8F4FD 50%, #F0FDF9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', fontFamily: "'Inter', sans-serif",
      }}>
        <div className="ob-modal" style={{
          width: '100%', maxWidth: '520px',
          background: '#FFFFFF', borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
          maxHeight: '90vh', overflowY: 'auto',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: '24px', color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </div>

          {/* Progress bar — sempre piena al 100% perché è l'unico step */}
          <div style={{ height: '3px', background: '#E8EDF8', borderRadius: '100px', marginBottom: '32px' }}>
            <div style={{ height: '100%', borderRadius: '100px', background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)', width: '100%' }} />
          </div>

          <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Almost there</div>
          <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: '#0F172A', textAlign: 'center' }}>Who are you? 👋</h1>
          <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6, textAlign: 'center' }}>
            This information will appear on your public profile. You can always update it later.
          </p>

          <div className="ob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>FIRST NAME</label>
              <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Sara" style={input} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>LAST NAME</label>
              <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Rossi" style={input} />
            </div>
          </div>

          <div className="ob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
            <div>
              <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>AGE</label>
              <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 32" min="18" max="99" style={input} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>SEX</label>
              <select value={sex} onChange={e => setSex(e.target.value)} style={{ ...input, appearance: 'none' as any }}>
                <option value="">Select...</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '28px' }}>
            <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>PROFESSIONAL CATEGORY</label>
            <button
              onClick={() => setShowCategoryModal(true)}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: '10px', textAlign: 'left',
                background: category ? '#EDE9FE' : '#F5F7FA',
                border: category ? '1.5px solid #7C5CFC' : '1px solid #E8EDF8',
                cursor: 'pointer', fontSize: '14px', fontWeight: category ? 600 : 400,
                color: category ? '#7C5CFC' : '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                fontFamily: 'Inter, sans-serif',
              }}
            >
              <span>{selectedCategory ? `${selectedCategory.emoji} ${selectedCategory.label}` : 'Select your category...'}</span>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>▼</span>
            </button>
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#EF4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px',
              background: loading ? '#C4B5FD' : '#7C5CFC',
              color: '#fff', fontWeight: 700, fontSize: '15px',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'Satoshi, sans-serif',
            }}
          >
            {loading ? 'Saving...' : "Let's go →"}
          </button>

          <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: '16px' }}>
            You&apos;ll complete your method and create your first product from the dashboard.
          </p>
        </div>
      </div>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: '0 0 4px' }}>Select your category</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>Choose the one that best describes your expertise</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>
            <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setCategory(cat.id); setShowCategoryModal(false) }}
                  style={{
                    padding: '18px 14px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer',
                    border: `2px solid ${category === cat.id ? '#7C5CFC' : '#E8EDF8'}`,
                    background: category === cat.id ? '#EDE9FE' : '#F8FAFC',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>
                  <div style={{ fontSize: '26px', marginBottom: '8px' }}>{cat.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: category === cat.id ? '#7C5CFC' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>{cat.label}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.4 }}>{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}