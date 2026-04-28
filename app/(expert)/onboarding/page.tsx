'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'nutrition', label: 'Nutrition', emoji: '🥗', desc: 'Meal plans, macros, dietary protocols' },
  { id: 'fitness', label: 'Fitness & Training', emoji: '🏋️', desc: 'Strength, hypertrophy, conditioning' },
  { id: 'running', label: 'Running & Endurance', emoji: '🏃', desc: 'Marathon, trail, cycling, triathlon' },
  { id: 'yoga', label: 'Yoga & Mindfulness', emoji: '💆', desc: 'Yoga, meditation, breathwork' },
  { id: 'skincare', label: 'Skincare & Beauty', emoji: '✨', desc: 'Skin health, routines, wellness' },
  { id: 'mental', label: 'Mental Wellness', emoji: '🧠', desc: 'Coaching, therapy, stress management' },
  { id: 'wellness', label: 'Holistic Wellness', emoji: '🌿', desc: 'Lifestyle, longevity, integrative health' },
  { id: 'other', label: 'Other', emoji: '➕', desc: 'Any other professional category' },
]

const CATEGORY_QUESTIONS: Record<string, { key: string; label: string; placeholder: string }[]> = {
  nutrition: [
    { key: 'caloric_target', label: 'What is your daily caloric target and macro distribution?', placeholder: 'e.g. 1800 kcal — 40% protein / 30% carbs / 30% fats' },
    { key: 'on_off_days', label: 'Do you use ON/OFF days or weekly variations in your protocol?', placeholder: 'e.g. Mon/Wed/Fri = training days with higher macros; weekend = refeed' },
    { key: 'untouchable_foods', label: 'Which foods are non-negotiable in your method — and why?', placeholder: 'e.g. Basmati rice at breakfast is part of the protocol and cannot be replaced' },
    { key: 'metabolic_adaptation', label: 'How do you manage metabolic adaptation week by week?', placeholder: 'e.g. If weight stalls for 2 weeks, I reduce carbs by 20g; every 4 weeks a refeed' },
    { key: 'allergies_management', label: 'How should the system handle client allergies and food preferences?', placeholder: 'e.g. Allergies block the entire food family. If too restrictive, I redirect the client to direct consultation' },
  ],
  fitness: [
    { key: 'training_frequency', label: 'How many sessions per week does your method require?', placeholder: 'e.g. 4 sessions/week: 2 upper body, 2 lower body, with 48h recovery between same muscle groups' },
    { key: 'training_style', label: 'What is the core training style of your method?', placeholder: 'e.g. Progressive overload with compound movements. Always prioritise form over load' },
    { key: 'equipment', label: 'What equipment does your method require?', placeholder: 'e.g. Barbell, dumbbells, cable machine. Can adapt to home gym with resistance bands' },
    { key: 'progression', label: 'How do you structure progressive overload over time?', placeholder: 'e.g. Add 2.5kg per week on main lifts; deload every 4th week' },
    { key: 'stop_criteria', label: 'When does your method not apply — and what do you do instead?', placeholder: 'e.g. Acute injuries, post-surgery recovery without medical clearance' },
  ],
  running: [
    { key: 'weekly_volume', label: 'What weekly mileage/volume does your method prescribe?', placeholder: 'e.g. Build from 30km/week to 60km/week over 12 weeks using 80/20 intensity split' },
    { key: 'intensity_zones', label: 'How do you define and use training zones?', placeholder: 'e.g. Zone 2 = 80% of sessions, Zone 4-5 = 20%. HR or pace-based depending on client' },
    { key: 'progression', label: 'How does your training plan progress over time?', placeholder: 'e.g. 3 weeks build + 1 week recovery. Each block increases volume by max 10%' },
    { key: 'race_specificity', label: "How does your method adapt to the client's target race or goal?", placeholder: 'e.g. Last 6 weeks are race-specific with goal-pace intervals and taper' },
    { key: 'stop_criteria', label: 'When should the client not follow your plan?', placeholder: 'e.g. Any pain (not soreness), illness, or injury — rest and reassess before continuing' },
  ],
  yoga: [
    { key: 'practice_style', label: 'What style(s) of yoga or mindfulness does your method use?', placeholder: 'e.g. Vinyasa flow for mobility + Yin yoga for recovery + 10min daily meditation' },
    { key: 'session_structure', label: 'How is a typical session structured?', placeholder: 'e.g. 5min breathwork → 30min flow → 10min savasana. Never skip the wind-down' },
    { key: 'progression', label: 'How does your method evolve over time?', placeholder: 'e.g. Week 1-2: foundations and alignment. Week 3-4: add balancing poses. Week 5+: inversions' },
    { key: 'absolute_rules', label: 'What are the non-negotiable rules of your practice?', placeholder: 'e.g. Always warm up before deep stretches. No forcing range of motion — breath leads movement' },
    { key: 'stop_criteria', label: 'When should the client stop or modify the practice?', placeholder: 'e.g. Any sharp pain, dizziness, or pregnancy — modify immediately and consult a professional' },
  ],
  skincare: [
    { key: 'routine_structure', label: 'What does your core skincare routine look like?', placeholder: 'e.g. AM: cleanser, vitamin C, SPF. PM: cleanser, retinol (3x/week), moisturiser' },
    { key: 'key_ingredients', label: 'What are the non-negotiable ingredients or steps in your method?', placeholder: 'e.g. SPF every morning is mandatory. Retinol is core — cannot be replaced with bakuchiol' },
    { key: 'skin_types', label: 'How does your method adapt to different skin types?', placeholder: 'e.g. Oily: niacinamide-based products, no heavy creams. Dry: hyaluronic acid + ceramide focus' },
    { key: 'progression', label: 'How does the routine progress over time?', placeholder: 'e.g. Week 1-2: barrier repair. Week 3-4: introduce actives. Week 5+: target specific concerns' },
    { key: 'stop_criteria', label: 'When should the client stop and consult a dermatologist?', placeholder: 'e.g. Active breakouts with cysts, rosacea flares, or any allergic reaction to a product' },
  ],
  mental: [
    { key: 'specific_result', label: 'What specific outcome does your method deliver?', placeholder: 'e.g. Reduction in chronic stress markers and improved sleep quality within 8 weeks' },
    { key: 'absolute_rules', label: 'What are the absolute rules of your approach?', placeholder: 'e.g. No toxic positivity. Always validate emotions before suggesting reframes' },
    { key: 'never_does', label: 'What does your method never do — and why?', placeholder: 'e.g. Never diagnose or replace therapy. Refer immediately if clinical symptoms appear' },
    { key: 'progression', label: 'How does your method evolve over time?', placeholder: 'e.g. Phase 1: awareness. Phase 2: tools. Phase 3: integration and autonomy' },
    { key: 'stop_criteria', label: 'When does your method not apply?', placeholder: 'e.g. Active suicidal ideation, psychosis, or severe clinical depression — refer to licensed therapist' },
  ],
  wellness: [
    { key: 'specific_result', label: 'What specific result does your method deliver?', placeholder: 'e.g. Improved energy, sleep, and body composition through lifestyle optimisation in 90 days' },
    { key: 'absolute_rules', label: 'What are the non-negotiable pillars of your method?', placeholder: 'e.g. Sleep 7-9h, daily movement, whole foods. These three are foundational — everything else builds on them' },
    { key: 'never_does', label: 'What does your method never do?', placeholder: 'e.g. Never recommend extreme restriction or unsustainable protocols' },
    { key: 'progression', label: 'How does your method evolve over time?', placeholder: 'e.g. Month 1: habits. Month 2: optimise. Month 3: sustain and refine' },
    { key: 'stop_criteria', label: 'When does your method not apply?', placeholder: 'e.g. Active eating disorders, serious medical conditions without clearance' },
  ],
  other: [
    { key: 'specific_result', label: 'What specific result does your method deliver?', placeholder: 'e.g. Clear outcome in a defined timeframe' },
    { key: 'absolute_rules', label: 'What are the absolute rules of your method?', placeholder: 'e.g. Rules that if violated, the method is no longer yours' },
    { key: 'never_does', label: 'What does your method never do — and why?', placeholder: 'e.g. Boundaries and limitations of your approach' },
    { key: 'progression', label: 'How does your method evolve over time?', placeholder: 'e.g. Phases, checkpoints, or milestones in your protocol' },
    { key: 'stop_criteria', label: 'When does your method not apply?', placeholder: 'e.g. Situations where you refer the client elsewhere' },
  ],
}

