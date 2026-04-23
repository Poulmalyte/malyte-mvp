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
    <button
      onClick={toggle}
      disabled={loading}
      style={{
        background: published ? 'rgba(255,107,107,0.1)' : 'rgba(77,255,210,0.1)',
        color: published ? '#FF6B6B' : '#4DFFD2',
        border: `1px solid ${published ? 'rgba(255,107,107,0.3)' : 'rgba(77,255,210,0.3)'}`,
        borderRadius: 100,
        padding: '6px 14px',
        fontSize: 12,
        fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
      }}
    >
      {loading ? '...' : published ? 'Hide' : 'Publish'}
    </button>
  )
}