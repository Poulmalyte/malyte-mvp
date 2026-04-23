'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ExpertProfilePage() {
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

  const [form, setForm] = useState({
    name: '',
    tagline: '',
    bio: '',
    avatar_url: '',
    years_experience: '',
    instagram_url: '',
    tiktok_url: '',
    youtube_url: '',
    linkedin_url: '',
    website_url: '',
    category: '',
  })
  const [credentials, setCredentials] = useState<string[]>([''])
  const [slug, setSlug] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('experts')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setForm({
          name: data.name || '',
          tagline: data.tagline || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          years_experience: data.years_experience?.toString() || '',
          instagram_url: data.instagram_url || '',
          tiktok_url: data.tiktok_url || '',
          youtube_url: data.youtube_url || '',
          linkedin_url: data.linkedin_url || '',
          website_url: data.website_url || '',
          category: data.category || '',
        })
        setCredentials(data.credentials?.length ? data.credentials : [''])
        setSlug(data.slug || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setUploading(true)
    setError('')

    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      setError('Upload failed. Try again.')
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    // Add cache-busting to force refresh
    const urlWithCache = `${publicUrl}?t=${Date.now()}`

    await supabase
      .from('experts')
      .update({ avatar_url: urlWithCache })
      .eq('id', userId)

    setForm(f => ({ ...f, avatar_url: urlWithCache }))
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const cleanCredentials = credentials.filter(c => c.trim() !== '')

    const { error: err } = await supabase
      .from('experts')
      .update({
        name: form.name,
        tagline: form.tagline,
        bio: form.bio,
        avatar_url: form.avatar_url,
        years_experience: form.years_experience ? parseInt(form.years_experience) : null,
        instagram_url: form.instagram_url,
        tiktok_url: form.tiktok_url,
        youtube_url: form.youtube_url,
        linkedin_url: form.linkedin_url,
        website_url: form.website_url,
        credentials: cleanCredentials,
      })
      .eq('id', user.id)

    if (err) {
      setError('Error saving profile. Try again.')
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
    setSaving(false)
  }

  const addCredential = () => setCredentials([...credentials, ''])
  const removeCredential = (i: number) => setCredentials(credentials.filter((_, idx) => idx !== i))
  const updateCredential = (i: number, val: string) => {
    const updated = [...credentials]
    updated[i] = val
    setCredentials(updated)
  }

  const categoryLabel: Record<string, string> = {
    nutrition: 'Nutrition',
    fitness: 'Fitness & Training',
    skincare: 'Skincare',
    wellness: 'Wellness',
    mindset: 'Mindset & Coaching',
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#14182A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#6B7A99', fontFamily: 'Inter, sans-serif' }}>Loading profile…</div>
      </div>
    )
  }

  return (
    <>
      <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,800&display=swap" rel="stylesheet" />

      {/* ── HERO ── */}
      <div style={{ background: '#14182A', borderBottom: '1px solid rgba(99,130,255,0.12)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 40px' }}>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <Link href="/dashboard" style={{ color: '#6B7A99', textDecoration: 'none', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
              ← Dashboard
            </Link>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar con click per upload */}
            <div
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: form.avatar_url ? 'transparent' : 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
                border: '2px solid rgba(99,130,255,0.25)',
                overflow: 'hidden', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
              }}
            >
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}>
                  {form.name ? form.name[0].toUpperCase() : '?'}
                </span>
              )}
              {/* Overlay */}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: uploading ? 1 : 0, transition: 'opacity 0.2s',
                borderRadius: '50%',
              }}>
                <span style={{ color: '#fff', fontSize: 18 }}>{uploading ? '⏳' : '📷'}</span>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleAvatarUpload}
            />

            <div>
              <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 22, color: '#E8EDF8', margin: 0 }}>
                {form.name || 'Your Name'}
              </h1>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#4DFFD2', margin: '4px 0 0', fontWeight: 500 }}>
                {categoryLabel[form.category] || form.category || 'Expert'} · @{slug}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#4A5568', margin: '4px 0 0' }}>
                {uploading ? 'Uploading…' : 'Click on the photo to change it'}
              </p>
            </div>
          </div>

          {form.tagline && (
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, color: '#A0AEC0', margin: '16px 0 0', fontStyle: 'italic' }}>
              "{form.tagline}"
            </p>
          )}
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{ background: '#F5F4F0', minHeight: '100vh', padding: '40px 24px 80px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* ── CARD: Identity ── */}
          <Card title="Identity">
            <Field label="Display name">
              <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Marco Rossi" />
            </Field>
            <Field label="Tagline" hint="One sentence that captures what you do">
              <Input value={form.tagline} onChange={v => setForm({ ...form, tagline: v })} placeholder="e.g. I help busy professionals transform their body in 12 weeks" />
            </Field>
          </Card>

          {/* ── CARD: About ── */}
          <Card title="About you">
            <Field label="Bio" hint="Tell clients who you are and what makes your approach unique">
              <textarea
                value={form.bio}
                onChange={e => setForm({ ...form, bio: e.target.value })}
                placeholder="Describe your background, philosophy, and the transformation you help clients achieve…"
                rows={5}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '12px 14px', borderRadius: 10,
                  border: '1.5px solid #D8D5CE', background: '#FAFAF8',
                  fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e',
                  resize: 'vertical', outline: 'none', lineHeight: 1.6,
                }}
                onFocus={e => e.target.style.borderColor = '#7C5CFC'}
                onBlur={e => e.target.style.borderColor = '#D8D5CE'}
              />
            </Field>
            <Field label="Years of experience">
              <Input value={form.years_experience} onChange={v => setForm({ ...form, years_experience: v })} placeholder="e.g. 8" type="number" />
            </Field>
          </Card>

          {/* ── CARD: Credentials ── */}
          <Card title="Credentials & certifications">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {credentials.map((c, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Input
                    value={c}
                    onChange={v => updateCredential(i, v)}
                    placeholder="e.g. NSCA-CPT, Registered Dietitian, 200h Yoga…"
                  />
                  {credentials.length > 1 && (
                    <button onClick={() => removeCredential(i)} style={{
                      width: 32, height: 32, borderRadius: 8, border: '1.5px solid #e0d9d0',
                      background: 'transparent', cursor: 'pointer', color: '#9B8F84', fontSize: 16, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>×</button>
                  )}
                </div>
              ))}
              <button onClick={addCredential} style={{
                alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8,
                border: '1.5px dashed #C4BFB8', background: 'transparent',
                fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7C5CFC',
                cursor: 'pointer', fontWeight: 500,
              }}>
                + Add credential
              </button>
            </div>
          </Card>

          {/* ── CARD: Links ── */}
          <Card title="Links">
            <Field label="Instagram">
              <Input value={form.instagram_url} onChange={v => setForm({ ...form, instagram_url: v })} placeholder="https://instagram.com/yourhandle" />
            </Field>
            <Field label="TikTok">
              <Input value={form.tiktok_url} onChange={v => setForm({ ...form, tiktok_url: v })} placeholder="https://tiktok.com/@yourhandle" />
            </Field>
            <Field label="YouTube">
              <Input value={form.youtube_url} onChange={v => setForm({ ...form, youtube_url: v })} placeholder="https://youtube.com/@yourchannel" />
            </Field>
            <Field label="LinkedIn">
              <Input value={form.linkedin_url} onChange={v => setForm({ ...form, linkedin_url: v })} placeholder="https://linkedin.com/in/yourname" />
            </Field>
            <Field label="Website">
              <Input value={form.website_url} onChange={v => setForm({ ...form, website_url: v })} placeholder="https://yoursite.com" />
            </Field>
          </Card>

          {error && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEE2E2', border: '1px solid #FECACA', color: '#991B1B', fontFamily: 'Inter, sans-serif', fontSize: 14 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '14px 32px', borderRadius: 12, border: 'none',
                background: saving ? '#9D8DF5' : '#7C5CFC',
                color: '#fff', fontFamily: 'Satoshi, sans-serif', fontWeight: 700,
                fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {saved && (
              <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#059669', fontWeight: 500 }}>
                ✓ Profile saved
              </span>
            )}
          </div>

        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#1E2337', padding: '24px', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#4A5568', margin: 0 }}>
          Malyte © {new Date().getFullYear()}
        </p>
      </div>
    </>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: '24px',
      border: '1px solid #EAE7E0',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#14182A', margin: '0 0 20px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: 13, color: '#4A4A6A', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#9B9EB5', marginLeft: 6 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '11px 14px', borderRadius: 10,
        border: '1.5px solid #D8D5CE', background: '#FAFAF8',
        fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#1a1a2e',
        outline: 'none', transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = '#7C5CFC'}
      onBlur={e => e.target.style.borderColor = '#D8D5CE'}
    />
  )
}