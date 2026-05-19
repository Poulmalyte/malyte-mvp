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
]

const DURATION_OPTIONS = [
  { value: 1, label: '1 month' },
  { value: 2, label: '2 months' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
]

const PRESET_INDICATORS = [
  { id: 'weight_loss', label: 'Weight loss progress' },
  { id: 'energy', label: 'Energy levels' },
  { id: 'muscle_gain', label: 'Muscle gain' },
  { id: 'skin_clarity', label: 'Skin clarity' },
  { id: 'sleep_quality', label: 'Sleep quality' },
  { id: 'stress_levels', label: 'Stress levels' },
  { id: 'mood', label: 'Mood' },
  { id: 'adherence', label: 'Adherence to plan' },
  { id: 'digestion', label: 'Digestion' },
  { id: 'hydration', label: 'Hydration' },
]

const PDF_SELLER_INITIAL_QUESTIONS = [
  { question_text: 'What is your main goal?', question_type: 'select', allow_multiple: false, options: ['Weight loss', 'Muscle gain', 'Maintenance', 'Improve overall health'] },
  { question_text: 'Do you have any food intolerances or allergies?', question_type: 'text', allow_multiple: false, options: [] },
  { question_text: 'Are there any foods you avoid or dislike?', question_type: 'text', allow_multiple: false, options: [] },
  { question_text: 'How many times a week do you exercise?', question_type: 'select', allow_multiple: false, options: ["I don't exercise", '1–2 times', '3–4 times', '5 or more'] },
  { question_text: 'What is your daily activity level?', question_type: 'select', allow_multiple: false, options: ['Sedentary (desk job, little movement)', 'Lightly active (some walking)', 'Moderately active (exercise 3–4×/week)', 'Very active (intense daily exercise)'] },
  { question_text: 'Your weight (e.g. 70 kg or 154 lbs)', question_type: 'text', allow_multiple: false, options: [] },
  { question_text: 'Your height (e.g. 170 cm or 5ft 7in)', question_type: 'text', allow_multiple: false, options: [] },
  { question_text: 'Your age', question_type: 'text', allow_multiple: false, options: [] },
]

const PDF_SELLER_CHECKIN_QUESTIONS = [
  { question_text: 'How closely did you follow the plan this week?', question_type: 'select', options: ['100% – followed everything', '75% – mostly followed', '50% – followed about half', 'Less than 50%'] },
  { question_text: 'How do you feel compared to last week?', question_type: 'select', options: ['Much better', 'Slightly better', 'About the same', 'Slightly worse'] },
  { question_text: "Any difficulties or things you'd like to adjust?", question_type: 'text', options: [] },
]

const PDF_SELLER_DEFAULT_INDICATORS = ['weight_loss', 'energy', 'mood', 'adherence']

type QuestionType = 'text' | 'select'

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  allow_multiple: boolean
  options: string[]
}

