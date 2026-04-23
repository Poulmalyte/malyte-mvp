'use client'

import { useState } from 'react'

export default function ShareButton({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const url = `${window.location.origin}/expert/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        color: copied ? '#4DFFD2' : '#8B92A5',
        fontWeight: 500,
        fontSize: 13,
        padding: '10px 18px',
        borderRadius: 100,
        border: `1px solid ${copied ? 'rgba(77,255,210,0.3)' : 'rgba(255,255,255,0.1)'}`,
        background: copied ? 'rgba(77,255,210,0.08)' : 'none',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {copied ? '✓ Copied!' : '🔗 Share Profile'}
    </button>
  )
}