'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

interface Props {
  email: string
  isGoogleUser: boolean
}

export default function AccountSettings({ email, isGoogleUser }: Props) {
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [emailMsg, setEmailMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [passMsg, setPassMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [emailLoading, setEmailLoading] = useState(false)
  const [passLoading, setPassLoading] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleEmailChange = async () => {
    if (!newEmail) return
    setEmailLoading(true)
    setEmailMsg(null)
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setEmailLoading(false)
    if (error) setEmailMsg({ type: 'err', text: error.message })
    else setEmailMsg({ type: 'ok', text: 'Confirmation email sent. Check your inbox.' })
    setNewEmail('')
  }

  const handlePasswordChange = async () => {
    if (!newPassword) return
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'err', text: 'Passwords do not match.' })
      return
    }
    if (newPassword.length < 8) {
      setPassMsg({ type: 'err', text: 'Password must be at least 8 characters.' })
      return
    }
    setPassLoading(true)
    setPassMsg(null)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPassLoading(false)
    if (error) setPassMsg({ type: 'err', text: error.message })
    else setPassMsg({ type: 'ok', text: 'Password updated successfully.' })
    setNewPassword('')
    setConfirmPassword('')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: '1px solid #E8EDF8', background: '#F5F7FA',
    fontSize: 13, color: '#0F172A', outline: 'none',
    fontFamily: "'Inter', sans-serif", boxSizing: 'border-box',
  }

  const btnStyle: React.CSSProperties = {
    background: '#7C5CFC', color: '#fff', fontWeight: 700,
    fontSize: 13, padding: '10px 20px', borderRadius: 100,
    border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
    fontFamily: "'Inter', sans-serif",
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ marginBottom: 12 }}>

      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px', marginBottom: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          Account
        </p>
        <div style={{ marginBottom: 6 }}>
          <label style={labelStyle}>Current email</label>
          <div style={{ ...inputStyle, color: '#94A3B8', background: '#F8FAFC' }}>{email}</div>
        </div>
        <div style={{ marginBottom: 12, marginTop: 14 }}>
          <label style={labelStyle}>New email</label>
          <input
            type="email"
            value={newEmail}
            onChange={e => setNewEmail(e.target.value)}
            placeholder="Enter new email"
            style={inputStyle}
          />
        </div>
        {emailMsg && (
          <p style={{ fontSize: 12, color: emailMsg.type === 'ok' ? '#059669' : '#EF4444', marginBottom: 10 }}>
            {emailMsg.text}
          </p>
        )}
        <button onClick={handleEmailChange} disabled={emailLoading || !newEmail} style={{ ...btnStyle, opacity: emailLoading || !newEmail ? 0.5 : 1 }}>
          {emailLoading ? 'Saving…' : 'Update email'}
        </button>
      </div>

      <div style={{ background: '#FFFFFF', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px' }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
          Password
        </p>
        {isGoogleUser ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
            <span style={{ fontSize: 16 }}>🔒</span>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>
              Your account is connected via Google. Password management is handled by Google.
            </p>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Min. 8 characters"
                style={inputStyle}
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                style={inputStyle}
              />
            </div>
            {passMsg && (
              <p style={{ fontSize: 12, color: passMsg.type === 'ok' ? '#059669' : '#EF4444', marginBottom: 10 }}>
                {passMsg.text}
              </p>
            )}
            <button onClick={handlePasswordChange} disabled={passLoading || !newPassword} style={{ ...btnStyle, opacity: passLoading || !newPassword ? 0.5 : 1 }}>
              {passLoading ? 'Saving…' : 'Update password'}
            </button>
          </>
        )}
      </div>

    </div>
  )
}