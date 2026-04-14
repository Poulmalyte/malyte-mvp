export default function SignupPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        padding: '48px',
        width: '100%',
        maxWidth: '440px',
        textAlign: 'center'
      }}>
        <div style={{ fontFamily: 'Syne', fontWeight: 800, fontSize: '22px', marginBottom: '8px' }}>
          maly<span style={{ color: 'var(--neon)' }}>te</span>
        </div>
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Crea account</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
          Inizia a scalare la tua expertise
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          — Pagina Signup — verrà completata nel Giorno 2
        </p>
      </div>
    </main>
  )
}