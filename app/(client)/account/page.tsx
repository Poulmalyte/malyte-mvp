'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '11px 14px', borderRadius: 10,
  border: '1px solid #E8EDF8', background: '#F5F7FA',
  fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#0F172A',
  outline: 'none', transition: 'border-color 0.2s',
}

export default function ClientProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')

  const [form, setForm] = useState({
    name: '', avatar_url: '', birth_date: '', sex: '', country: '',
  })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id); setEmail(user.email || '')
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setForm({ name: data.name || '', avatar_url: data.avatar_url || '', birth_date: data.birth_date || '', sex: data.sex || '', country: data.country || '' })
      } else {
        await supabase.from('profiles').insert({ id: user.id })
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setUploading(true); setError('')
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setError('Upload failed. Try again.'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithCache = `${publicUrl}?t=${Date.now()}`
    await supabase.from('profiles').update({ avatar_url: urlWithCache }).eq('id', userId)
    setForm(f => ({ ...f, avatar_url: urlWithCache }))
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    const { error: err } = await supabase.from('profiles').update({
      name: form.name, birth_date: form.birth_date || null,
      sex: form.sex || null, country: form.country || null,
    }).eq('id', userId)
    if (err) { setError('Error saving. Try again.') }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: 'Inter, sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 560, margin: '0 auto', padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <Link href="/my-plans" style={{ color: '#64748B', textDecoration: 'none', fontSize: 13 }}>
              ← My Plans
            </Link>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, paddingBottom: 20 }}>
            <div onClick={() => fileInputRef.current?.click()} style={{
              width: 72, height: 72, borderRadius: '50%',
              background: form.avatar_url ? 'transparent' : 'linear-gradient(135deg, #6385FF, #4DFFD2)',
              border: '2px solid #E8EDF8', overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}>
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}>
                  {form.name ? form.name[0].toUpperCase() : '?'}
                </span>
              )}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: uploading ? 1 : 0, transition: 'opacity 0.2s', borderRadius: '50%',
              }}>
                <span style={{ color: '#fff', fontSize: 18 }}>{uploading ? '⏳' : '📷'}</span>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
            <div>
              <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 20, color: '#0F172A', margin: 0 }}>
                {form.name || 'Your Name'}
              </h1>
              <p style={{ fontSize: 13, color: '#94A3B8', margin: '4px 0 0' }}>{email}</p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                {uploading ? 'Uploading…' : 'Click on the photo to change it'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '28px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', border: '1px solid #E8EDF8' }}>
          <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', margin: '0 0 20px' }}>
            Your info
          </h2>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Display name</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Marco Rossi" style={inputStyle}
              onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
              onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Email</label>
            <input type="text" value={email} disabled style={{ ...inputStyle, background: '#F1F5F9', color: '#94A3B8' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Date of birth</label>
              <input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Sex</label>
              <select value={form.sex} onChange={e => setForm({ ...form, sex: e.target.value })}
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
                onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
              >
                <option value="">Select…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>Country</label>
            <select value={form.country} onChange={e => setForm({ ...form, country: e.target.value })}
              style={{ ...inputStyle, cursor: 'pointer' }}
              onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
              onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
            >
              <option value="">Select country…</option>
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleSave} disabled={saving} style={{
            padding: '14px 32px', borderRadius: 12, border: 'none',
            background: saving ? '#C4B5FD' : '#7C5CFC',
            color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700,
            fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
          }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          {saved && <span style={{ fontSize: 14, color: '#059669', fontWeight: 500 }}>✓ Saved</span>}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '24px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Malyte © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}