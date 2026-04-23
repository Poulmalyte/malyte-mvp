'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@supabase/ssr'

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Argentina', 'Australia', 'Austria',
  'Belgium', 'Brazil', 'Canada', 'Chile', 'China', 'Colombia', 'Croatia',
  'Czech Republic', 'Denmark', 'Egypt', 'Finland', 'France', 'Germany',
  'Greece', 'Hungary', 'India', 'Indonesia', 'Ireland', 'Israel', 'Italy',
  'Japan', 'Jordan', 'Kenya', 'Malaysia', 'Mexico', 'Morocco', 'Netherlands',
  'New Zealand', 'Nigeria', 'Norway', 'Pakistan', 'Peru', 'Philippines',
  'Poland', 'Portugal', 'Romania', 'Russia', 'Saudi Arabia', 'Serbia',
  'Singapore', 'South Africa', 'South Korea', 'Spain', 'Sweden', 'Switzerland',
  'Thailand', 'Turkey', 'Ukraine', 'United Arab Emirates', 'United Kingdom',
  'United States', 'Venezuela', 'Vietnam',
]

export default function ClientOnboardingPage() {
  const router = useRouter()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: '',
    birth_date: '',
    sex: '',
    country: '',
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
    })
  }, [])

  const handleSave = async () => {
    if (!form.name || !form.birth_date || !form.sex || !form.country) {
      setError('All fields are required.')
      return
    }
    setSaving(true)
    setError('')

    const { error: err } = await supabase.from('profiles').upsert({
      id: userId,
      name: form.name,
      birth_date: form.birth_date,
      sex: form.sex,
      country: form.country,
    }, { onConflict: 'id' })

    if (err) {
      setError('Error saving. Try again.')
      setSaving(false)
      return
    }

    router.push('/marketplace')
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '12px 16px',
    borderRadius: 12,
    border: '1.5px solid rgba(99,130,255,0.2)',
    background: '#0D1525',
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: '#E8EDF8',
    outline: 'none',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 26, fontWeight: 800, color: '#E8EDF8' }}>
            mal<span style={{ color: '#7C5CFC' }}>yte</span>
          </span>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✨</div>
          <h1 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 24, color: '#E8EDF8', marginBottom: 8 }}>
            Complete your profile
          </h1>
          <p style={{ color: '#6B7A99', fontFamily: "'Inter', sans-serif", fontSize: 14, lineHeight: 1.6 }}>
            We need a few details to personalize your experience.
          </p>
        </div>

        {/* Form */}
        <div style={{ background: '#0D1525', border: '1px solid rgba(99,130,255,0.12)', borderRadius: 20, padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 8 }}>
              Full name *
            </label>
            <input
              type="text"
              placeholder="e.g. Marco Rossi"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#7C5CFC'}
              onBlur={e => e.target.style.borderColor = 'rgba(99,130,255,0.2)'}
            />
          </div>

          {/* Birth date + Sex */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 8 }}>
                Date of birth *
              </label>
              <input
                type="date"
                value={form.birth_date}
                onChange={e => setForm({ ...form, birth_date: e.target.value })}
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#7C5CFC'}
                onBlur={e => e.target.style.borderColor = 'rgba(99,130,255,0.2)'}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 8 }}>
                Sex *
              </label>
              <select
                value={form.sex}
                onChange={e => setForm({ ...form, sex: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => e.target.style.borderColor = '#7C5CFC'}
                onBlur={e => e.target.style.borderColor = 'rgba(99,130,255,0.2)'}
              >
                <option value="">Select…</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Country */}
          <div>
            <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 8 }}>
              Country *
            </label>
            <select
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => e.target.style.borderColor = '#7C5CFC'}
              onBlur={e => e.target.style.borderColor = 'rgba(99,130,255,0.2)'}
            >
              <option value="">Select your country…</option>
              {COUNTRIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {error && (
            <p style={{ color: '#FF6B6B', fontFamily: "'Inter', sans-serif", fontSize: 13, textAlign: 'center' }}>
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              width: '100%',
              background: saving ? '#5B3FBD' : 'linear-gradient(135deg, #7C5CFC, #6385FF)',
              border: 'none', borderRadius: 12,
              padding: '15px',
              color: '#fff',
              fontFamily: "'Satoshi', sans-serif",
              fontWeight: 700, fontSize: 16,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving…' : 'Continue →'}
          </button>
        </div>

        <p style={{ textAlign: 'center', color: '#4B5563', fontFamily: "'Inter', sans-serif", fontSize: 12, marginTop: 20 }}>
          You can update these details anytime in your Account settings.
        </p>

      </div>
    </div>
  )
}