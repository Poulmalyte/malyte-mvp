'use client'

import { useState, useRef, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const MAX_SHORT = 200
const MAX_LONG = 3000

export default function ProfileSection() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const [expertId, setExpertId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [shortBio, setShortBio] = useState('')
  const [longBio, setLongBio] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setExpertId(user.id)
      const { data } = await supabase
        .from('experts')
        .select('avatar_url, short_bio, long_bio')
        .eq('id', user.id)
        .single()
      if (data) {
        setAvatarUrl(data.avatar_url || '')
        setPreviewUrl(data.avatar_url || '')
        setShortBio(data.short_bio || '')
        setLongBio(data.long_bio || '')
      }
    }
    load()
  }, [])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !expertId) return
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)
    setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${expertId}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      setAvatarUrl(publicUrl)
    } catch (err: any) {
      setError('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    if (!expertId) return
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const { error: updateError } = await supabase
        .from('experts')
        .update({
          avatar_url: avatarUrl || null,
          short_bio: shortBio.slice(0, MAX_SHORT) || null,
          long_bio: longBio.slice(0, MAX_LONG) || null,
        })
        .eq('id', expertId)
      if (updateError) throw updateError
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: any) {
      setError('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 580, fontFamily: "'Inter', sans-serif" }}>
      <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 700, fontSize: 22, color: '#0F172A', marginBottom: 8 }}>
        Public Profile
      </h2>
      <p style={{ color: '#64748B', fontSize: 14, marginBottom: 36 }}>
        This is what clients see when they visit your profile page.
      </p>

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32 }}>
        <div
          onClick={() => fileRef.current?.click()}
          style={{
            width: 88, height: 88, borderRadius: '50%', flexShrink: 0,
            cursor: 'pointer', overflow: 'hidden',
            border: '2px solid #E2E8F0',
            background: previewUrl ? 'transparent' : 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {previewUrl
            ? <img src={previewUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 28, color: '#fff' }}>?</span>
          }
        </div>
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            style={{
              backgroundColor: '#EDE9FE', color: '#7C5CFC',
              border: '1px solid #C4B5FD', borderRadius: 10,
              padding: '9px 18px', fontSize: 14, fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontFamily: "'Inter', sans-serif", display: 'block', marginBottom: 6,
            }}
          >
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
          <p style={{ color: '#94A3B8', fontSize: 12 }}>JPG, PNG · max 2MB</p>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarChange} style={{ display: 'none' }} />
      </div>

      {/* Short Bio */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Tagline</label>
          <span style={{ fontSize: 12, color: shortBio.length >= MAX_SHORT ? '#EF4444' : '#94A3B8' }}>
            {shortBio.length}/{MAX_SHORT}
          </span>
        </div>
        <input
          type="text"
          value={shortBio}
          onChange={e => setShortBio(e.target.value.slice(0, MAX_SHORT))}
          placeholder="e.g. Nutrition coach specializing in fat loss"
          style={{
            width: '100%', backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0', borderRadius: 12,
            padding: '12px 16px', fontSize: 15, color: '#0F172A',
            outline: 'none', fontFamily: "'Inter', sans-serif",
          }}
        />
        <p style={{ color: '#94A3B8', fontSize: 12, marginTop: 6 }}>
          Shown as a badge on your profile. Max {MAX_SHORT} characters.
        </p>
      </div>

      {/* Long Bio */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <label style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>About you</label>
          <span style={{ fontSize: 12, color: longBio.length >= MAX_LONG * 0.9 ? '#EF4444' : '#94A3B8' }}>
            {longBio.length}/{MAX_LONG}
          </span>
        </div>
        <textarea
          value={longBio}
          onChange={e => setLongBio(e.target.value.slice(0, MAX_LONG))}
          placeholder="Introduce yourself — your background, your approach, why clients choose you…"
          rows={10}
          style={{
            width: '100%', backgroundColor: '#F8FAFC',
            border: '1px solid #E2E8F0', borderRadius: 12,
            padding: '14px 16px', fontSize: 15, color: '#0F172A',
            outline: 'none', fontFamily: "'Inter', sans-serif",
            lineHeight: 1.7, resize: 'vertical',
          }}
        />
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          borderRadius: 10, padding: '12px 16px', color: '#DC2626', fontSize: 14, marginBottom: 20,
        }}>
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving || uploading}
        style={{
          backgroundColor: saved ? '#F0FDF4' : '#7C5CFC',
          color: saved ? '#16A34A' : '#fff',
          border: saved ? '1px solid #BBF7D0' : 'none',
          borderRadius: 12, padding: '13px 28px', fontSize: 15, fontWeight: 600,
          cursor: saving || uploading ? 'not-allowed' : 'pointer',
          fontFamily: "'Inter', sans-serif", transition: 'all 0.2s',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save profile'}
      </button>
    </div>
  )
}