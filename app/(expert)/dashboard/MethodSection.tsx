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
  { key: 'caloric_target', label: 'D1 — Caloric Target & Macro Distribution', question: 'What is your daily caloric target and macro distribution?', placeholder: 'e.g. 1800 kcal — 40% protein / 30% carbs / 30% fats' },
  { key: 'on_off_days', label: 'D2 — ON/OFF Days & Weekly Variations', question: 'Do you use ON/OFF days or weekly variations in your protocol?', placeholder: 'e.g. Mon/Wed/Fri = training days with higher macros; weekend = refeed' },
  { key: 'untouchable_foods', label: 'D3 — Non-Negotiable Foods', question: 'Which foods are non-negotiable in your method — and why?', placeholder: 'e.g. Basmati rice at breakfast is part of the protocol and cannot be replaced' },
  { key: 'metabolic_adaptation', label: 'D4 — Metabolic Adaptation Management', question: 'How do you manage metabolic adaptation week by week?', placeholder: 'e.g. If weight stalls for 2 weeks, I reduce carbs by 20g; every 4 weeks a refeed' },
  { key: 'allergies_management', label: 'D5 — Allergies & Client Preferences', question: 'How should the system handle client allergies and food preferences?', placeholder: 'e.g. Allergies block the entire food family. If too restrictive, redirect to direct consultation' },
]

const UNIVERSAL_QUESTIONS = [
  { key: 'specific_result', label: 'D1 — The Specific Result of Your Method', question: 'What specific result does your method deliver?', placeholder: 'e.g. 4–6kg fat loss in 8 weeks while preserving muscle mass' },
  { key: 'absolute_rules', label: 'D2 — The Absolute Rules of Your Method', question: 'What are the absolute rules of your method — the ones that if broken, it\'s no longer your method?', placeholder: 'e.g. Never go below 1200 kcal; every session starts with 10 min mobility' },
  { key: 'never_does', label: 'D3 — What Your Method Never Does', question: 'What does your method never do — and why?', placeholder: 'e.g. Never eliminate entire food groups; never prescribe daily training without recovery' },
  { key: 'progression', label: 'D4 — Progression Over Time', question: 'How does your method evolve over time — is there a defined progression?', placeholder: 'e.g. Every 2 weeks I review parameters; 3 phases: adaptation, intensification, maintenance' },
  { key: 'stop_criteria', label: 'D5 — Stop Criteria', question: 'In which situations does your method not apply — and what do you do instead?', placeholder: 'e.g. I do not work with people with diagnosed conditions without medical clearance' },
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
    if (!session) { setUploadError('Session expired. Please log in again.'); setUploading(false); return }
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') { setUploadError('Only PDF files are accepted.'); continue }
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
        setUploadError(json.error || 'Upload error. Please try again.')
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
  const enoughPdfs = pdfs.length >= 0

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .method-steps { flex-direction: column !important; }
          .method-step-btn { width: 100% !important; text-align: center !important; }
        }
      `}</style>

      <div>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 6px' }}>
            My Method
          </h2>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.6 }}>
            Upload your real plans and answer the questions. The AI will learn your method and replicate it for every client.
          </p>
        </div>

        {/* Steps */}
        <div className="method-steps" style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {['1. Upload PDFs', '2. Your method'].map((label, i) => (
            <div
              key={i}
              className="method-step-btn"
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
              Step 1 — Your real plans
            </p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              Upload at least <strong>5 PDFs</strong> of your real plans or programs. The AI uses them as the primary source to learn your method — your choices, quantities, language, and structure.
            </p>
            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed #E8EDF8', borderRadius: 12, padding: '32px 16px', cursor: 'pointer',
              background: '#F8FAFC', marginBottom: 16,
            }}>
              <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} style={{ display: 'none' }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <p style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, margin: '0 0 4px', textAlign: 'center' }}>
                {uploading ? 'Uploading...' : 'Click to select PDFs'}
              </p>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, textAlign: 'center' }}>You can select multiple files · PDF only</p>
            </label>
            {uploadError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{uploadError}</p>}
            {pdfs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
                  Uploaded PDFs: <span style={{ color: pdfs.length >= 5 ? '#059669' : '#D97706' }}>{pdfs.length}/5 minimum</span>
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
              {enoughPdfs ? 'Continue →' : `Upload ${5 - pdfs.length} more PDFs to continue`}
            </button>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Step 2 — Define your method
              </p>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                Category: <strong style={{ color: '#7C5CFC' }}>{expert?.category || 'Expert'}</strong>
                {' '}— {isNutritionist ? '6 nutrition-specific questions.' : '5 universal method questions.'}
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
                  D6 — Automatic Food Substitutions
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#0F172A', marginBottom: 16, lineHeight: 1.5 }}>
                  Do you allow the AI to automatically substitute a food with a macro-equivalent alternative?
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { value: 'always', emoji: '✅', label: 'Yes, always', desc: 'The AI substitutes any food excluded by the client automatically.' },
                    { value: 'selective', emoji: '⚙️', label: 'Yes, but only for some foods', desc: 'Specify in your notes which foods can be substituted and which are non-negotiable.' },
                    { value: 'never', emoji: '❌', label: 'No', desc: 'The client is informed that the food is a core part of the protocol.' },
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
              {saving ? 'Saving...' : saved ? '✓ Method saved!' : 'Save my method'}
            </button>

            {!allAnswered && (
              <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8' }}>
                Answer all questions to save.
              </p>
            )}

            {saved && (
              <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 10, padding: '14px 16px', marginTop: 12 }}>
                <p style={{ color: '#059669', fontWeight: 600, fontSize: 13, margin: 0 }}>
                  ✓ Method saved. The AI will use this information to generate personalised plans for your clients.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}