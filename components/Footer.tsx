export default function Footer() {
  return (
    <div style={{ borderTop: '1px solid #E8EDF8', padding: '16px 24px', textAlign: 'center', background: '#FFFFFF' }}>
      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
        © 2026 Malyte · AI-powered wellness programs ·{' '}
        <a href="/privacy" style={{ color: '#94A3B8', textDecoration: 'none' }} target="_blank">Privacy Policy</a>
        {' '}·{' '}
        <a href="/terms" style={{ color: '#94A3B8', textDecoration: 'none' }} target="_blank">Terms & Conditions</a>
      </p>
    </div>
  )
}