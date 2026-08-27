import { formatPrice } from '@/lib/currency'

/**
 * Card cross-sell. Server component: nessuna interattivita'.
 * Titolo, prezzo, immagine e destinazione arrivano SEMPRE dal catalogo
 * (risolti in page.tsx); dal modello arriva solo la motivazione.
 * Il CTA punta alla route interna di tracking, mai direttamente a Shopify.
 */
export default function CrossSellCard({
  token,
  productId,
  title,
  reason,
  price,
  imageUrl,
  currency = 'EUR',
}: {
  token: string
  productId: string
  title: string
  reason: string | null
  price: number | null
  imageUrl: string | null
  currency?: string
}) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 20, border: '1px solid #F0F0F0',
      padding: '24px', marginBottom: 20,
    }}>
      <p style={{
        fontSize: 11, fontWeight: 600, color: '#8E8E93', margin: '0 0 16px',
        textTransform: 'uppercase', letterSpacing: '0.08em',
      }}>
        Suggested for you
      </p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {imageUrl && (
          <img
            src={imageUrl}
            alt={title}
            style={{
              width: 72, height: 72, borderRadius: 12, objectFit: 'cover',
              flexShrink: 0, background: '#F5F7FA',
            }}
          />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            fontSize: 16, fontWeight: 700, color: '#1C1C1E', margin: '0 0 4px',
            fontFamily: "'Satoshi', sans-serif", lineHeight: 1.3,
          }}>
            {title}
          </h3>
          {price != null && (
            <p style={{ fontSize: 14, fontWeight: 600, color: '#5B6EF5', margin: 0 }}>
              {formatPrice(Number(price), currency)}
            </p>
          )}
        </div>
      </div>

      {reason && (
        <p style={{
          fontSize: 14, color: '#3C3C43', lineHeight: 1.6, margin: '16px 0 0',
        }}>
          {reason}
        </p>
      )}

      
        <a
      href={`/api/shopify/cross-sell-click?t=${encodeURIComponent(token)}&p=${encodeURIComponent(productId)}`}
        style={{
          display: 'block', marginTop: 20, padding: '13px 20px', borderRadius: 12,
          background: 'linear-gradient(135deg, #5B6EF5, #9B8AFB)', color: '#fff',
          fontSize: 15, fontWeight: 600, textAlign: 'center', textDecoration: 'none',
        }}
      >
        Discover the product
      </a>
    </div>
  )
}
