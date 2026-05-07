'use client'

import { useState, useEffect, useRef } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E8EDF8', padding: '24px', marginBottom: 16,
}

const input: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid #E8EDF8', fontSize: 13, color: '#0F172A',
  background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', lineHeight: 1.6,
}

const PRICING_MODELS = [
  { id: 'one_time', label: '💳 One-time payment', desc: 'Client pays once and gets lifetime access' },
  { id: 'subscription', label: '🔄 Monthly subscription', desc: 'Client pays monthly for continued access' },
  { id: 'bundle', label: '📦 Bundle', desc: 'Offer base + premium at different price points' },
]

const QUESTION_TYPES = [
  { id: 'number', label: '🔢 Number', desc: 'e.g. revenue, sessions, kg' },
  { id: 'text', label: '✏️ Text', desc: 'e.g. main blocker this week' },
  { id: 'slider', label: '🎚️ Slider 1–5', desc: 'e.g. energy level, motivation' },
  { id: 'yesno', label: '✅ Yes / No', desc: 'e.g. did you complete the task?' },
]

interface CheckinQuestion {
  id: string
  label: string
  type: string
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export default function MethodSection({ expert }: { expert: any }) {
  const existingPdfs: string[] = expert?.method_pdfs_urls || []
  const alreadyCompleted = !!expert?.method_onboarding_completed

  const [step, setStep] = useState(alreadyCompleted ? 3 : existingPdfs.length >= 5 ? 2 : 1)
  const [pdfs, setPdfs] = useState<string[]>(existingPdfs)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [deletingPdf, setDeletingPdf] = useState<string | null>(null)

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [interviewDone, setInterviewDone] = useState(false)
  const [structuredMethod, setStructuredMethod] = useState<any>(null)
  const [savingMethod, setSavingMethod] = useState(false)
  const [methodSaved, setMethodSaved] = useState(alreadyCompleted)
  const [pdfChangedWarning, setPdfChangedWarning] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [productTitle, setProductTitle] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [price, setPrice] = useState('')
  const [pricingModel, setPricingModel] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)
  const [savedProduct, setSavedProduct] = useState(false)
  const [productError, setProductError] = useState('')

  // Check-in questions
  const [checkinQuestions, setCheckinQuestions] = useState<CheckinQuestion[]>([])
  const [newQuestionLabel, setNewQuestionLabel] = useState('')
  const [newQuestionType, setNewQuestionType] = useState('number')

