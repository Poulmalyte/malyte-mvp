'use client'

import { useState } from 'react'

export default function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ url }) } catch {}
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: copied ? 'rgba(77,255,210,0.12)' : 'rgba(124,92,252,0.12)',
        color: copied ? '#4DFFD2' : '#A78BFA',
        border: `1px solid ${copied ? 'rgba(77,255,210,0.3)' : 'rgba(124,92,252,0.3)'}`,
        borderRadius: '100px',
        padding: '8px 16px',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
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
          Share profile
        </>
      )}
    </button>
  )
}