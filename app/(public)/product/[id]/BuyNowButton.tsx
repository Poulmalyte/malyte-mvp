'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface BuyNowButtonProps {
  productId: string
  price: number
  variantId?: string
}

export default function BuyNowButton({ productId, price, variantId }: BuyNowButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleBuy = async () => {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/create-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, variantId }),
    })

    const data = await res.json()

    if (!res.ok) {
      if (res.status === 401) {
        router.push('/login')
        return
      }
      setError(data.error || 'Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    // Redirect al checkout Lemon Squeezy
    window.location.href = data.url
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        onClick={handleBuy}
        disabled={loading}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 100,
          fontWeight: 700,
          fontSize: 16,
          border: 'none',
          background: loading
            ? 'rgba(124,92,252,0.4)'
            : 'linear-gradient(135deg, #7C5CFC, #4DFFD2)',
          color: '#fff',
          cursor: loading ? 'not-allowed' : 'pointer',
          boxShadow: loading ? 'none' : '0 0 24px rgba(124,92,252,0.4)',
        }}
      >
        {loading ? 'Redirecting to checkout...' : `Buy now — €${price}`}
      </button>

      {error && (
        <p style={{ color: '#ff6b6b', fontSize: 13, textAlign: 'center', margin: 0 }}>
          {error}
        </p>
      )}
    </div>
  )
}