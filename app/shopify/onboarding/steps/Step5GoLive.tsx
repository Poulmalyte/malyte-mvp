'use client'

import { useState } from 'react'

interface Props {
  merchant: any
  merchantProfile: any
  catalogItemsCount: number
  onComplete: () => void
}

export default function Step5GoLive({ merchant, merchantProfile, catalogItemsCount, onComplete }: Props) {
  const [copied, setCopied] = useState(false)

  const questionnaireUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/start/${merchant?.slug || merchant?.id}`
    : ''

  function copyLink() {
    navigator.clipboard.writeText(questionnaireUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const checklist = [
    { label: 'Brand identity configured', done: true },
    { label: `${catalogItemsCount} products tagged`, done: catalogItemsCount > 0 },
    { label: 'Customer intake ready', done: !!(merchantProfile?.customer_questions?.length > 0) },
    { label: 'Plan preview approved', done: true },
  ]

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', fontFamily: "'Satoshi', sans-serif" }}>
        You're live!
      </h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px', lineHeight: 1.6 }}>
        Malyte is ready to generate personalised plans for your customers.
      </p>

      {/* Checklist */}
      <div style={{ background: '#F0FDF4', borderRadius: 16, border: '1px solid #6EE7B7', padding: '20px', marginBottom: 24, textAlign: 'left' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {checklist.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: item.done ? '#7C5CFC' : '#E8EDF8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: item.done ? '#0F172A' : '#94A3B8' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI aspettati */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        <div style={{ background: '#EDE9FE', borderRadius: 12, padding: '16px' }}>
          <p style={{ fontSize: 10, color: '#64748B', margin: '0 0 4px', fontWeight: 600 }}>Plan generation time</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#7C5CFC', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{'< 2 min'}</p>
        </div>
        <div style={{ background: '#D1FDF3', borderRadius: 12, padding: '16px' }}>
          <p style={{ fontSize: 10, color: '#64748B', margin: '0 0 4px', fontWeight: 600 }}>Products in catalog</p>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#059669', margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{catalogItemsCount}</p>
        </div>
      </div>

      {/* Share link */}
      <div style={{ marginBottom: 24, textAlign: 'left' }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748B', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>SHARE WITH YOUR FIRST CUSTOMER</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', fontSize: 12, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {questionnaireUrl || 'Loading link…'}
          </div>
          <button onClick={copyLink}
            style={{ padding: '12px 16px', borderRadius: 10, fontWeight: 700, fontSize: 12, background: copied ? '#059669' : '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s' }}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </div>
      </div>

      <button onClick={onComplete}
        style={{ width: '100%', padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 15, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>
        Go to dashboard →
      </button>
    </div>
  )
}