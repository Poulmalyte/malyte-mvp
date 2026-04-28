'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E8EDF8', padding: '24px', marginBottom: 16,
}

const NUTRITION_QUESTIONS = [
  {
    key: 'caloric_target',
    label: 'D1 — Target Calorico e Distribuzione Macro',
    question: 'Qual è il tuo target calorico giornaliero e la distribuzione macro?',
    placeholder: 'Es: 1800 kcal — 40% proteine / 30% carboidrati / 30% grassi',
  },
  {
    key: 'on_off_days',
    label: 'D2 — Giorni ON/OFF e Variazioni Settimanali',
    question: 'Hai giorni ON/OFF o variazioni nel protocollo durante la settimana?',
    placeholder: 'Es: lunedì/mercoledì/venerdì = giorni allenamento con macro aumentate; weekend = refeed.',
  },
  {
    key: 'untouchable_foods',
    label: 'D3 — Alimenti Intoccabili del Metodo',
    question: 'Quali alimenti sono intoccabili nel tuo metodo — e perché?',
    placeholder: 'Es: Il riso basmati a colazione è parte del protocollo, non si sostituisce.',
  },
  {
    key: 'metabolic_adaptation',
    label: "D4 — Gestione dell'Adattamento Metabolico",
    question: "Come gestisci l'adattamento metabolico settimana per settimana?",
    placeholder: 'Es: Se il peso non scende per 2 settimane, riduco i carb di 20g; ogni 4 settimane refeed.',
  },
  {
    key: 'allergies_management',
    label: 'D5 — Gestione Allergie e Preferenze del Cliente',
    question: 'Come vuoi che il sistema gestisca le allergie e le preferenze alimentari del cliente?',
    placeholder: 'Es: Le allergie bloccano tutta la famiglia alimentare. Se impattano troppo il piano, rimando il cliente a consulenza diretta.',
  },
]

const UNIVERSAL_QUESTIONS = [
  {
    key: 'specific_result',
    label: 'D1 — Il Risultato Specifico del Metodo',
    question: 'Qual è il risultato specifico che il tuo metodo garantisce?',
    placeholder: 'Es: Perdita di 4-6 kg in 8 settimane mantenendo la massa muscolare.',
  },
  {
    key: 'absolute_rules',
    label: 'D2 — Le Regole Assolute del Metodo',
    question: 'Quali sono le regole assolute del tuo metodo — quelle che se vengono violate il metodo non è più il tuo?',
    placeholder: 'Es: Mai scendere sotto 1200 kcal; ogni sessione inizia con 10 minuti di mobilità.',
  },
  {
    key: 'never_does',
    label: 'D3 — Cosa il Metodo Non Fa Mai',
    question: 'Cosa non fa mai il tuo metodo — e perché?',
    placeholder: 'Es: Non elimino mai interi gruppi alimentari; non prescrivo allenamenti ogni giorno senza recupero.',
  },
  {
    key: 'progression',
    label: 'D4 — La Progressione nel Tempo',
    question: 'Come si adatta il tuo metodo nel tempo — esiste una progressione definita?',
    placeholder: 'Es: Ogni 2 settimane rivedo i parametri; il protocollo ha 3 fasi: adattamento, intensificazione, mantenimento.',
  },
  {
    key: 'stop_criteria',
    label: 'D5 — I Criteri di Stop del Metodo',
    question: 'In quali situazioni il tuo metodo non può essere applicato — e cosa fai in quel caso?',
    placeholder: 'Es: Non lavoro con persone con patologie diagnosticate senza liberatoria medica.',
  },
]

