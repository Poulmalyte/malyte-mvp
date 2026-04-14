export default function LoginPage() {
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
        <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Bentornato</h1>
        <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>
          Accedi al tuo account Malyte
        </p>
        <p style={{ color: 'var(--muted)', fontSize: '13px' }}>
          — Pagina Login — verrà completata nel Giorno 2
        </p>
      </div>
    </main>
  )
}