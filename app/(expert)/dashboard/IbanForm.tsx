'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function IbanForm({ currentIban, expertId }: { currentIban: string; expertId: string }) {
  const [iban, setIban] = useState(currentIban)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  const validateIban = (val: string) => {
    const clean = val.replace(/\s/g, '').toUpperCase()
    return clean.length >= 15 && clean.length <= 34 && /^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(clean)
  }

  const handleSave = async () => {
    const clean = iban.replace(/\s/g, '').toUpperCase()
    if (!validateIban(clean)) { setError('IBAN non valido. Controlla il formato.'); return }
    setSaving(true); setError('')
    const { error: err } = await supabase.from('experts').update({ iban: clean }).eq('id', expertId)
    if (err) { setError('Errore nel salvataggio. Riprova.') }
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 8 }}>IBAN</label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <input type="text" value={iban}
          onChange={e => { setIban(e.target.value.toUpperCase()); setError(''); setSaved(false) }}
          placeholder="IT60 X054 2811 1010 0000 0123 456"
          style={{
            flex: 1, minWidth: 260, padding: '11px 14px', borderRadius: 10,
            border: `1px solid ${error ? '#FECACA' : '#E8EDF8'}`,
            background: '#F5F7FA', color: '#0F172A',
            fontFamily: 'Inter, sans-serif', fontSize: 14,
            outline: 'none', letterSpacing: '0.05em',
          }}
          onFocus={e => (e.target.style.borderColor = '#7C5CFC')}
          onBlur={e => (e.target.style.borderColor = error ? '#FECACA' : '#E8EDF8')}
        />
        <button onClick={handleSave} disabled={saving} style={{
          padding: '11px 24px', borderRadius: 10, border: 'none',
          background: saving ? '#C4B5FD' : '#7C5CFC',
          color: '#fff', fontWeight: 600, fontSize: 14,
          cursor: saving ? 'not-allowed' : 'pointer',
          fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap',
        }}>
          {saving ? 'Saving...' : 'Save IBAN'}
        </button>
      </div>
      {error && <p style={{ fontSize: 12, color: '#EF4444', marginTop: 8 }}>{error}</p>}
      {saved && <p style={{ fontSize: 12, color: '#059669', marginTop: 8, fontWeight: 500 }}>✓ IBAN saved successfully</p>}
      <div style={{ marginTop: 16, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px' }}>
        <p style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginBottom: 4 }}>⚠ Important</p>
        <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0 }}>
          Your IBAN is used exclusively for receiving payouts from Malyte. Payments are disbursed twice a month, on the 1st and 15th of each month, for all transactions completed in the previous period.
        </p>
      </div>
    </div>
  )
}