interface ProgressIndicator {
  id: string
  label: string
  custom: boolean
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

function QuestionBuilder({
  questions, setQuestions, placeholder = 'e.g. What is your main goal?',
}: {
  questions: Question[]
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>
  placeholder?: string
}) {
  function addQuestion() {
    setQuestions(prev => [...prev, { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] }])
  }
  function updateQuestion(id: string, field: keyof Question, value: any) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }
  function addOption(questionId: string) {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: [...q.options, ''] } : q))
  }
  function updateOption(questionId: string, index: number, value: string) {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: q.options.map((o, i) => i === index ? value : o) } : q))
  }
  function removeOption(questionId: string, index: number) {
    setQuestions(prev => prev.map(q => q.id === questionId ? { ...q, options: q.options.filter((_, i) => i !== index) } : q))
  }
  function removeQuestion(id: string) {
    setQuestions(prev => prev.filter(q => q.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{ background: '#F5F7FA', borderRadius: 12, padding: 20, border: '1px solid #E8EDF8' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ color: '#7C5CFC', fontSize: 12, fontWeight: 600 }}>Question {i + 1}</span>
              <button type="button" onClick={() => removeQuestion(q.id)}
                style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}>Remove</button>
            </div>
            <input type="text" value={q.question_text}
              onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
              placeholder={placeholder}
              style={{ ...input, marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['text', 'select'] as QuestionType[]).map(type => (
                <button key={type} type="button" onClick={() => updateQuestion(q.id, 'question_type', type)}
                  style={{
                    padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600,
                    border: `1px solid ${q.question_type === type ? '#7C5CFC' : '#E8EDF8'}`,
                    background: q.question_type === type ? '#EDE9FE' : '#FFFFFF',
                    color: q.question_type === type ? '#7C5CFC' : '#94A3B8', cursor: 'pointer',
                  }}>
                  {type === 'text' ? '✏️ Open answer' : '☑️ Multiple choice'}
                </button>
              ))}
            </div>
            {q.question_type === 'select' && (
              <div>
                <div style={{ marginBottom: 12 }}>
                  <button type="button" onClick={() => updateQuestion(q.id, 'allow_multiple', !q.allow_multiple)}
                    style={{
                      padding: '4px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600,
                      border: `1px solid ${q.allow_multiple ? '#059669' : '#E8EDF8'}`,
                      background: q.allow_multiple ? '#D1FDF3' : '#FFFFFF',
                      color: q.allow_multiple ? '#059669' : '#94A3B8', cursor: 'pointer',
                    }}>
                    {q.allow_multiple ? '✓ Multiple selections allowed' : 'Single selection only'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                  {q.options.map((opt, j) => (
                    <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input type="text" value={opt} onChange={e => updateOption(q.id, j, e.target.value)}
                        placeholder={`Option ${j + 1}`}
                        style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: '#FFFFFF', border: '1px solid #E8EDF8', color: '#0F172A', fontSize: 13, outline: 'none' }}
                      />
                      <button type="button" onClick={() => removeOption(q.id, j)}
                        style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 13, cursor: 'pointer' }}>✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addOption(q.id)}
                  style={{ fontSize: 12, color: '#7C5CFC', background: 'none', border: '1px dashed #C4B5FD', borderRadius: 8, padding: '6px 14px', cursor: 'pointer' }}>
                  + Add option
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      <button type="button" onClick={addQuestion}
        style={{ width: '100%', marginTop: 16, padding: '12px', borderRadius: 12, border: '1px dashed #C4B5FD', background: 'transparent', color: '#94A3B8', fontSize: 14, cursor: 'pointer' }}>
        + Add question
      </button>
    </div>
  )
}

