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
  const [slug, setSlug] = useState('')

  const [form, setForm] = useState({
    name: '', tagline: '', bio: '', avatar_url: '',
    years_experience: '', instagram_url: '', tiktok_url: '',
    youtube_url: '', linkedin_url: '', website_url: '', category: '',
  })
  const [credentials, setCredentials] = useState<string[]>([''])

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      const { data } = await supabase.from('experts').select('*').eq('id', user.id).single()
      if (data) {
        setForm({
          name: data.name || '', tagline: data.tagline || '', bio: data.bio || '',
          avatar_url: data.avatar_url || '', years_experience: data.years_experience?.toString() || '',
          instagram_url: data.instagram_url || '', tiktok_url: data.tiktok_url || '',
          youtube_url: data.youtube_url || '', linkedin_url: data.linkedin_url || '',
          website_url: data.website_url || '', category: data.category || '',
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
    setUploading(true); setError('')
    const ext = file.name.split('.').pop()
    const path = `${userId}/avatar.${ext}`
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadError) { setError('Upload failed. Try again.'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    const urlWithCache = `${publicUrl}?t=${Date.now()}`
    await supabase.from('experts').update({ avatar_url: urlWithCache }).eq('id', userId)
    setForm(f => ({ ...f, avatar_url: urlWithCache }))
    setUploading(false)
  }

  const handleSave = async () => {
    setSaving(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const cleanCredentials = credentials.filter(c => c.trim() !== '')
    const { error: err } = await supabase.from('experts').update({
      name: form.name, tagline: form.tagline, bio: form.bio, avatar_url: form.avatar_url,
      years_experience: form.years_experience ? parseInt(form.years_experience) : null,
      instagram_url: form.instagram_url, tiktok_url: form.tiktok_url,
      youtube_url: form.youtube_url, linkedin_url: form.linkedin_url,
      website_url: form.website_url, credentials: cleanCredentials,
    }).eq('id', user.id)
    if (err) { setError('Error saving profile. Try again.') }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  const addCredential = () => setCredentials([...credentials, ''])
  const removeCredential = (i: number) => setCredentials(credentials.filter((_, idx) => idx !== i))
  const updateCredential = (i: number, val: string) => {
    const updated = [...credentials]; updated[i] = val; setCredentials(updated)
  }

  const categoryLabel: Record<string, string> = {
    nutrition: 'Nutrition', fitness: 'Fitness & Training',
    skincare: 'Skincare', wellness: 'Wellness', mindset: 'Mindset & Coaching',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#94A3B8', fontFamily: 'Inter, sans-serif' }}>Loading profile…</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: 'Inter, sans-serif' }}>

      {/* HEADER */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Link href="/dashboard" style={{ color: '#64748B', textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Dashboard
            </Link>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: 18, color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </div>

          {/* Profile preview */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: '20px 0' }}>
            <div onClick={() => fileInputRef.current?.click()} style={{
              width: 72, height: 72, borderRadius: '50%',
              background: form.avatar_url ? 'transparent' : 'linear-gradient(135deg, #7C5CFC, #6385FF)',
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
              <p style={{ fontSize: 13, color: '#7C5CFC', margin: '4px 0 0', fontWeight: 500 }}>
                {categoryLabel[form.category] || form.category || 'Expert'} · @{slug}
              </p>
              <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0' }}>
                {uploading ? 'Uploading…' : 'Click on the photo to change it'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 24px 80px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Card title="Identity">
          <Field label="Display name">
            <Input value={form.name} onChange={v => setForm({ ...form, name: v })} placeholder="e.g. Marco Rossi" />
          </Field>
          <Field label="Tagline" hint="One sentence that captures what you do">
            <Input value={form.tagline} onChange={v => setForm({ ...form, tagline: v })} placeholder="e.g. I help busy professionals transform their body in 12 weeks" />
          </Field>
        </Card>

        <Card title="About you">
          <Field label="Bio" hint="Tell clients who you are and what makes your approach unique">
            <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
              placeholder="Describe your background, philosophy, and the transformation you help clients achieve…"
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #E8EDF8', background: '#F5F7FA',
                fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#0F172A',
                resize: 'vertical', outline: 'none', lineHeight: 1.6, transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
              onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
            />
          </Field>
          <Field label="Years of experience">
            <Input value={form.years_experience} onChange={v => setForm({ ...form, years_experience: v })} placeholder="e.g. 8" type="number" />
          </Field>
        </Card>

        <Card title="Credentials & certifications">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {credentials.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Input value={c} onChange={v => updateCredential(i, v)} placeholder="e.g. NSCA-CPT, Registered Dietitian, 200h Yoga…" />
                {credentials.length > 1 && (
                  <button onClick={() => removeCredential(i)} style={{
                    width: 32, height: 32, borderRadius: 8, border: '1px solid #E8EDF8',
                    background: '#FFFFFF', cursor: 'pointer', color: '#94A3B8', fontSize: 16, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                )}
              </div>
            ))}
            <button onClick={addCredential} style={{
              alignSelf: 'flex-start', padding: '8px 16px', borderRadius: 8,
              border: '1px dashed #C4B5FD', background: 'transparent',
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7C5CFC',
              cursor: 'pointer', fontWeight: 500,
            }}>
              + Add credential
            </button>
          </div>
        </Card>

        <Card title="Links">
          {[
            { label: 'Instagram', key: 'instagram_url', placeholder: 'https://instagram.com/yourhandle' },
            { label: 'TikTok', key: 'tiktok_url', placeholder: 'https://tiktok.com/@yourhandle' },
            { label: 'YouTube', key: 'youtube_url', placeholder: 'https://youtube.com/@yourchannel' },
            { label: 'LinkedIn', key: 'linkedin_url', placeholder: 'https://linkedin.com/in/yourname' },
            { label: 'Website', key: 'website_url', placeholder: 'https://yoursite.com' },
          ].map(({ label, key, placeholder }) => (
            <Field key={key} label={label}>
              <Input value={(form as any)[key]} onChange={v => setForm({ ...form, [key]: v })} placeholder={placeholder} />
            </Field>
          ))}
        </Card>

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
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span style={{ fontSize: 14, color: '#059669', fontWeight: 500 }}>✓ Profile saved</span>}
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #E8EDF8', padding: '24px', textAlign: 'center', background: '#FFFFFF' }}>
        <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Malyte © {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '24px', border: '1px solid #E8EDF8' }}>
      <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, fontSize: 16, color: '#0F172A', margin: '0 0 20px' }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontWeight: 600, fontSize: 13, color: '#334155', marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 6 }}>— {hint}</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{
        width: '100%', boxSizing: 'border-box', padding: '11px 14px', borderRadius: 10,
        border: '1px solid #E8EDF8', background: '#F5F7FA',
        fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#0F172A',
        outline: 'none', transition: 'border-color 0.2s',
      }}
      onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
      onBlur={e => (e.target.style.borderColor = '#E8EDF8')}
    />
  )
}