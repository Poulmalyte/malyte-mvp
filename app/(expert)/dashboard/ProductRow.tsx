'use client'

import { useRouter } from 'next/navigation'
import PublishToggle from './PublishToggle'
import ShareButton from './ShareButton'

interface ProductRowProps {
  product: any
  sold: number
}

export default function ProductRow({ product, sold }: ProductRowProps) {
  const router = useRouter()
  const questionCount = product.product_questions?.[0]?.count || 0

  return (
    <div style={{ background: '#F5F7FA', borderRadius: 10, border: '1px solid #E8EDF8', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
        <div
          style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
          onClick={() => router.push(`/create-product?productId=${product.id}`)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{product.title}</span>
            {sold > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FDF3', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 100 }}>
                {sold} sold
              </span>
            )}
            <span style={{ fontSize: 11, color: '#7C5CFC', marginLeft: 2 }}>→</span>
          </div>
          <p style={{ color: '#94A3B8', fontSize: 11, margin: 0 }}>
            €{product.price} · {product.pricing_model} · {questionCount} q
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <ShareButton url={`https://malyte.com/product/${product.id}`} label="Share" />
          <PublishToggle productId={product.id} isPublished={product.is_published} />
        </div>
      </div>
    </div>
  )
}
