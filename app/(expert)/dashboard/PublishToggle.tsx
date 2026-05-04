'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function PublishToggle({ productId, isPublished }: { productId: string; isPublished: boolean }) {
  const [published, setPublished] = useState(isPublished)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function toggle() {
    setLoading(true)
    const { error } = await supabase
      .from('products')
      .update({ is_published: !published })
      .eq('id', productId)
    if (!error) setPublished(!published)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
      {/* Badge status */}
      <span style={{
        fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
        background: published ? '#DCFCE7' : '#FEE2E2',
        color: published ? '#15803D' : '#DC2626',
      }}>
        {published ? '● Published' : '○ Not published'}
      </span>

      {/* Toggle button */}
      <button
        onClick={toggle}
        disabled={loading}
        style={{
          background: published ? '#FEE2E2' : '#DCFCE7',
          color: published ? '#DC2626' : '#15803D',
          border: `1px solid ${published ? '#FECACA' : '#BBF7D0'}`,
          borderRadius: 100,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 600,
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? '...' : published ? 'Hide' : 'Publish'}
      </button>
    </div>
  )
}