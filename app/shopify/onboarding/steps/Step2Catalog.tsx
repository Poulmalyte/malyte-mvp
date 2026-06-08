'use client'

import { useState, useEffect } from 'react'

interface CatalogItem {
  id: string
  title: string
  ai_tagged: boolean
  catalog_item_tags: Array<{
    tag_type: string
    tag_value: string
    confidence_score: number
    source: string
  }>
}

interface Props {
  merchantId: string
  hasInstallation: boolean
  initialItems: CatalogItem[]
  onComplete: (data: any) => void
  onBack: () => void
}

function getTag(item: CatalogItem, type: string): string {
  return item.catalog_item_tags?.find(t => t.tag_type === type)?.tag_value || ''
}

function getConfidence(item: CatalogItem): number {
  const scores = item.catalog_item_tags?.map(t => t.confidence_score).filter(Boolean) || []
  if (scores.length === 0) return 0
  return scores.reduce((a, b) => a + b, 0) / scores.length
}

function ConfidenceBar({ score }: { score: number }) {
  const color = score >= 0.8 ? '#059669' : score >= 0.6 ? '#D97706' : '#EF4444'
  const label = score >= 0.8 ? 'High' : score >= 0.6 ? 'Medium' : 'Low'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ flex: 1, height: 4, background: '#E8EDF8', borderRadius: 100 }}>
        <div style={{ height: '100%', width: `${score * 100}%`, background: color, borderRadius: 100 }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, minWidth: 36 }}>{label}</span>
    </div>
  )
}

