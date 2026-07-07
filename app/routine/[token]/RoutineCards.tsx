'use client'

import { useState } from 'react'

type RoutineItem = {
  product_id?: string
  product_title: string
  step_number: number
  instructions: string
  why?: string
  price?: number | null
  product_url?: string | null
  image_url?: string | null
}

export default function RoutineCards({ morningRoutine, eveningRoutine }: { morningRoutine: RoutineItem[], eveningRoutine: RoutineItem[] }) {
  const [open, setOpen] = useState<'morning' | 'evening' | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {morningRoutine.length > 0 && (
        <Card
          label="Morning"
          icon="☀️"
          accent="#F59E0B"
          items={morningRoutine}
          isOpen={open === 'morning'}
          onToggle={() => setOpen(open === 'morning' ? null : 'morning')}
        />
      )}
      {eveningRoutine.length > 0 && (
        <Card
          label="Evening"
          icon="🌙"
          accent="#6385FF"
          items={eveningRoutine}
          isOpen={open === 'evening'}
          onToggle={() => setOpen(open === 'evening' ? null : 'evening')}
        />
      )}
    </div>
  )
}

function Card({ label, icon, accent, items, isOpen, onToggle }: {
  label: string, icon: string, accent: string, items: RoutineItem[], isOpen: boolean, onToggle: () => void
}) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #F0F0F0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '18px 20px', background: 'transparent', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#1C1C1E', fontFamily: "'Satoshi', sans-serif" }}>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#8E8E93' }}>{items.length} step{items.length !== 1 ? 's' : ''}</span>
          <span style={{
            fontSize: 12, color: '#8E8E93', display: 'inline-block',
            transition: 'transform 250ms ease', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
          }}>▾</span>
        </div>
      </button>

      <div style={{
        maxHeight: isOpen ? 3000 : 0,
        opacity: isOpen ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 300ms ease, opacity 250ms ease',
      }}>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, padding: 12, background: '#FAFAF9', borderRadius: 12 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 10, flexShrink: 0, overflow: 'hidden',
                background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {item.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.image_url} alt={item.product_title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontSize: 18, color: '#C7C7CC' }}>{icon}</span>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: accent, background: accent + '1A', padding: '2px 8px', borderRadius: 100 }}>
                    Step {item.step_number}
                  </span>
                  {item.product_url && (
                    <a href={item.product_url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '2px 8px', borderRadius: 100 }}>
                      View →
                    </a>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px' }}>{item.product_title}</p>
                <p style={{ fontSize: 12, color: '#3C3C43', margin: '0 0 4px', lineHeight: 1.5 }}>{item.instructions}</p>
                {item.why && <p style={{ fontSize: 11, color: '#8E8E93', margin: 0, fontStyle: 'italic' }}>Why: {item.why}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
