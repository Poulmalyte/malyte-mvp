'use client'

import { useState } from 'react'

const COLORS = ['#7C5CFC', '#4DFFD2', '#F59E0B', '#6385FF', '#EF4444', '#A78BFA']

type MonthData = { label: string; value: number }
type ProductData = { name: string; data: MonthData[] }

interface RevenueChartProps {
  monthlyData: MonthData[]
  productData: ProductData[]
}

export default function RevenueChart({ monthlyData, productData }: RevenueChartProps) {
  const [view, setView] = useState<'total' | 'products'>('total')

  const allSeries = view === 'total'
    ? [{ name: 'Total Revenue', data: monthlyData, color: '#7C5CFC' }]
    : productData.map((p, i) => ({ name: p.name, data: p.data, color: COLORS[i % COLORS.length] }))

  const allValues = allSeries.flatMap(s => s.data.map(d => d.value))
  const maxVal = Math.max(...allValues, 1)
  const labels = monthlyData.map(m => m.label)

  const W = 600
  const H = 180
  const PAD = { top: 16, right: 16, bottom: 28, left: 48 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  function xPos(i: number) {
    return PAD.left + (i / (labels.length - 1)) * chartW
  }
  function yPos(val: number) {
    return PAD.top + chartH - (val / maxVal) * chartH
  }
  function pathFor(data: MonthData[]) {
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yPos(d.value)}`).join(' ')
  }
  function areaFor(data: MonthData[], color: string) {
    const line = pathFor(data)
    const close = ` L${xPos(data.length - 1)},${PAD.top + chartH} L${xPos(0)},${PAD.top + chartH} Z`
    return line + close
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(f * maxVal))

  return (
    <div>
      {/* Toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>
          Revenue last 6 months
        </p>
        <div style={{ display: 'flex', background: '#F1F5F9', borderRadius: 100, padding: 3, gap: 2 }}>
          {(['total', 'products'] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: '5px 14px', borderRadius: 100, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
              background: view === v ? '#FFFFFF' : 'transparent',
              color: view === v ? '#7C5CFC' : '#94A3B8',
              boxShadow: view === v ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}>
              {v === 'total' ? 'Total' : 'By product'}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      {view === 'products' && productData.length > 0 && (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {productData.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* SVG Chart */}
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 280, height: 'auto' }}>
          <defs>
            {allSeries.map((s, i) => (
              <linearGradient key={i} id={`grad${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.15" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0" />
              </linearGradient>
            ))}
          </defs>

          {/* Y grid lines */}
          {yTicks.map((tick, i) => (
            <g key={i}>
              <line
                x1={PAD.left} y1={yPos(tick)}
                x2={PAD.left + chartW} y2={yPos(tick)}
                stroke="#E8EDF8" strokeWidth={1}
              />
              <text x={PAD.left - 6} y={yPos(tick) + 4} textAnchor="end" fontSize={9} fill="#94A3B8">
                €{tick >= 1000 ? `${(tick / 1000).toFixed(1)}k` : tick}
              </text>
            </g>
          ))}

          {/* X labels */}
          {labels.map((label, i) => (
            <text key={i} x={xPos(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94A3B8">
              {label}
            </text>
          ))}

          {/* Area + Line per series */}
          {allSeries.map((s, si) => (
            <g key={si}>
              <path d={areaFor(s.data, s.color)} fill={`url(#grad${si})`} />
              <path d={pathFor(s.data)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              {/* Dots */}
              {s.data.map((d, i) => (
                <circle key={i} cx={xPos(i)} cy={yPos(d.value)} r={3} fill={s.color} stroke="#fff" strokeWidth={1.5}>
                  <title>€{d.value.toFixed(2)}</title>
                </circle>
              ))}
            </g>
          ))}
        </svg>
      </div>

      {/* Empty state */}
      {maxVal <= 1 && (
        <p style={{ color: '#94A3B8', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          No purchases yet — data will appear when your first clients arrive.
        </p>
      )}
    </div>
  )
}