const PRICING_MODELS = [
  { id: 'one_time', label: '💳 One-time payment', desc: 'Client pays once and gets lifetime access' },
  { id: 'subscription', label: '🔄 Monthly subscription', desc: 'Client pays monthly for continued access' },
  { id: 'bundle', label: '📦 Bundle', desc: 'Offer base + premium at different price points' },
]

const input: React.CSSProperties = {
  width: '100%', padding: '12px 16px', borderRadius: '10px',
  background: '#F5F7FA', border: '1px solid #E8EDF8',
  color: '#0F172A', fontSize: '15px', outline: 'none', boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [age, setAge] = useState('')
  const [sex, setSex] = useState('')
  const [category, setCategory] = useState('')
  const [methodAnswers, setMethodAnswers] = useState<Record<string, string>>({})
  const [productTitle, setProductTitle] = useState('')
  const [productDesc, setProductDesc] = useState('')
  const [price, setPrice] = useState('')
  const [pricingModel, setPricingModel] = useState('')

  const progress = step === 1 ? 33 : step === 2 ? 66 : 100
  const selectedCategory = CATEGORIES.find(c => c.id === category)
  const categoryQuestions = category ? CATEGORY_QUESTIONS[category] || [] : []
  const allAnswered = categoryQuestions.every(q => methodAnswers[q.key]?.trim().length > 0)

  function generateSlug(name: string) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Math.random().toString(36).substr(2, 6)
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const fullName = `${firstName} ${lastName}`.trim()
      const expertSlug = generateSlug(fullName || firstName)
      const { error: expertError } = await supabase.from('experts').upsert({
        id: user.id, name: fullName, slug: expertSlug, category,
        methodology_name: selectedCategory?.label || category,
        methodology_description: Object.entries(methodAnswers).map(([k, v]) => `${k}: ${v}`).join('\n'),
        results_description: methodAnswers['specific_result'] || methodAnswers['caloric_target'] || '',
        method_questions_answers: methodAnswers, is_published: false,
      })
      if (expertError) { setError('Error saving profile: ' + expertError.message); setLoading(false); return }
      await supabase.from('profiles').upsert({ id: user.id, name: fullName, role: 'expert' }, { onConflict: 'id' })
      const { error: productError } = await supabase.from('products').insert({
        expert_id: user.id, title: productTitle, description: productDesc,
        price: parseFloat(price), pricing_model: pricingModel, is_published: false,
      })
      if (productError) { setError('Error creating product: ' + productError.message); setLoading(false); return }
      router.push('/dashboard')
    } catch {
      setError('Unexpected error. Please try again.')
      setLoading(false)
    }
  }

  const ErrorBox = () => error ? (
    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '12px 16px', color: '#EF4444', fontSize: '13px', marginBottom: '16px' }}>{error}</div>
  ) : null

  return (
    <>
      <style>{`
        @media (max-width: 600px) {
          .ob-grid { grid-template-columns: 1fr !important; }
          .ob-price { width: 100% !important; }
          .ob-back { padding: 14px 16px !important; }
          .cat-grid { grid-template-columns: 1fr 1fr !important; }
          .ob-modal { padding: 28px 20px !important; }
        }
      `}</style>

      {/* SFONDO con blur — stesso stile login/signup */}
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #F0EFFE 0%, #E8F4FD 50%, #F0FDF9 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px', fontFamily: "'Inter', sans-serif",
      }}>

        {/* CARD MODALE */}
        <div className="ob-modal" style={{
          width: '100%', maxWidth: '520px',
          background: '#FFFFFF', borderRadius: '24px',
          padding: '40px 36px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
          maxHeight: '90vh', overflowY: 'auto',
        }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <span style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: '24px', color: '#0F172A' }}>
              malyte<span style={{ color: '#7C5CFC' }}>.</span>
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: '3px', background: '#E8EDF8', borderRadius: '100px', marginBottom: '32px' }}>
            <div style={{ height: '100%', borderRadius: '100px', background: 'linear-gradient(90deg, #7C5CFC, #4DFFD2)', width: `${progress}%`, transition: 'width 0.5s ease' }} />
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Step 1 of 3</div>
              <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: '#0F172A', textAlign: 'center' }}>Who are you? 👋</h1>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '28px', lineHeight: 1.6, textAlign: 'center' }}>This information will appear on your public profile.</p>

              <div className="ob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>FIRST NAME</label>
                  <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="e.g. Sara" style={input} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>LAST NAME</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="e.g. Rossi" style={input} />
                </div>
              </div>

              <div className="ob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>AGE</label>
                  <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 32" min="18" max="99" style={input} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>SEX</label>
                  <select value={sex} onChange={e => setSex(e.target.value)} style={{ ...input, appearance: 'none' as any }}>
                    <option value="">Select...</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Prefer not to say</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>PROFESSIONAL CATEGORY</label>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  style={{
                    width: '100%', padding: '13px 16px', borderRadius: '10px', textAlign: 'left',
                    background: category ? '#EDE9FE' : '#F5F7FA',
                    border: category ? '1.5px solid #7C5CFC' : '1px solid #E8EDF8',
                    cursor: 'pointer', fontSize: '14px', fontWeight: category ? 600 : 400,
                    color: category ? '#7C5CFC' : '#94A3B8',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <span>{selectedCategory ? `${selectedCategory.emoji} ${selectedCategory.label}` : 'Select your category...'}</span>
                  <span style={{ fontSize: '11px', color: '#94A3B8' }}>▼</span>
                </button>
              </div>

              <ErrorBox />
              <button onClick={() => {
                if (!firstName || !lastName || !age || !sex || !category) { setError('Please fill in all fields'); return }
                setError(''); setStep(2)
              }} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi, sans-serif' }}>
                Continue →
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Step 2 of 3</div>
              <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: '#0F172A', textAlign: 'center' }}>Your method 🧬</h1>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '6px', lineHeight: 1.6, textAlign: 'center' }}>
                Answer these questions about your <strong style={{ color: '#7C5CFC' }}>{selectedCategory?.label}</strong> method.
              </p>
              <p style={{ color: '#94A3B8', fontSize: '12px', marginBottom: '24px', textAlign: 'center' }}>You can update these anytime from your dashboard.</p>

              {categoryQuestions.map((q) => (
                <div key={q.key} style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '13px', color: '#0F172A', display: 'block', marginBottom: '6px', fontWeight: 600, lineHeight: 1.5 }}>{q.label}</label>
                  <textarea
                    value={methodAnswers[q.key] || ''}
                    onChange={e => setMethodAnswers(prev => ({ ...prev, [q.key]: e.target.value }))}
                    placeholder={q.placeholder}
                    rows={3}
                    style={{ ...input, resize: 'vertical', lineHeight: 1.6, border: methodAnswers[q.key]?.trim() ? '1.5px solid #7C5CFC' : '1px solid #E8EDF8' }}
                  />
                </div>
              ))}

              <ErrorBox />
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button onClick={() => setStep(1)} className="ob-back" style={{ padding: '14px 20px', borderRadius: '12px', background: '#F5F7FA', border: '1px solid #E8EDF8', color: '#0F172A', fontWeight: 500, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>← Back</button>
                <button onClick={() => {
                  if (!allAnswered) { setError('Please answer all questions to continue'); return }
                  setError(''); setStep(3)
                }} style={{ flex: 1, padding: '14px', borderRadius: '12px', background: '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: 'pointer', fontFamily: 'Satoshi, sans-serif' }}>
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <div style={{ fontSize: '11px', color: '#94A3B8', marginBottom: '6px', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, textAlign: 'center' }}>Step 3 of 3</div>
              <h1 style={{ fontFamily: 'Satoshi, sans-serif', fontSize: '24px', fontWeight: 800, marginBottom: '6px', color: '#0F172A', textAlign: 'center' }}>Your product 🚀</h1>
              <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6, textAlign: 'center' }}>Define your digital product and price. You can edit it at any time.</p>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>PRODUCT NAME</label>
                <input type="text" value={productTitle} onChange={e => setProductTitle(e.target.value)} placeholder="e.g. 12-Week Transformation Plan" style={input} />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>SHORT DESCRIPTION</label>
                <textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="e.g. A personalized 12-week plan to transform your body..." rows={3}
                  style={{ ...input, resize: 'vertical', lineHeight: 1.6 }} />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '6px', fontWeight: 600, letterSpacing: '0.04em' }}>PRICE (€)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 49" min="1"
                  className="ob-price" style={{ ...input, width: '160px' }} />
              </div>

              <div style={{ marginBottom: '24px' }}>
                <label style={{ fontSize: '12px', color: '#64748B', display: 'block', marginBottom: '10px', fontWeight: 600, letterSpacing: '0.04em' }}>SALES MODEL</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {PRICING_MODELS.map(model => (
                    <button key={model.id} onClick={() => setPricingModel(model.id)}
                      style={{
                        padding: '12px 16px', borderRadius: '12px', textAlign: 'left',
                        border: `1.5px solid ${pricingModel === model.id ? '#7C5CFC' : '#E8EDF8'}`,
                        background: pricingModel === model.id ? '#EDE9FE' : '#F8FAFC',
                        cursor: 'pointer', transition: 'all 0.2s', fontFamily: 'inherit',
                      }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: pricingModel === model.id ? '#7C5CFC' : '#0F172A', marginBottom: '2px' }}>{model.label}</div>
                      <div style={{ fontSize: '12px', color: '#94A3B8' }}>{model.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <ErrorBox />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setStep(2)} className="ob-back" style={{ padding: '14px 20px', borderRadius: '12px', background: '#F5F7FA', border: '1px solid #E8EDF8', color: '#0F172A', fontWeight: 500, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>← Back</button>
                <button onClick={() => {
                  if (!productTitle || !productDesc || !price || !pricingModel) { setError('Please fill in all fields'); return }
                  handleSubmit()
                }} disabled={loading}
                  style={{ flex: 1, padding: '14px', borderRadius: '12px', background: loading ? '#C4B5FD' : '#7C5CFC', color: '#fff', fontWeight: 700, fontSize: '15px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'Satoshi, sans-serif' }}>
                  {loading ? 'Saving...' : '🎉 Launch my product!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY MODAL */}
      {showCategoryModal && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', width: '100%', maxWidth: '520px', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.15)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 800, fontSize: '20px', color: '#0F172A', margin: '0 0 4px' }}>Select your category</h2>
                <p style={{ color: '#94A3B8', fontSize: '13px', margin: 0 }}>Choose the one that best describes your expertise</p>
              </div>
              <button onClick={() => setShowCategoryModal(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✕</button>
            </div>
            <div className="cat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => { setCategory(cat.id); setShowCategoryModal(false) }}
                  style={{
                    padding: '18px 14px', borderRadius: '16px', textAlign: 'center', cursor: 'pointer',
                    border: `2px solid ${category === cat.id ? '#7C5CFC' : '#E8EDF8'}`,
                    background: category === cat.id ? '#EDE9FE' : '#F8FAFC',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}>
                  <div style={{ fontSize: '26px', marginBottom: '8px' }}>{cat.emoji}</div>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: category === cat.id ? '#7C5CFC' : '#0F172A', marginBottom: '4px', lineHeight: 1.3 }}>{cat.label}</div>
                  <div style={{ fontSize: '11px', color: '#94A3B8', lineHeight: 1.4 }}>{cat.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}