'use client'

import { useState, useEffect } from 'react'
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

export default function WelcomeModal() {
  const [show, setShow] = useState(false)
  const [userId, setUserId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ country: '', birth_date: '', sex: '' })

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('country, birth_date, sex')
        .eq('id', user.id)
        .single()

      // Mostra il modale se manca almeno uno dei 3 campi
      if (!profile?.country || !profile?.birth_date || !profile?.sex) {
        setShow(true)
        setForm({
          country: profile?.country || '',
          birth_date: profile?.birth_date || '',
          sex: profile?.sex || '',
        })
      }
    }
    check()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await supabase.from('profiles').update({
      country: form.country || null,
      birth_date: form.birth_date || null,
      sex: form.sex || null,
    }).eq('id', userId)
    setSaving(false)
    setShow(false)
  }

  const handleSkip = () => setShow(false)

  if (!show) return null

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box' as const,
    padding: '11px 14px',
    borderRadius: 10,
    border: '1.5px solid rgba(99,130,255,0.2)',
    background: '#111D35',
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    color: '#E8EDF8',
    outline: 'none',
  }

  return (
    <>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(7, 11, 20, 0.85)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
      }}>
        {/* Modal */}
        <div style={{
          background: '#0D1525',
          border: '1px solid rgba(99,130,255,0.15)',
          borderRadius: 24,
          padding: '36px 32px',
          maxWidth: 440,
          width: '100%',
          boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👋</div>
            <h2 style={{
              fontFamily: "'Satoshi', sans-serif",
              fontWeight: 800, fontSize: 22,
              color: '#E8EDF8', marginBottom: 8,
            }}>
              Completa il tuo profilo
            </h2>
            <p style={{ color: '#6B7A99', fontSize: 14, lineHeight: 1.6 }}>
              Ci aiuta a personalizzare meglio la tua esperienza. Ci vuole un minuto.
            </p>
          </div>

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>

            {/* Country */}
            <div>
              <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 6 }}>
                Country
              </label>
              <select
                value={form.country}
                onChange={e => setForm({ ...form, country: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="">Select your country…</option>
                {COUNTRIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Birth date + Sex */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 6 }}>
                  Date of birth
                </label>
                <input
                  type="date"
                  value={form.birth_date}
                  onChange={e => setForm({ ...form, birth_date: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontFamily: "'Inter', sans-serif", fontWeight: 600, fontSize: 13, color: '#8B92A5', marginBottom: 6 }}>
                  Sex
                </label>
                <select
                  value={form.sex}
                  onChange={e => setForm({ ...form, sex: e.target.value })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="">Select…</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #7C5CFC, #6385FF)',
                border: 'none', borderRadius: 12,
                padding: '14px',
                color: '#fff',
                fontFamily: "'Satoshi', sans-serif",
                fontWeight: 700, fontSize: 15,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving…' : 'Save and continue'}
            </button>
            <button
              onClick={handleSkip}
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                color: '#6B7A99',
                fontFamily: "'Inter', sans-serif",
                fontSize: 13,
                cursor: 'pointer',
                padding: '8px',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </>
  )
}