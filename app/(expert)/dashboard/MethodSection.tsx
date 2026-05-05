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

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [interviewStarted, setInterviewStarted] = useState(false)
  const [interviewDone, setInterviewDone] = useState(false)
  const [structuredMethod, setStructuredMethod] = useState<any>(null)
  const [savingMethod, setSavingMethod] = useState(false)
  const [methodSaved, setMethodSaved] = useState(alreadyCompleted)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const [productTitle, setProductTitle] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [price, setPrice] = useState('')
  const [pricingModel, setPricingModel] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)
  const [savedProduct, setSavedProduct] = useState(false)
  const [productError, setProductError] = useState('')

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (step === 2 && !interviewStarted && !methodSaved) {
      setInterviewStarted(true)
      startInterview()
    }
  }, [step])

  async function startInterview() {
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

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true); setUploadError('')
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
      if (json.success) setPdfs(prev => [...prev, json.fileName])
      else setUploadError(json.error || 'Upload error. Please try again.')
    }
    setUploading(false)
  }

  async function handleSaveProduct() {
    if (!productTitle || !productDesc || !price || !pricingModel) { setProductError('Please fill in all fields'); return }
    setSavingProduct(true); setProductError('')
    const { error } = await supabase.from('products').insert({
      expert_id: expert.id,
      title: productTitle,
      description: productDesc,
      price: parseFloat(price),
      pricing_model: pricingModel,
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
      `}</style>

      <div>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 6px' }}>My Method</h2>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Complete all three steps to start selling your methodology as personalised AI plans.</p>
        </div>

        <div className="method-steps" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {[{ label: '1. Upload PDFs', done: step1Done }, { label: '2. Your method', done: step2Done }, { label: '3. Your product', done: step3Done }].map((s, i) => (
            <div key={i} className="method-step-btn"
              onClick={() => { if (i === 0) setStep(1); if (i === 1 && enoughPdfs) setStep(2); if (i === 2 && step2Done) setStep(3) }}
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
            <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #E8EDF8', borderRadius: 12, padding: '32px 16px', cursor: 'pointer', background: '#F8FAFC', marginBottom: 16 }}>
              <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} style={{ display: 'none' }} />
              <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
              <p style={{ fontWeight: 600, color: '#0F172A', fontSize: 14, margin: '0 0 4px', textAlign: 'center' }}>{uploading ? 'Uploading...' : 'Click to select PDFs'}</p>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, textAlign: 'center' }}>You can select multiple files · PDF only</p>
            </label>
            {uploadError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{uploadError}</p>}
            {pdfs.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Uploaded PDFs: <span style={{ color: pdfs.length >= 5 ? '#059669' : '#D97706' }}>{pdfs.length}/5 minimum</span></p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pdfs.map((pdf, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F1F5F9', borderRadius: 8 }}>
                      <span style={{ fontSize: 14 }}>📄</span>
                      <span style={{ fontSize: 12, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.split('/').pop()?.replace(/^\d+_/, '') || pdf}</span>
                      <span style={{ color: '#059669', fontSize: 11, fontWeight: 600 }}>✓</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
                  <button onClick={() => { setMethodSaved(false); setInterviewStarted(false); setInterviewDone(false); setChatMessages([]); setStructuredMethod(null) }}
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
                      <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>{msg.content}</div>
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
                      disabled={chatLoading}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E8EDF8', fontSize: 13, color: '#0F172A', background: '#fff', fontFamily: 'inherit', outline: 'none', opacity: chatLoading ? 0.6 : 1 }}
                    />
                    <button onClick={handleSend} disabled={chatLoading || !chatInput.trim()}
                      style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: 14, cursor: chatLoading || !chatInput.trim() ? 'not-allowed' : 'pointer', opacity: chatLoading || !chatInput.trim() ? 0.5 : 1, transition: 'all 0.15s', flexShrink: 0 }}>
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
            {productError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{productError}</div>}
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