export default function Step2Catalog({ merchantId, hasInstallation, initialItems, onComplete, onBack }: Props) {
  const [items, setItems] = useState<CatalogItem[]>(initialItems)
  const [loading, setLoading] = useState(false)
  const [tagging, setTagging] = useState(false)
  const [tagResult, setTagResult] = useState<{ tagged: number; failed: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [shopInput, setShopInput] = useState('')
  const [connecting, setConnecting] = useState(false)

  const needsReview = items.filter(i => getConfidence(i) < 0.7 && i.ai_tagged)
  const highConfidence = items.filter(i => getConfidence(i) >= 0.7 && i.ai_tagged)

  useEffect(() => {
    if (initialItems.length === 0 && hasInstallation) {
      handleTagProducts()
    }
  }, [])

  async function handleTagProducts() {
    setTagging(true)
    setError('')
    try {
      const res = await fetch('/api/shopify/tag-products', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Tagging failed'); setTagging(false); return }
      setTagResult(json)
      const res2 = await fetch('/api/shopify/catalog-items')
      if (res2.ok) {
        const json2 = await res2.json()
        setItems(json2.items || [])
      }
    } catch (e: any) {
      setError(e.message || 'Error tagging products')
    }
    setTagging(false)
  }

  function handleContinue() {
    onComplete({ catalog_approved: true })
  }

  function handleConnectShop() {
    let shop = shopInput.trim().toLowerCase()
    if (!shop) return
    // Normalizza: rimuove https://, http://, trailing slash
    shop = shop.replace(/^https?:\/\//, '').replace(/\/$/, '')
    // Aggiunge .myshopify.com se non presente
    if (!shop.includes('.myshopify.com')) {
      shop = `${shop}.myshopify.com`
    }
    setConnecting(true)
    window.location.href = `/api/shopify/install?shop=${shop}&expert_id=${merchantId}&redirect=/shopify/onboarding?step=2`
  }

  if (!hasInstallation) {
    const steps = [
      { icon: '📦', label: 'Import products' },
      { icon: '🔬', label: 'Analyse ingredients' },
      { icon: '🏷️', label: 'Tag benefits' },
      { icon: '🗺️', label: 'Build recommendation map' },
      { icon: '✨', label: 'Generate customer plans' },
    ]
    return (
      <div style={{ padding: '0 2px' }}>
        <style>{`
          @media (max-width: 480px) {
            .catalog-step-title { font-size: 18px !important; }
            .catalog-step-subtitle { font-size: 13px !important; }
            .catalog-step-item { padding: 10px 12px !important; }
            .catalog-step-icon { width: 24px !important; height: 24px !important; font-size: 13px !important; }
            .catalog-step-label { font-size: 13px !important; }
            .catalog-btn { padding: 13px !important; font-size: 14px !important; }
            .catalog-shop-input { font-size: 13px !important; padding: 11px 14px !important; }
          }
        `}</style>

        <h2 className="catalog-step-title" style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>
          Catalog Intelligence
        </h2>
        <p className="catalog-step-subtitle" style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px' }}>
          What happens after you connect Shopify?
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {steps.map((s, i) => (
            <div
              key={i}
              className="catalog-step-item"
              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: '#F8FAFC', border: '1px solid #E8EDF8' }}
            >
              <div
                className="catalog-step-icon"
                style={{ width: 28, height: 28, borderRadius: 8, background: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}
              >
                {s.icon}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC', minWidth: 16 }}>{i + 1}.</span>
                <span className="catalog-step-label" style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>{s.label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Input shop + bottone connect */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input
              className="catalog-shop-input"
              type="text"
              placeholder="your-store.myshopify.com"
              value={shopInput}
              onChange={e => setShopInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConnectShop()}
              style={{
                flex: 1,
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #E8EDF8',
                fontSize: 14,
                color: '#0F172A',
                background: '#F8FAFC',
                outline: 'none',
              }}
            />
          </div>
          <button
            className="catalog-btn"
            onClick={handleConnectShop}
            disabled={connecting || !shopInput.trim()}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 12,
              fontWeight: 700,
              fontSize: 15,
              background: '#7C5CFC',
              color: '#fff',
              border: 'none',
              cursor: connecting || !shopInput.trim() ? 'not-allowed' : 'pointer',
              opacity: connecting || !shopInput.trim() ? 0.6 : 1,
            }}
          >
            {connecting ? 'Connecting…' : 'Connect Shopify →'}
          </button>
        </div>

        <button
          className="catalog-btn"
          onClick={handleContinue}
          style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 15, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}
        >
          Skip for now
        </button>
      </div>
    )
  }

  if (tagging) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>🔍</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: '0 0 8px', fontFamily: "'Satoshi', sans-serif" }}>Analysing your catalog…</h2>
        <p style={{ fontSize: 14, color: '#94A3B8', margin: '0 0 24px' }}>Claude is reading your products and generating smart tags.</p>
        <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '100%', background: 'linear-gradient(90deg, #7C5CFC, #06B6D4)', borderRadius: 100, animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    )
  }

  return (
    <div>
      <style>{`
        @media (max-width: 480px) {
          .catalog-kpi-grid { grid-template-columns: repeat(3, 1fr) !important; gap: 8px !important; }
          .catalog-kpi-value { font-size: 20px !important; }
          .catalog-item-title { font-size: 12px !important; }
          .catalog-approve-btn { padding: 13px !important; font-size: 14px !important; }
        }
      `}</style>

      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Catalog Intelligence</h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 20px' }}>Claude has analysed your products. Review and approve the tags.</p>

      {tagResult && (
        <div className="catalog-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Products found', value: tagResult.total, color: '#7C5CFC', bg: '#EDE9FE' },
            { label: 'Tagged', value: tagResult.tagged, color: '#059669', bg: '#D1FDF3' },
            { label: 'Need review', value: needsReview.length, color: '#D97706', bg: '#FEF3C7' },
          ].map((kpi, i) => (
            <div key={i} style={{ background: kpi.bg, borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ fontSize: 10, color: '#64748B', margin: '0 0 4px', fontWeight: 600 }}>{kpi.label}</p>
              <p className="catalog-kpi-value" style={{ fontSize: 24, fontWeight: 800, color: kpi.color, margin: 0, fontFamily: "'Satoshi', sans-serif" }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 16, background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444', fontSize: 13 }}>
          {error}
          <button onClick={handleTagProducts} style={{ marginLeft: 12, fontWeight: 700, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 13 }}>Retry</button>
        </div>
      )}

      {items.length === 0 && !tagging && (
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <p style={{ color: '#94A3B8', fontSize: 14 }}>No products found.</p>
          <button onClick={handleTagProducts} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>
            Sync & tag products
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20, maxHeight: 360, overflowY: 'auto' }}>
          {items.map(item => {
            const confidence = getConfidence(item)
            const step = getTag(item, 'routine_step')
            const time = getTag(item, 'usage_time')
            const needsReviewFlag = item.ai_tagged && confidence < 0.7
            return (
              <div key={item.id} style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${needsReviewFlag ? '#FDE68A' : '#E8EDF8'}`, background: needsReviewFlag ? '#FFFBEB' : '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <p className="catalog-item-title" style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', margin: 0, flex: 1, paddingRight: 12 }}>{item.title}</p>
                  {needsReviewFlag && <span style={{ fontSize: 10, fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap' }}>Review needed</span>}
                  {!needsReviewFlag && item.ai_tagged && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FDF3', padding: '2px 8px', borderRadius: 100, whiteSpace: 'nowrap' }}>✓ Tagged</span>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                  {step && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: '#EDE9FE', color: '#7C5CFC', fontWeight: 600 }}>{step}</span>}
                  {time && <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 100, background: '#EEF2FF', color: '#6385FF', fontWeight: 600 }}>{time}</span>}
                </div>
                {item.ai_tagged && <ConfidenceBar score={confidence} />}
              </div>
            )
          })}
        </div>
      )}

      {items.length > 0 && (
        <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #6EE7B7', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: '#065F46', margin: 0 }}>
            ✓ {highConfidence.length} products tagged with high confidence. You can refine tags anytime from the Products tab.
          </p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>← Back</button>
        <button
          className="catalog-approve-btn"
          onClick={handleContinue}
          disabled={loading}
          style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          Approve & continue →
        </button>
      </div>
    </div>
  )
}