export default function MethodSection({ expert }: { expert: any }) {
  const isNutritionist = expert?.category?.toLowerCase().includes('nutri')
  const questions = isNutritionist ? NUTRITION_QUESTIONS : UNIVERSAL_QUESTIONS
  const existingAnswers = expert?.method_questions_answers || {}
  const existingPdfs: string[] = expert?.method_pdfs_urls || []
  const existingSubstitutions = expert?.allow_substitutions || 'always'

  const [step, setStep] = useState(existingPdfs.length >= 5 ? 2 : 1)
  const [pdfs, setPdfs] = useState<string[]>(existingPdfs)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [answers, setAnswers] = useState<Record<string, string>>(existingAnswers)
  const [substitutions, setSubstitutions] = useState(existingSubstitutions)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploadError('Sessione scaduta, rieffettua il login.'); setUploading(false); return }
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') { setUploadError('Solo file PDF accettati.'); continue }
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-method-pdf', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })
      const json = await res.json()
      if (json.success) {
        setPdfs(prev => [...prev, json.fileName])
      } else {
        setUploadError(json.error || 'Errore durante upload.')
      }
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('experts')
      .update({
        method_questions_answers: answers,
        allow_substitutions: substitutions,
        method_onboarding_completed: true,
      })
      .eq('id', expert.id)
    setSaving(false)
    if (!error) setSaved(true)
  }

  const allAnswered = questions.every(q => answers[q.key]?.trim().length > 0)
  const enoughPdfs = pdfs.length >= 5

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 6px' }}>
          Il Mio Metodo
        </h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
          Carica i tuoi piani reali e rispondi alle domande. L&apos;AI imparerà il tuo metodo e lo replicherà per ogni cliente.
        </p>
      </div>

      {/* Steps */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['1. Carica PDF', '2. Il tuo metodo'].map((label, i) => (
          <div
            key={i}
            onClick={() => { if (i === 0 || enoughPdfs) setStep(i + 1) }}
            style={{
              padding: '8px 20px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: step === i + 1 ? '#7C5CFC' : '#F1F5F9',
              color: step === i + 1 ? '#fff' : '#94A3B8',
              transition: 'all 0.15s',
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* STEP 1 */}
      {step === 1 && (
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
            Step 1 — I tuoi piani reali
          </p>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
            Carica almeno <strong>5 PDF</strong> dei tuoi piani o programmi reali. L&apos;AI li usa come fonte primaria per imparare il tuo metodo.
          </p>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            border: '2px dashed #E8EDF8', borderRadius: 12, padding: '32px 24px', cursor: 'pointer',
            background: '#F8FAFC', marginBottom: 16,
          }}>
            <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} style={{ display: 'none' }} />
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <p style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, margin: '0 0 4px' }}>
              {uploading ? 'Caricamento in corso...' : 'Clicca per selezionare i PDF'}
            </p>
            <p style={{ color: '#94A3B8', fontSize: 12, margin: 0 }}>Puoi selezionare più file contemporaneamente · Solo PDF</p>
          </label>
          {uploadError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{uploadError}</p>}
          {pdfs.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
                PDF caricati: <span style={{ color: pdfs.length >= 5 ? '#059669' : '#D97706' }}>{pdfs.length}/5 minimi</span>
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {pdfs.map((pdf, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F1F5F9', borderRadius: 8 }}>
                    <span style={{ fontSize: 14 }}>📄</span>
                    <span style={{ fontSize: 12, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {pdf.split('/').pop()?.replace(/^\d+_/, '') || pdf}
                    </span>
                    <span style={{ color: '#059669', fontSize: 11, fontWeight: 600 }}>✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button
            onClick={() => setStep(2)}
            disabled={!enoughPdfs}
            style={{
              width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14,
              background: enoughPdfs ? '#7C5CFC' : '#E8EDF8',
              color: enoughPdfs ? '#fff' : '#94A3B8',
              border: 'none', cursor: enoughPdfs ? 'pointer' : 'not-allowed',
            }}
          >
            {enoughPdfs ? 'Continua →' : `Carica ancora ${5 - pdfs.length} PDF per continuare`}
          </button>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div>
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
              Step 2 — Definisci il tuo metodo
            </p>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
              Categoria rilevata: <strong style={{ color: '#7C5CFC' }}>{expert?.category || 'Esperto'}</strong>
              {' '}— {isNutritionist ? '6 domande specifiche per la nutrizione.' : '5 domande universali per il tuo metodo.'}
            </p>
          </div>

          {questions.map((q) => (
            <div key={q.key} style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                {q.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 12, lineHeight: 1.5 }}>
                {q.question}
              </p>
              <textarea
                value={answers[q.key] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                placeholder={q.placeholder}
                rows={4}
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 10,
                  border: answers[q.key]?.trim() ? '1.5px solid #7C5CFC' : '1.5px solid #E8EDF8',
                  fontSize: 13, color: '#0F172A', background: '#F8FAFC',
                  resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                  boxSizing: 'border-box', lineHeight: 1.6,
                }}
              />
            </div>
          ))}

          {isNutritionist && (
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
                D6 — Sostituzione Automatica degli Alimenti
              </p>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 16, lineHeight: 1.5 }}>
                Permetti all&apos;AI di sostituire automaticamente un alimento con un equivalente nutrizionale?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { value: 'always', emoji: '✅', label: 'Sì, sempre', desc: "L'AI sostituisce automaticamente qualsiasi alimento escluso dal cliente." },
                  { value: 'selective', emoji: '⚙️', label: 'Sì, ma solo per alcuni alimenti', desc: 'Specifica nelle note quali alimenti sono sostituibili e quali intoccabili.' },
                  { value: 'never', emoji: '❌', label: 'No', desc: "Il cliente viene avvisato che quell'alimento è parte integrante del protocollo." },
                ].map(opt => (
                  <div
                    key={opt.value}
                    onClick={() => setSubstitutions(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
                      borderRadius: 10, cursor: 'pointer',
                      border: substitutions === opt.value ? '2px solid #7C5CFC' : '2px solid #E8EDF8',
                      background: substitutions === opt.value ? '#F5F3FF' : '#F8FAFC',
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{opt.emoji}</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', margin: '0 0 2px' }}>{opt.label}</p>
                      <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!allAnswered || saving}
            style={{
              width: '100%', padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 15,
              background: allAnswered ? 'linear-gradient(135deg, #7C5CFC, #4DFFD2)' : '#E8EDF8',
              color: allAnswered ? '#fff' : '#94A3B8',
              border: 'none', cursor: allAnswered ? 'pointer' : 'not-allowed',
              marginBottom: 8,
            }}
          >
            {saving ? 'Salvataggio...' : saved ? '✓ Metodo salvato!' : 'Salva il mio metodo'}
          </button>

          {!allAnswered && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
              Rispondi a tutte le domande per salvare.
            </p>
          )}

          {saved && (
            <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
              <p style={{ color: '#059669', fontWeight: 600, fontSize: 13, margin: 0 }}>
                ✓ Metodo salvato. L&apos;AI userà queste informazioni per generare piani personalizzati per i tuoi clienti.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}