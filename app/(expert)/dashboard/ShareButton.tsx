'use client'

import { useState } from 'react'

export default function ShareButton({ url, label = 'Share profile' }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setShowLink(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setShowLink(true)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          backgroundColor: copied ? 'rgba(77,255,210,0.12)' : 'rgba(124,92,252,0.12)',
          color: copied ? '#4DFFD2' : '#A78BFA',
          border: `1px solid ${copied ? 'rgba(77,255,210,0.3)' : 'rgba(124,92,252,0.3)'}`,
          borderRadius: '100px', padding: '8px 16px', fontSize: '13px',
          fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          fontFamily: "'DM Sans', sans-serif",
        }}>
        {copied ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Copied!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            {label}
          </>
        )}
      </button>
      {showLink && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F8FAFC', border: '1px solid #E8EDF8', borderRadius: 8, padding: '6px 10px', maxWidth: 280 }}>
          <input
            readOnly
            value={url}
            onFocus={e => e.target.select()}
            style={{ border: 'none', background: 'transparent', fontSize: 11, color: '#64748B', outline: 'none', flex: 1, minWidth: 0, fontFamily: 'monospace' }}
          />
          <button onClick={() => setShowLink(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
        </div>
      )}
    </div>
  )
}