  // Auto-calibration
  const [autoCalibration, setAutoCalibration] = useState<boolean | null>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (step === 2 && !interviewStarted && !methodSaved) {
      setInterviewStarted(true)
      startInterview()
    }
  }, [step, interviewStarted, methodSaved])

  function resetInterview() {
    setMethodSaved(false)
    setInterviewDone(false)
    setStructuredMethod(null)
    setChatMessages([])
    setChatInput('')
    setInterviewStarted(false)
    setPdfChangedWarning(false)
  }

  async function startInterview() {
    if (pdfs.length === 0) {
      setChatMessages([{
        role: 'assistant',
        content: "⚠️ Before we start, you need to upload at least 5 PDFs of your real plans.\n\nGo back to **Step 1** and upload them — I'll read them carefully before asking you any questions.",
      }])
      return
    }

    setChatLoading(true)
    setChatMessages([])
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setChatLoading(false); return }

    try {
      const res = await fetch('/api/method-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Please analyze my uploaded plans and start the interview.' }],
          pdf_paths: pdfs,
          is_first_message: true,
          category: expert?.category || '',
        }),
      })
      const json = await res.json()
      if (json.message) setChatMessages([{ role: 'assistant', content: json.message }])
    } catch {
      setChatMessages([{ role: 'assistant', content: "Hi! I'm ready to help you structure your method. Let's start: what does your method do that a generic practitioner wouldn't?" }])
    }
    setChatLoading(false)
  }

  async function handleRedoInterview() {
    resetInterview()
    setInterviewStarted(true)
    await startInterview()
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true); setUploadError('')
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploadError('Session expired. Please log in again.'); setUploading(false); return }

    let addedCount = 0
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
        addedCount++
      } else {
        setUploadError(json.error || 'Upload error. Please try again.')
      }
    }

    if (addedCount > 0 && (interviewStarted || methodSaved)) {
      resetInterview()
      setPdfChangedWarning(true)
    }

    setUploading(false)
  }

  async function handleDeletePdf(pdfPath: string) {
    setDeletingPdf(pdfPath)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setDeletingPdf(null); return }

    const { error } = await supabase.storage.from('method-pdfs').remove([pdfPath])
    if (error) { setDeletingPdf(null); return }

    const newPdfs = pdfs.filter(p => p !== pdfPath)
    await supabase.from('experts').update({ method_pdfs_urls: newPdfs }).eq('id', expert.id)
    setPdfs(newPdfs)

    if (interviewStarted || methodSaved) {
      resetInterview()
      setPdfChangedWarning(true)
    }

    setDeletingPdf(null)
  }

  async function handleOpenPdf(pdfPath: string) {
    const { data } = await supabase.storage.from('method-pdfs').createSignedUrl(pdfPath, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleSend() {
    const text = chatInput.trim()
    if (!text || chatLoading || interviewDone) return
    setChatInput('')

    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: text }]
    setChatMessages(newMessages)
    setChatLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setChatLoading(false); return }

    try {
      const res = await fetch('/api/method-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: newMessages,
          pdf_paths: pdfs,
          is_first_message: false,
          category: expert?.category || '',
        }),
      })
      const json = await res.json()
      if (json.message) setChatMessages(prev => [...prev, { role: 'assistant', content: json.message }])
      if (json.isComplete && json.structuredData) {
        setInterviewDone(true)
        setStructuredMethod(json.structuredData)
      }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }])
    }
    setChatLoading(false)
  }

  async function handleConfirmMethod() {
    if (!structuredMethod) return
    setSavingMethod(true)
    const conversationText = chatMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    const { error } = await supabase
      .from('experts')
      .update({
        method_structured: structuredMethod,
        method_interview_conversation: conversationText,
        method_onboarding_completed: true,
      })
      .eq('id', expert.id)
    setSavingMethod(false)
    if (!error) { setMethodSaved(true); setStep(3) }
  }

  function handleAddQuestion() {
    if (!newQuestionLabel.trim()) return
    if (checkinQuestions.length >= 5) return
    setCheckinQuestions(prev => [...prev, {
      id: Date.now().toString(),
      label: newQuestionLabel.trim(),
      type: newQuestionType,
    }])
    setNewQuestionLabel('')
    setNewQuestionType('number')
  }

  function handleRemoveQuestion(id: string) {
    setCheckinQuestions(prev => prev.filter(q => q.id !== id))
  }

  async function handleSaveProduct() {
    if (!productTitle || !productDesc || !price || !pricingModel) {
      setProductError('Please fill in all fields')
      return
    }
    if (checkinQuestions.length === 0) {
      setProductError('Please add at least one check-in question for your clients')
      return
    }
    if (autoCalibration === null) {
      setProductError('Please choose whether to enable auto-calibration')
      return
    }

    setSavingProduct(true); setProductError('')
    const { error } = await supabase.from('products').insert({
      expert_id: expert.id,
      title: productTitle,
      description: productDesc,
      price: parseFloat(price),
      pricing_model: pricingModel,
      checkin_questions: checkinQuestions,
      auto_calibration: autoCalibration,
      is_published: false,
    })
    setSavingProduct(false)
    if (!error) setSavedProduct(true)
    else setProductError('Error saving product. Please try again.')
  }

  const enoughPdfs = pdfs.length >= 5
  const step1Done = enoughPdfs
  const step2Done = methodSaved
  const step3Done = savedProduct

  function stepStyle(index: number, done: boolean) {
    const isActive = step === index + 1
    if (done) return { padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#D1FDF3', color: '#059669', border: '1.5px solid #6EE7B7', transition: 'all 0.15s' }
    if (isActive) return { padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#7C5CFC', color: '#fff', transition: 'all 0.15s' }
    return { padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#F1F5F9', color: '#94A3B8', transition: 'all 0.15s' }
  }

  return (
    <>
      <style>{`
        @media (max-width: 600px) { .method-steps { flex-direction: column !important; } .method-step-btn { width: 100% !important; text-align: center !important; } }
        .chat-bubble-user { background: #7C5CFC; color: #fff; border-radius: 16px 16px 4px 16px; padding: 12px 16px; font-size: 13px; line-height: 1.6; max-width: 80%; align-self: flex-end; white-space: pre-wrap; }
        .chat-bubble-assistant { background: #F1F5F9; color: #0F172A; border-radius: 16px 16px 16px 4px; padding: 12px 16px; font-size: 13px; line-height: 1.6; max-width: 85%; align-self: flex-start; white-space: pre-wrap; }
        .chat-input:focus { border-color: #7C5CFC !important; outline: none; }
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        .pdf-action-btn:hover { opacity: 0.75 !important; }
        .calibration-option:hover { border-color: #7C5CFC !important; }
      `}</style>

      <div>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 6px' }}>My Method</h2>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Complete all three steps to start selling your methodology as personalised AI plans.</p>
        </div>

        <div className="method-steps" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[{ label: '1. Upload PDFs', done: step1Done }, { label: '2. Your method', done: step2Done }, { label: '3. Your product', done: step3Done }].map((s, i) => (
            <div key={i} className="method-step-btn"
              onClick={() => { if (i === 0) setStep(1); if (i === 1 && (enoughPdfs || step2Done)) setStep(2); if (i === 2 && step2Done) setStep(3) }}
              style={stepStyle(i, s.done)}>
              {s.done ? `✓ ${s.label}` : s.label}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Step 1 — Your real plans</p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              Upload at least <strong>5 PDFs</strong> of your real plans. The AI reads them before asking you questions.
            </p>

            {pdfs.length > 0 && (
              <div style={{ marginBottom: 16 }}>
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
                      <button className="pdf-action-btn" onClick={() => handleOpenPdf(pdf)} title="Open PDF"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', color: '#7C5CFC', transition: 'opacity 0.15s' }}>👁</button>
                      <button className="pdf-action-btn" onClick={() => handleDeletePdf(pdf)} disabled={deletingPdf === pdf} title="Delete PDF"
                        style={{ background: 'none', border: 'none', cursor: deletingPdf === pdf ? 'not-allowed' : 'pointer', fontSize: 15, padding: '2px 4px', color: '#EF4444', opacity: deletingPdf === pdf ? 0.4 : 1, transition: 'opacity 0.15s' }}>
                        {deletingPdf === pdf ? '…' : '🗑'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pdfChangedWarning && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: '#C2410C', margin: 0, fontWeight: 600 }}>
                  ⚠️ Your PDFs have changed — you'll need to redo the interview in Step 2 so the AI can re-read your updated plans.
                </p>
              </div>
            )}

            {uploadError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{uploadError}</p>}

            <label style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              border: '2px dashed #E8EDF8', borderRadius: 12, padding: '24px 16px', cursor: 'pointer',
              background: '#F8FAFC', marginBottom: 16,
            }}>
              <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} style={{ display: 'none' }} />
              <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
              <p style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, margin: '0 0 2px', textAlign: 'center' }}>
                {uploading ? 'Uploading...' : pdfs.length > 0 ? '+ Add more PDFs' : 'Click to select PDFs'}
              </p>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, textAlign: 'center' }}>Multiple files · PDF only</p>
            </label>

            <button onClick={() => setStep(2)} disabled={!enoughPdfs}
              style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: enoughPdfs ? '#7C5CFC' : '#E8EDF8', color: enoughPdfs ? '#fff' : '#94A3B8', border: 'none', cursor: enoughPdfs ? 'pointer' : 'not-allowed' }}>
              {enoughPdfs ? 'Continue →' : `Upload ${5 - pdfs.length} more PDFs to continue`}
            </button>
          </div>
        )}

        {/* STEP 2 — Chat */}
        {step === 2 && (
          <div>
            {methodSaved ? (
              <div style={{ ...card, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#059669', margin: '0 0 8px' }}>Method already structured</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Your method has been saved. You can redo the interview to update it, or go directly to your product.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleRedoInterview}
                    style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Redo interview
                  </button>
                  <button onClick={() => setStep(3)}
                    style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Go to product →
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={card}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Step 2 — Structure your method</p>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>
                    I've read your PDFs. Now I'll ask you <strong>7 questions</strong> to capture the logic behind your method — the part no PDF can show.
                  </p>
                </div>

                <div style={{ background: '#F8FAFC', borderRadius: 16, border: '1px solid #E8EDF8', padding: '16px', marginBottom: 12, minHeight: 320, maxHeight: 480, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {chatMessages.length === 0 && chatLoading && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✦</div>
                      <div style={{ background: '#F1F5F9', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', fontSize: 13, color: '#64748B' }}>Analysing your PDFs…</div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
                      {msg.role === 'assistant' && (
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✦</div>
                      )}
                      <div
                        className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}
                        dangerouslySetInnerHTML={{
                          __html: msg.content
                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                            .replace(/\n/g, '<br/>')
                        }}
                      />
                    </div>
                  ))}

                  {chatLoading && chatMessages.length > 0 && (
                    <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>✦</div>
                      <div style={{ background: '#F1F5F9', borderRadius: '16px 16px 16px 4px', padding: '12px 16px', display: 'flex', gap: 4, alignItems: 'center' }}>
                        {[0, 1, 2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#94A3B8', animation: `bounce 1s ease-in-out ${j * 0.15}s infinite` }} />)}
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {!interviewDone ? (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      className="chat-input"
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      placeholder="Type your answer and press Enter…"
                      disabled={chatLoading || pdfs.length === 0}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E8EDF8', fontSize: 13, color: '#0F172A', background: '#fff', fontFamily: 'inherit', outline: 'none', opacity: chatLoading || pdfs.length === 0 ? 0.6 : 1 }}
                    />
                    <button onClick={handleSend} disabled={chatLoading || !chatInput.trim() || pdfs.length === 0}
                      style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: 14, cursor: chatLoading || !chatInput.trim() || pdfs.length === 0 ? 'not-allowed' : 'pointer', opacity: chatLoading || !chatInput.trim() || pdfs.length === 0 ? 0.5 : 1, transition: 'all 0.15s', flexShrink: 0 }}>
                      →
                    </button>
                  </div>
                ) : (
                  <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 12, padding: '16px', marginBottom: 8 }}>
                    <p style={{ fontWeight: 700, color: '#059669', fontSize: 14, margin: '0 0 4px' }}>✓ Interview complete!</p>
                    <p style={{ fontSize: 13, color: '#065F46', margin: '0 0 12px' }}>Your method has been structured. Confirm to save it and continue.</p>
                    <button onClick={handleConfirmMethod} disabled={savingMethod}
                      style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', color: '#fff', border: 'none', cursor: savingMethod ? 'not-allowed' : 'pointer', opacity: savingMethod ? 0.7 : 1 }}>
                      {savingMethod ? 'Saving…' : 'Save & continue to product →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Step 3 — Your product</p>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>Define your first digital product. You can create more from the dashboard at any time.</p>
            </div>

            {/* Product basics */}
            <div style={card}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>PRODUCT NAME</label>
                <input type="text" value={productTitle} onChange={e => setProductTitle(e.target.value)} placeholder="e.g. 12-Week Transformation Plan" style={input} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>SHORT DESCRIPTION</label>
                <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="e.g. A personalized 12-week plan to transform your body..." rows={3} style={{ ...input, resize: 'vertical' }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 6, fontWeight: 600, letterSpacing: '0.04em' }}>PRICE (€)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 49" min="1" style={{ ...input, width: '160px' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 10, fontWeight: 600, letterSpacing: '0.04em' }}>SALES MODEL</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {PRICING_MODELS.map(model => (
                    <button key={model.id} onClick={() => setPricingModel(model.id)}
                      style={{ padding: '12px 16px', borderRadius: 12, textAlign: 'left', border: `1.5px solid ${pricingModel === model.id ? '#7C5CFC' : '#E8EDF8'}`, background: pricingModel === model.id ? '#EDE9FE' : '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: pricingModel === model.id ? '#7C5CFC' : '#0F172A', marginBottom: 2 }}>{model.label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{model.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Check-in questions */}
            <div style={card}>
              <p style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>WEEKLY CHECK-IN QUESTIONS</p>
              <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16, lineHeight: 1.6 }}>
                Define what you want to measure each week. Your clients will answer these before the AI generates their next plan. <strong>Max 5 questions.</strong>
              </p>

              {checkinQuestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                  {checkinQuestions.map((q, i) => (
                    <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC', minWidth: 20 }}>{i + 1}.</span>
                      <span style={{ fontSize: 13, color: '#0F172A', flex: 1 }}>{q.label}</span>
                      <span style={{ fontSize: 11, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 6, whiteSpace: 'nowrap' }}>
                        {QUESTION_TYPES.find(t => t.id === q.type)?.label}
                      </span>
                      <button onClick={() => handleRemoveQuestion(q.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', fontSize: 16, padding: '0 4px', lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}

              {checkinQuestions.length < 5 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input
                    type="text"
                    value={newQuestionLabel}
                    onChange={e => setNewQuestionLabel(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddQuestion() } }}
                    placeholder="e.g. How many calls did you make this week?"
                    style={input}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {QUESTION_TYPES.map(t => (
                      <button key={t.id} onClick={() => setNewQuestionType(t.id)}
                        style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: `1.5px solid ${newQuestionType === t.id ? '#7C5CFC' : '#E8EDF8'}`, background: newQuestionType === t.id ? '#EDE9FE' : '#F8FAFC', color: newQuestionType === t.id ? '#7C5CFC' : '#64748B', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit' }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <button onClick={handleAddQuestion} disabled={!newQuestionLabel.trim()}
                    style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: newQuestionLabel.trim() ? '#7C5CFC' : '#E8EDF8', color: newQuestionLabel.trim() ? '#fff' : '#94A3B8', fontWeight: 600, fontSize: 13, cursor: newQuestionLabel.trim() ? 'pointer' : 'not-allowed', transition: 'all 0.15s' }}>
                    + Add question ({checkinQuestions.length}/5)
                  </button>
                </div>
              )}

              {checkinQuestions.length >= 5 && (
                <p style={{ fontSize: 12, color: '#059669', fontWeight: 600, margin: '8px 0 0' }}>✓ Maximum 5 questions reached</p>
              )}
            </div>

            {/* Auto-calibration */}
            <div style={card}>
              <p style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 4, fontWeight: 600, letterSpacing: '0.04em' }}>🔄 AUTO-CALIBRATION</p>
              <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 16, lineHeight: 1.6 }}>
                Do you want the plan to automatically adapt to your client's weekly results?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button className="calibration-option" onClick={() => setAutoCalibration(true)}
                  style={{ padding: '16px', borderRadius: 12, textAlign: 'left', border: `1.5px solid ${autoCalibration === true ? '#7C5CFC' : '#E8EDF8'}`, background: autoCalibration === true ? '#EDE9FE' : '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: autoCalibration === true ? '#7C5CFC' : '#0F172A', marginBottom: 4 }}>✅ Yes — adapt automatically</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                    If the client is doing great, the plan gradually increases in intensity. If they're struggling, the AI slows down and consolidates before moving forward. <strong>Ideal if you want each client to progress at their own natural pace.</strong>
                  </div>
                </button>
                <button className="calibration-option" onClick={() => setAutoCalibration(false)}
                  style={{ padding: '16px', borderRadius: 12, textAlign: 'left', border: `1.5px solid ${autoCalibration === false ? '#7C5CFC' : '#E8EDF8'}`, background: autoCalibration === false ? '#EDE9FE' : '#F8FAFC', cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit' }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: autoCalibration === false ? '#7C5CFC' : '#0F172A', marginBottom: 4 }}>❌ No — follow my structure</div>
                  <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
                    The plan follows the fixed progression of your method, the same for all clients. <strong>Ideal if you have a structured path with fixed milestones you don't want to change.</strong>
                  </div>
                </button>
              </div>
            </div>

            {productError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>
                {productError}
              </div>
            )}

            {savedProduct ? (
              <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#059669', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>🎉 You&apos;re all set!</p>
                <p style={{ color: '#059669', fontSize: 13, margin: 0 }}>Your method is saved and your first product is ready. Go to Overview to manage everything.</p>
              </div>
            ) : (
              <button onClick={handleSaveProduct} disabled={savingProduct}
                style={{ width: '100%', padding: '16px', borderRadius: 12, fontWeight: 700, fontSize: 15, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', color: '#fff', border: 'none', cursor: savingProduct ? 'not-allowed' : 'pointer', opacity: savingProduct ? 0.7 : 1 }}>
                {savingProduct ? 'Saving...' : '🚀 Launch my product!'}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  )
}