export default function MethodSection({ expert }: { expert: any }) {
  const existingPdfs: string[] = expert?.method_pdfs_urls || []
  const alreadyCompleted = !!expert?.method_onboarding_completed
  const existingSellerType = (expert?.seller_type as 'practitioner' | 'pdf_seller' | null) || null

  const [sellerType, setSellerType] = useState<'practitioner' | 'pdf_seller' | null>(existingSellerType)
  const [savingType, setSavingType] = useState(false)

  const getInitialStep = () => {
    if (alreadyCompleted) return 3
    if (existingSellerType === 'pdf_seller' && existingPdfs.length >= 1) return 3
    if (existingSellerType === 'practitioner' && existingPdfs.length >= 5) return 2
    return 1
  }

  const [step, setStep] = useState(getInitialStep())
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
  const [durationMonths, setDurationMonths] = useState<number>(1)
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([])
  const [checkinQuestions, setCheckinQuestions] = useState<Question[]>([])
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([])
  const [customIndicators, setCustomIndicators] = useState<ProgressIndicator[]>([])
  const [newCustomLabel, setNewCustomLabel] = useState('')
  const [savingProduct, setSavingProduct] = useState(false)
  const [savedProduct, setSavedProduct] = useState(false)
  const [productError, setProductError] = useState('')

  const totalIndicators = selectedIndicators.length + customIndicators.length
  const isPdfSeller = sellerType === 'pdf_seller'
  const enoughPdfs = isPdfSeller ? pdfs.length >= 1 : pdfs.length >= 5

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages, chatLoading])

  useEffect(() => {
    if (step === 2 && !interviewStarted && !methodSaved && sellerType === 'practitioner') {
      setInterviewStarted(true)
      startInterview()
    }
  }, [step, interviewStarted, methodSaved, sellerType])

  function resetInterview() {
    setMethodSaved(false)
    setInterviewDone(false)
    setStructuredMethod(null)
    setChatMessages([])
    setChatInput('')
    setInterviewStarted(false)
    setPdfChangedWarning(false)
  }

  function togglePresetIndicator(id: string) {
    if (selectedIndicators.includes(id)) {
      setSelectedIndicators(prev => prev.filter(i => i !== id))
    } else {
      if (totalIndicators >= 4) return
      setSelectedIndicators(prev => [...prev, id])
    }
  }

  function addCustomIndicator() {
    if (!newCustomLabel.trim() || totalIndicators >= 4) return
    setCustomIndicators(prev => [...prev, { id: crypto.randomUUID(), label: newCustomLabel.trim(), custom: true }])
    setNewCustomLabel('')
  }

  function removeCustomIndicator(id: string) {
    setCustomIndicators(prev => prev.filter(i => i.id !== id))
  }

  async function handleSelectSellerType(type: 'practitioner' | 'pdf_seller') {
    setSellerType(type)
    await supabase.from('experts').update({ seller_type: type }).eq('id', expert.id)
  }

  async function handlePdfSellerContinue() {
    setSavingType(true)
    await supabase.from('experts').update({
      seller_type: 'pdf_seller',
      method_onboarding_completed: true,
    }).eq('id', expert.id)
    setSavingType(false)
    setMethodSaved(true)
    setStep(3)
  }

  async function startInterview() {
    if (pdfs.length === 0) {
      setChatMessages([{ role: 'assistant', content: "⚠️ Before we start, you need to upload at least 5 PDFs of your real plans.\n\nGo back to **Step 1** and upload them — I'll read them carefully before asking you any questions." }])
      return
    }
    setChatLoading(true)
    setChatMessages([])
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setChatLoading(false); return }
    try {
      const res = await fetch('/api/method-interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'Please analyze my uploaded plans and start the interview.' }], pdf_paths: pdfs, is_first_message: true, category: expert?.category || '' }),
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
    if (!session) { setUploadError('Session expired.'); setUploading(false); return }
    let addedCount = 0
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') { setUploadError('Only PDF files are accepted.'); continue }
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/upload-method-pdf', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData })
      const json = await res.json()
      if (json.success) { setPdfs(prev => [...prev, json.fileName]); addedCount++ }
      else setUploadError(json.error || 'Upload error.')
    }
    if (addedCount > 0 && (interviewStarted || methodSaved) && !isPdfSeller) { resetInterview(); setPdfChangedWarning(true) }
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
    if ((interviewStarted || methodSaved) && !isPdfSeller) { resetInterview(); setPdfChangedWarning(true) }
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ messages: newMessages, pdf_paths: pdfs, is_first_message: false, category: expert?.category || '' }),
      })
      const json = await res.json()
      if (json.message) setChatMessages(prev => [...prev, { role: 'assistant', content: json.message }])
      if (json.isComplete && json.structuredData) { setInterviewDone(true); setStructuredMethod(json.structuredData) }
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }])
    }
    setChatLoading(false)
  }

  async function handleConfirmMethod() {
    if (!structuredMethod) return
    setSavingMethod(true)
    const conversationText = chatMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')
    const { error } = await supabase.from('experts').update({
      method_structured: structuredMethod,
      method_interview_conversation: conversationText,
      method_onboarding_completed: true,
    }).eq('id', expert.id)
    setSavingMethod(false)
    if (!error) { setMethodSaved(true); setStep(3) }
  }

  async function handleSaveProduct() {
    if (!productTitle || !productDesc || !price || !pricingModel) { setProductError('Please fill in all product fields and select a sales model'); return }

    if (!isPdfSeller) {
      if (initialQuestions.length === 0) { setProductError('Add at least one initial question for your clients'); return }
      if (checkinQuestions.length === 0) { setProductError('Add at least one weekly check-in question'); return }
      if (totalIndicators === 0) { setProductError('Select at least one progress indicator'); return }
      for (const q of [...initialQuestions, ...checkinQuestions]) {
        if (!q.question_text.trim()) { setProductError('All questions must have text'); return }
        if (q.question_type === 'select' && q.options.filter(o => o.trim()).length < 2) { setProductError('Multiple choice questions need at least 2 options'); return }
      }
    }

    setSavingProduct(true); setProductError('')

    const allIndicators = isPdfSeller
      ? PRESET_INDICATORS.filter(p => PDF_SELLER_DEFAULT_INDICATORS.includes(p.id))
      : [
        ...PRESET_INDICATORS.filter(p => selectedIndicators.includes(p.id)),
        ...customIndicators.map(c => ({ id: c.id, label: c.label })),
      ]

    const { data: product, error } = await supabase.from('products').insert({
      expert_id: expert.id,
      title: productTitle,
      description: productDesc,
      price: parseFloat(price),
      pricing_model: pricingModel,
      duration_months: durationMonths,
      progress_indicators: allIndicators,
      is_published: true,
    }).select().single()

    if (error || !product) { setProductError('Error saving product. Please try again.'); setSavingProduct(false); return }

    const iqToInsert = isPdfSeller ? PDF_SELLER_INITIAL_QUESTIONS : initialQuestions
    const cqToInsert = isPdfSeller ? PDF_SELLER_CHECKIN_QUESTIONS : checkinQuestions

    await supabase.from('product_questions').insert(
      iqToInsert.map((q, i) => ({
        product_id: product.id, question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'select' ? q.options.filter((o: string) => o.trim()) : null,
        allow_multiple: q.question_type === 'select' ? q.allow_multiple : false, order_index: i,
      }))
    )
    await supabase.from('product_checkin_questions').insert(
      cqToInsert.map((q, i) => ({
        product_id: product.id, question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'select' ? q.options.filter((o: string) => o.trim()) : null, order_index: i,
      }))
    )

    setSavingProduct(false)
    setSavedProduct(true)
  }

  const step1Done = enoughPdfs && sellerType !== null
  const step2Done = methodSaved
  const step3Done = savedProduct

  const practitionerSteps = [
    { label: '1. Upload PDFs', done: step1Done },
    { label: '2. Your method', done: step2Done },
    { label: '3. Your product', done: step3Done },
  ]
  const pdfSellerSteps = [
    { label: '1. Upload PDF', done: step1Done },
    { label: '2. Your product', done: step3Done },
  ]
  const displaySteps = isPdfSeller ? pdfSellerSteps : practitionerSteps

  function stepStyle(index: number, done: boolean) {
    const isActive = isPdfSeller
      ? (index === 0 && step === 1) || (index === 1 && step === 3)
      : step === index + 1
    if (done) return { padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#D1FDF3', color: '#059669', border: '1.5px solid #6EE7B7', transition: 'all 0.15s' }
    if (isActive) return { padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#7C5CFC', color: '#fff', transition: 'all 0.15s' }
    return { padding: '8px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#F1F5F9', color: '#94A3B8', transition: 'all 0.15s' }
  }

  function handleStepClick(index: number) {
    if (isPdfSeller) {
      if (index === 0) setStep(1)
      if (index === 1 && step2Done) setStep(3)
    } else {
      if (index === 0) setStep(1)
      if (index === 1 && (enoughPdfs || step2Done)) setStep(2)
      if (index === 2 && step2Done) setStep(3)
    }
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
        .seller-type-card:hover { border-color: #7C5CFC !important; }
      `}</style>

      <div>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 6px' }}>My Method</h2>
          <p style={{ color: '#64748B', fontSize: 14, margin: 0, lineHeight: 1.6 }}>Complete all steps to start selling your methodology as personalised AI plans.</p>
        </div>

        <div className="method-steps" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
          {displaySteps.map((s, i) => (
            <div key={i} className="method-step-btn" onClick={() => handleStepClick(i)} style={stepStyle(i, s.done)}>
              {s.done ? `✓ ${s.label}` : s.label}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Step 1 — Who are you?</p>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>Choose how you work — this determines how your plans are generated.</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {[
                  { type: 'practitioner' as const, emoji: '🧠', title: 'Practitioner', desc: 'I have a personal method I want to scale. Malyte will learn my approach and generate fully personalized plans for each client.', color: '#7C5CFC', bg: '#EDE9FE', border: '#C4B5FD' },
                  { type: 'pdf_seller' as const, emoji: '📄', title: 'PDF Seller', desc: "I have ready-made plans. Malyte will adapt them to each buyer's profile automatically — same content, fully personalized.", color: '#059669', bg: '#D1FDF3', border: '#6EE7B7' },
                ].map(opt => (
                  <div key={opt.type} className="seller-type-card" onClick={() => handleSelectSellerType(opt.type)}
                    style={{ flex: 1, minWidth: 220, padding: '20px', borderRadius: 14, cursor: 'pointer', border: `2px solid ${sellerType === opt.type ? opt.border : '#E8EDF8'}`, background: sellerType === opt.type ? opt.bg : '#F8FAFC', transition: 'all 0.15s' }}>
                    <div style={{ fontSize: 28, marginBottom: 10 }}>{opt.emoji}</div>
                    <p style={{ fontWeight: 700, fontSize: 15, color: sellerType === opt.type ? opt.color : '#0F172A', margin: '0 0 6px' }}>{opt.title}</p>
                    <p style={{ fontSize: 12, color: '#64748B', margin: 0, lineHeight: 1.6 }}>{opt.desc}</p>
                    {sellerType === opt.type && (
                      <div style={{ marginTop: 12, display: 'inline-block', background: opt.color, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>✓ Selected</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {sellerType && (
              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                  {isPdfSeller ? 'Upload your PDF plan' : 'Upload your real plans'}
                </p>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
                  {isPdfSeller
                    ? <span>Upload at least <strong>1 PDF</strong> of your plan. Malyte will use it to generate personalized versions for each buyer.</span>
                    : <span>Upload at least <strong>5 PDFs</strong> of your real plans. Malyte reads them before asking you questions.</span>
                  }
                </p>

                {pdfs.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>
                      Uploaded PDFs: <span style={{ color: enoughPdfs ? '#059669' : '#D97706' }}>{pdfs.length}/{isPdfSeller ? '1' : '5'} minimum</span>
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pdfs.map((pdf, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F1F5F9', borderRadius: 8 }}>
                          <span style={{ fontSize: 14 }}>📄</span>
                          <span style={{ fontSize: 12, color: '#0F172A', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pdf.split('/').pop()?.replace(/^\d+_/, '') || pdf}</span>
                          <button className="pdf-action-btn" onClick={() => handleOpenPdf(pdf)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, padding: '2px 4px', color: '#7C5CFC' }}>👁</button>
                          <button className="pdf-action-btn" onClick={() => handleDeletePdf(pdf)} disabled={deletingPdf === pdf} style={{ background: 'none', border: 'none', cursor: deletingPdf === pdf ? 'not-allowed' : 'pointer', fontSize: 15, padding: '2px 4px', color: '#EF4444', opacity: deletingPdf === pdf ? 0.4 : 1 }}>
                            {deletingPdf === pdf ? '…' : '🗑'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {pdfChangedWarning && (
                  <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                    <p style={{ fontSize: 13, color: '#C2410C', margin: 0, fontWeight: 600 }}>⚠️ Your PDFs have changed — you'll need to redo the interview in Step 2.</p>
                  </div>
                )}
                {uploadError && <p style={{ color: '#EF4444', fontSize: 13, marginBottom: 12 }}>{uploadError}</p>}

                <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #E8EDF8', borderRadius: 12, padding: '24px 16px', cursor: 'pointer', background: '#F8FAFC', marginBottom: 16 }}>
                  <input type="file" accept=".pdf" multiple onChange={handlePdfUpload} style={{ display: 'none' }} />
                  <div style={{ fontSize: 24, marginBottom: 6 }}>📄</div>
                  <p style={{ fontWeight: 600, color: '#0F172A', fontSize: 13, margin: '0 0 2px', textAlign: 'center' }}>{uploading ? 'Uploading...' : pdfs.length > 0 ? '+ Add more PDFs' : 'Click to select PDFs'}</p>
                  <p style={{ color: '#94A3B8', fontSize: 12, margin: 0, textAlign: 'center' }}>Multiple files · PDF only</p>
                </label>

                {isPdfSeller ? (
                  <button onClick={handlePdfSellerContinue} disabled={!enoughPdfs || savingType}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: enoughPdfs ? '#059669' : '#E8EDF8', color: enoughPdfs ? '#fff' : '#94A3B8', border: 'none', cursor: enoughPdfs ? 'pointer' : 'not-allowed', opacity: savingType ? 0.7 : 1 }}>
                    {savingType ? 'Saving…' : enoughPdfs ? 'Continue to product →' : 'Upload at least 1 PDF to continue'}
                  </button>
                ) : (
                  <button onClick={() => setStep(2)} disabled={!enoughPdfs}
                    style={{ width: '100%', padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: enoughPdfs ? '#7C5CFC' : '#E8EDF8', color: enoughPdfs ? '#fff' : '#94A3B8', border: 'none', cursor: enoughPdfs ? 'pointer' : 'not-allowed' }}>
                    {enoughPdfs ? 'Continue →' : `Upload ${5 - pdfs.length} more PDFs to continue`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* STEP 2 — Practitioner only */}
        {step === 2 && sellerType === 'practitioner' && (
          <div>
            {methodSaved ? (
              <div style={{ ...card, textAlign: 'center' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>✅</div>
                <p style={{ fontWeight: 700, fontSize: 16, color: '#059669', margin: '0 0 8px' }}>Method already structured</p>
                <p style={{ fontSize: 13, color: '#64748B', margin: '0 0 20px' }}>Your method has been saved. You can redo the interview to update it, or go directly to your product.</p>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={handleRedoInterview} style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Redo interview</button>
                  <button onClick={() => setStep(3)} style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Go to product →</button>
                </div>
              </div>
            ) : (
              <>
                <div style={card}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Step 2 — Structure your method</p>
                  <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>I've read your PDFs. Now I'll ask you <strong>7 questions</strong> to capture the logic behind your method.</p>
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
                      <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}
                        dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
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
                    <input className="chat-input" value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                      placeholder="Type your answer and press Enter…" disabled={chatLoading || pdfs.length === 0}
                      style={{ flex: 1, padding: '12px 16px', borderRadius: 12, border: '1.5px solid #E8EDF8', fontSize: 13, color: '#0F172A', background: '#fff', fontFamily: 'inherit', outline: 'none', opacity: chatLoading || pdfs.length === 0 ? 0.6 : 1 }}
                    />
                    <button onClick={handleSend} disabled={chatLoading || !chatInput.trim() || pdfs.length === 0}
                      style={{ padding: '12px 20px', borderRadius: 12, border: 'none', background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: 14, cursor: chatLoading || !chatInput.trim() || pdfs.length === 0 ? 'not-allowed' : 'pointer', opacity: chatLoading || !chatInput.trim() || pdfs.length === 0 ? 0.5 : 1, flexShrink: 0 }}>→</button>
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

        {/* STEP 3 — Product */}
        {step === 3 && (
          <div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                {isPdfSeller ? 'Step 2' : 'Step 3'} — Your product
              </p>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0, lineHeight: 1.6 }}>Define your first digital product. You can create more from the dashboard at any time.</p>
              {isPdfSeller && (
                <div style={{ marginTop: 12, background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 10, padding: '10px 14px' }}>
                  <p style={{ fontSize: 12, color: '#059669', margin: 0, fontWeight: 600 }}>✓ PDF Seller mode — buyer questions and progress tracking are pre-configured automatically.</p>
                </div>
              )}
            </div>

            <div style={card}>
              <h2 style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 20px' }}>Product details</h2>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 8, fontWeight: 500 }}>Product name</label>
                <input type="text" value={productTitle} onChange={e => setProductTitle(e.target.value)} placeholder="e.g. 3-Month Weight Loss Plan" style={input} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 8, fontWeight: 500 }}>Description</label>
                <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="Describe what the client will receive..." rows={3} style={{ ...input, resize: 'vertical' as any }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 8, fontWeight: 500 }}>Price (€)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 49" min="1" style={{ ...input, width: 160 }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 12, fontWeight: 500 }}>Program duration</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DURATION_OPTIONS.map(opt => (
                    <button key={opt.value} type="button" onClick={() => setDurationMonths(opt.value)}
                      style={{ padding: '8px 18px', borderRadius: 100, fontSize: 13, fontWeight: 600, border: `1px solid ${durationMonths === opt.value ? '#7C5CFC' : '#E8EDF8'}`, background: durationMonths === opt.value ? '#EDE9FE' : '#F5F7FA', color: durationMonths === opt.value ? '#7C5CFC' : '#94A3B8', cursor: 'pointer' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize: 13, color: '#64748B', display: 'block', marginBottom: 12, fontWeight: 500 }}>Sales model</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {PRICING_MODELS.map(model => (
                    <button key={model.id} type="button" onClick={() => setPricingModel(model.id)}
                      style={{ padding: '14px 18px', borderRadius: 12, textAlign: 'left', border: `1px solid ${pricingModel === model.id ? '#7C5CFC' : '#E8EDF8'}`, background: pricingModel === model.id ? '#EDE9FE' : '#F5F7FA', cursor: 'pointer' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: pricingModel === model.id ? '#7C5CFC' : '#0F172A', marginBottom: 2 }}>{model.label}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8' }}>{model.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!isPdfSeller && (
              <div style={card}>
                <h2 style={{ color: '#D97706', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Progress indicators</h2>
                <p style={{ color: '#64748B', fontSize: 13, marginBottom: 12 }}>Choose up to 4 metrics to track weekly. <strong style={{ color: '#0F172A' }}>Select {4 - totalIndicators} more.</strong></p>
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                  <p style={{ fontSize: 12, color: '#D97706', fontWeight: 600, marginBottom: 4 }}>💡 Why progress indicators matter</p>
                  <p style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6, margin: 0 }}>After each weekly check-in, the AI automatically scores your client's progress on these dimensions (1–10).</p>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                  {PRESET_INDICATORS.map(ind => {
                    const selected = selectedIndicators.includes(ind.id)
                    const disabled = !selected && totalIndicators >= 4
                    return (
                      <button key={ind.id} type="button" onClick={() => togglePresetIndicator(ind.id)} disabled={disabled}
                        style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 500, border: `1px solid ${selected ? '#D97706' : '#E8EDF8'}`, background: selected ? '#FEF3C7' : '#F5F7FA', color: selected ? '#D97706' : disabled ? '#C7D2F0' : '#64748B', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1 }}>
                        {selected ? '✓ ' : ''}{ind.label}
                      </button>
                    )
                  })}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: '#64748B', display: 'block', marginBottom: 8 }}>Or add a custom indicator:</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                    <input type="text" value={newCustomLabel} onChange={e => setNewCustomLabel(e.target.value)} onKeyDown={e => e.key === 'Enter' && addCustomIndicator()} placeholder="e.g. Back pain level..." disabled={totalIndicators >= 4} style={{ ...input, flex: 1, opacity: totalIndicators >= 4 ? 0.5 : 1 }} />
                    <button type="button" onClick={addCustomIndicator} disabled={totalIndicators >= 4 || !newCustomLabel.trim()} style={{ padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#FEF3C7', border: '1px solid #FDE68A', color: '#D97706', cursor: 'pointer', whiteSpace: 'nowrap', opacity: totalIndicators >= 4 || !newCustomLabel.trim() ? 0.4 : 1 }}>+ Add</button>
                  </div>
                  {customIndicators.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {customIndicators.map(ind => (
                        <div key={ind.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 100, background: '#FEF3C7', border: '1px solid #FDE68A' }}>
                          <span style={{ fontSize: 12, color: '#D97706' }}>✦ {ind.label}</span>
                          <button type="button" onClick={() => removeCustomIndicator(ind.id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {!isPdfSeller && (
              <div style={card}>
                <h2 style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Initial questions</h2>
                <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Asked once after purchase. The AI uses these to generate the Week 1 plan.</p>
                <QuestionBuilder questions={initialQuestions} setQuestions={setInitialQuestions} placeholder="e.g. What is your main goal?" />
              </div>
            )}

            {!isPdfSeller && (
              <div style={card}>
                <h2 style={{ color: '#059669', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>Weekly check-in questions</h2>
                <p style={{ color: '#64748B', fontSize: 13, marginBottom: 20 }}>Shown to the client at day 6 of each week. The AI uses their answers to adapt the next week's plan.</p>
                <QuestionBuilder questions={checkinQuestions} setQuestions={setCheckinQuestions} placeholder="e.g. How much weight did you lose this week?" />
              </div>
            )}

            {productError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#EF4444', fontSize: 13, marginBottom: 16 }}>{productError}</div>
            )}

            {savedProduct ? (
              <div style={{ background: '#D1FDF3', border: '1px solid #6EE7B7', borderRadius: 12, padding: '20px', textAlign: 'center' }}>
                <p style={{ color: '#059669', fontWeight: 700, fontSize: 16, margin: '0 0 6px' }}>🎉 You're all set!</p>
                <p style={{ color: '#059669', fontSize: 13, margin: 0 }}>Your product is live. Go to Overview to manage everything.</p>
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