'use client'

import { useState, useEffect } from 'react'

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E8EDF8', padding: '24px', marginBottom: 16,
}

type OrderValueRule = { type: 'order_value'; op: 'gt' | 'lt'; value: number }
type ItemCountRule = { type: 'item_count'; op: 'gte' | 'lte'; value: number }
type Rule = OrderValueRule | ItemCountRule

type Props = {
  shop?: string | null
  currency?: string | null
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '\u20AC', USD: '$', GBP: '\u00A3', CHF: 'CHF', SEK: 'kr', DKK: 'kr',
}

export default function RoutineAudienceFilters({ shop, currency }: Props) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const [allCustomers, setAllCustomers] = useState(true)

  const [valueOn, setValueOn] = useState(false)
  const [valueOp, setValueOp] = useState<'gt' | 'lt'>('gt')
  const [valueAmount, setValueAmount] = useState('50')

  const [countOn, setCountOn] = useState(false)
  const [countOp, setCountOp] = useState<'gte' | 'lte'>('gte')
  const [countAmount, setCountAmount] = useState('2')

  const [storeCurrency, setStoreCurrency] = useState(currency || 'EUR')
  const symbol = CURRENCY_SYMBOLS[storeCurrency] || storeCurrency

  useEffect(() => {
    if (!shop) { setLoading(false); return }
    let cancelled = false

    async function load() {
      try {
        const res = await fetch('/api/shopify/routine-filters?shop=' + encodeURIComponent(shop!))
        if (!res.ok) throw new Error('load failed')
        const data = await res.json()
        if (cancelled) return

        if (data.currency) setStoreCurrency(data.currency)
        const f = data.filters || {}
        setAllCustomers(f.all_customers !== false)

        const rules: Rule[] = Array.isArray(f.rules) ? f.rules : []
        const ov = rules.find(r => r.type === 'order_value') as OrderValueRule | undefined
        if (ov) { setValueOn(true); setValueOp(ov.op); setValueAmount(String(ov.value)) }
        const ic = rules.find(r => r.type === 'item_count') as ItemCountRule | undefined
        if (ic) { setCountOn(true); setCountOp(ic.op); setCountAmount(String(ic.value)) }
      } catch {
        if (!cancelled) setMsg({ type: 'error', text: 'Could not load your settings.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [shop])

  function buildRules(): Rule[] {
    const rules: Rule[] = []
    if (valueOn) {
      const n = parseFloat(valueAmount)
      if (Number.isFinite(n) && n >= 0) rules.push({ type: 'order_value', op: valueOp, value: n })
    }
    if (countOn) {
      const n = parseInt(countAmount, 10)
      if (Number.isFinite(n) && n >= 0) rules.push({ type: 'item_count', op: countOp, value: n })
    }
    return rules
  }

  function summary(): string {
    if (allCustomers) return 'Sending to every customer who completes a purchase.'
    const rules = buildRules()
    if (rules.length === 0) return 'No conditions set \u2014 sending to all customers.'

    const parts: string[] = []
    for (const r of rules) {
      if (r.type === 'order_value') {
        parts.push('spent ' + (r.op === 'gt' ? 'over ' : 'less than ') + symbol + r.value)
      } else {
        parts.push('bought ' + (r.op === 'gte' ? 'at least ' : 'at most ') + r.value + ' item' + (r.value === 1 ? '' : 's'))
      }
    }
    return 'Sending to customers who ' + parts.join(' and ') + '.'
  }

  async function save() {
    if (!shop) return
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch('/api/shopify/routine-filters', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shop,
          all_customers: allCustomers,
          rules: allCustomers ? [] : buildRules(),
        }),
      })
      if (!res.ok) throw new Error('save failed')
      setMsg({ type: 'success', text: 'Saved.' })
      setTimeout(() => setMsg(null), 3000)
    } catch {
      setMsg({ type: 'error', text: 'Could not save. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  const disabled = allCustomers
  const rowStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
    background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8',
    opacity: disabled ? 0.4 : 1,
    pointerEvents: disabled ? 'none' : 'auto',
    flexWrap: 'wrap',
  }
  const selectStyle: React.CSSProperties = {
    padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EDF8',
    fontSize: 13, color: '#0F172A', background: '#FFFFFF',
    outline: 'none', fontFamily: 'inherit', cursor: 'pointer',
  }
  const numberStyle: React.CSSProperties = {
    width: 80, padding: '8px 12px', borderRadius: 8, border: '1px solid #E8EDF8',
    fontSize: 13, color: '#0F172A', background: '#FFFFFF',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 13, fontWeight: 600, color: '#0F172A', minWidth: 92,
  }

  if (loading) {
    return (
      <div style={card}>
        <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>Loading audience settings\u2026</p>
      </div>
    )
  }

  return (
    <div style={card}>
      <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: '0 0 4px' }}>
        Who should receive this routine?
      </p>
      <p style={{ fontSize: 12, color: '#64748B', margin: '0 0 18px', lineHeight: 1.6 }}>
        By default every customer who completes a purchase receives the routine.
        Add conditions to narrow it down.
      </p>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        background: allCustomers ? '#F5F3FF' : '#F8FAFC', borderRadius: 12,
        border: '1px solid ' + (allCustomers ? '#DDD6FE' : '#E8EDF8'), marginBottom: 14,
      }}>
        <button
          type="button"
          role="switch"
          aria-checked={allCustomers}
          onClick={() => setAllCustomers(v => !v)}
          style={{
            width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer',
            background: allCustomers ? '#7C5CFC' : '#CBD5E1', position: 'relative',
            flexShrink: 0, padding: 0, transition: 'background 0.15s',
          }}
        >
          <span style={{
            position: 'absolute', top: 3, left: allCustomers ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: '#fff',
            transition: 'left 0.15s',
          }} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0 }}>All customers</p>
          <p style={{ fontSize: 11, color: '#64748B', margin: '2px 0 0' }}>
            Everyone who completes a purchase. Turn off to add conditions.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <div style={rowStyle}>
          <input
            type="checkbox"
            checked={valueOn}
            onChange={e => setValueOn(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#7C5CFC', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={labelStyle}>Order value</span>
          <select value={valueOp} onChange={e => setValueOp(e.target.value as 'gt' | 'lt')} style={selectStyle}>
            <option value="gt">is over</option>
            <option value="lt">is under</option>
          </select>
          <input
            type="number"
            min={0}
            step="0.01"
            value={valueAmount}
            onChange={e => setValueAmount(e.target.value)}
            style={numberStyle}
          />
          <span style={{ fontSize: 13, color: '#64748B' }}>{symbol}</span>
        </div>

        <div style={rowStyle}>
          <input
            type="checkbox"
            checked={countOn}
            onChange={e => setCountOn(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: '#7C5CFC', cursor: 'pointer', flexShrink: 0 }}
          />
          <span style={labelStyle}>Items bought</span>
          <select value={countOp} onChange={e => setCountOp(e.target.value as 'gte' | 'lte')} style={selectStyle}>
            <option value="gte">at least</option>
            <option value="lte">at most</option>
          </select>
          <input
            type="number"
            min={0}
            step="1"
            value={countAmount}
            onChange={e => setCountAmount(e.target.value)}
            style={numberStyle}
          />
          <span style={{ fontSize: 13, color: '#64748B' }}>items</span>
        </div>
      </div>

      <div style={{
        background: '#F8FAFC', borderRadius: 10, padding: '12px 14px',
        border: '1px solid #E8EDF8', marginBottom: 16,
        fontSize: 12, color: '#64748B', lineHeight: 1.6,
      }}>
        <strong style={{ color: '#7C5CFC' }}>Result:</strong> {summary()}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={save}
          disabled={saving || !shop}
          style={{
            padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13,
            background: saving ? '#C4B5FD' : '#7C5CFC', color: '#fff', border: 'none',
            cursor: saving || !shop ? 'default' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {saving ? 'Saving\u2026' : 'Save'}
        </button>
        {msg && (
          <span style={{
            fontSize: 12, fontWeight: 600,
            color: msg.type === 'success' ? '#059669' : '#DC2626',
          }}>
            {msg.text}
          </span>
        )}
      </div>
    </div>
  )
}
