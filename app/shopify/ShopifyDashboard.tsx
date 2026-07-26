'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const card: React.CSSProperties = {
  background: '#FFFFFF', borderRadius: 16,
  border: '1px solid #E8EDF8', padding: '24px', marginBottom: 16,
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 10,
  border: '1px solid #E8EDF8', fontSize: 13, color: '#0F172A',
  background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', lineHeight: 1.6,
}

const CATEGORIES = [
  'Nutrition', 'Fitness', 'Mental Coaching', 'Wellness',
  'Skincare', 'Business Coaching', 'Other',
]

type QuestionType = 'text' | 'select'

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  options: string[]
}

interface ShopifyProduct {
  id: string
  shopify_product_id: string
  shopify_product_title: string
  pdf_path: string | null
  questions: Question[]
  plan_type: 'weekly' | 'guide'
  duration_weeks: number
}

function QuestionBuilder({ questions, setQuestions }: { questions: Question[], setQuestions: (qs: Question[]) => void }) {
  function addQuestion() { setQuestions([...questions, { id: crypto.randomUUID(), question_text: '', question_type: 'text', options: [] }]) }
  function updateQuestion(id: string, field: keyof Question, value: any) { setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q)) }
  function removeQuestion(id: string) { if (questions.length <= 4) return; setQuestions(questions.filter(q => q.id !== id)) }
  function addOption(qid: string) { setQuestions(questions.map(q => q.id === qid ? { ...q, options: [...q.options, ''] } : q)) }
  function updateOption(qid: string, i: number, val: string) { setQuestions(questions.map(q => q.id === qid ? { ...q, options: q.options.map((o, j) => j === i ? val : o) } : q)) }
  function removeOption(qid: string, i: number) { setQuestions(questions.map(q => q.id === qid ? { ...q, options: q.options.filter((_, j) => j !== i) } : q)) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {questions.map((q, i) => (
        <div key={q.id} style={{ background: '#F5F7FA', borderRadius: 10, padding: 16, border: '1px solid #E8EDF8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 600 }}>Question {i + 1}</span>
            {questions.length > 4 && <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>Remove</button>}
          </div>
          <input type="text" value={q.question_text} onChange={e => updateQuestion(q.id, 'question_text', e.target.value)} placeholder="e.g. What is your main goal?" style={{ ...inputStyle, marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['text', 'select'] as QuestionType[]).map(type => (
              <button key={type} onClick={() => updateQuestion(q.id, 'question_type', type)}
                style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${q.question_type === type ? '#7C5CFC' : '#E8EDF8'}`, background: q.question_type === type ? '#EDE9FE' : '#fff', color: q.question_type === type ? '#7C5CFC' : '#94A3B8' }}>
                {type === 'text' ? 'Open answer' : 'Multiple choice'}
              </button>
            ))}
          </div>
          {q.question_type === 'select' && (
            <div>
              {q.options.map((opt, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input type="text" value={opt} onChange={e => updateOption(q.id, j, e.target.value)} placeholder={`Option ${j + 1}`} style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid #E8EDF8', fontSize: 12, outline: 'none' }} />
                  <button onClick={() => removeOption(q.id, j)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>x</button>
                </div>
              ))}
              <button onClick={() => addOption(q.id)} style={{ fontSize: 11, color: '#7C5CFC', background: 'none', border: '1px dashed #C4B5FD', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>+ Add option</button>
            </div>
          )}
        </div>
      ))}
      <button onClick={addQuestion} style={{ padding: '10px', borderRadius: 10, border: '1px dashed #C4B5FD', background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}>+ Add question</button>
    </div>
  )
}

interface Props {
  expertId: string
  expertName: string
  expert: any
  userEmail: string
  isGoogleUser: boolean
  totalOrders: number
  plansGenerated: number
  hasInstallation: boolean
}

export default function ShopifyDashboard({ expertId, expertName, expert, userEmail, isGoogleUser, totalOrders, plansGenerated, hasInstallation }: Props) {
  const router = useRouter()
  const [installation, setInstallation] = useState<any>(null)
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [shopInput, setShopInput] = useState('')
  const [connectingShop, setConnectingShop] = useState(false)
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null)
  const [savingProduct, setSavingProduct] = useState<string | null>(null)
  const [uploadingPdf, setUploadingPdf] = useState<string | null>(null)
  const [productQuestions, setProductQuestions] = useState<Record<string, Question[]>>({})
  const [productPlanType, setProductPlanType] = useState<Record<string, 'weekly' | 'guide'>>({})
  const [productDuration, setProductDuration] = useState<Record<string, number>>({})
  const [syncingProducts, setSyncingProducts] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'method' | 'products' | 'customers' | 'orders' | 'analytics' | 'settings'>('overview')
  const [disconnecting, setDisconnecting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  // Settings state — brand-first
  const [brandName, setBrandName] = useState(expert?.name || '')
  const [profileCategory, setProfileCategory] = useState(expert?.category || 'Wellness')
  const [profileEmail, setProfileEmail] = useState(userEmail)
  const [profilePassword, setProfilePassword] = useState('')
  const [profileConfirmPassword, setProfileConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [methodCategory, setMethodCategory] = useState(expert?.category || 'Wellness')
  const [savingMethodCategory, setSavingMethodCategory] = useState(false)
  const [methodCategoryMsg, setMethodCategoryMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [brandQuestions, setBrandQuestions] = useState<Question[]>([])
  const [savingBrandQuestions, setSavingBrandQuestions] = useState(false)
  const [brandQuestionsMsg, setBrandQuestionsMsg] = useState<{ type: "success" | "error", text: string } | null>(null)
  const [journeySettings, setJourneySettings] = useState({ checkin_frequency_days: 7, max_journey_weeks: 8, abandonment_days: 21, reengage_email: true, program_duration_weeks: 8, after_completion: 'stop' })
  const [savingJourney, setSavingJourney] = useState(false)
  const [journeyMsg, setJourneyMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => { loadData() }, [])
  useEffect(() => { if (brandQuestions.length === 0) { loadBrandQuestions() } }, [activeTab])
  useEffect(() => { if (activeTab === 'settings') { loadJourneySettings() } }, [activeTab])

  async function loadData() {
    setLoading(true)
    const { data: inst } = await supabase.from('shopify_installations').select('*').eq('expert_id', expertId).maybeSingle()
    setInstallation(inst)
    // Auto-popola brand name dallo store Shopify se disponibile
    if (inst?.shop_name && !brandName) setBrandName(inst.shop_name)
    if (inst) {
      const { data: prods } = await supabase.from('shopify_products').select('*').eq('shop', inst.shop_domain).is('archived_at', null).order('created_at', { ascending: false })
      setProducts(prods || [])
      const questions: Record<string, Question[]> = {}
      const planTypes: Record<string, 'weekly' | 'guide'> = {}
      const durations: Record<string, number> = {}
      for (const p of prods || []) {
        questions[p.shopify_product_id] = p.questions?.length > 0 ? p.questions : [
          { id: crypto.randomUUID(), question_text: '', question_type: 'text', options: [] },
          { id: crypto.randomUUID(), question_text: '', question_type: 'text', options: [] },
          { id: crypto.randomUUID(), question_text: '', question_type: 'text', options: [] },
          { id: crypto.randomUUID(), question_text: '', question_type: 'text', options: [] },
        ]
        planTypes[p.shopify_product_id] = p.plan_type || 'weekly'
        durations[p.shopify_product_id] = p.duration_weeks || 4
      }
      setProductQuestions(questions)
      setProductPlanType(planTypes)
      setProductDuration(durations)
      const { data: ords } = await supabase.from('shopify_orders').select('*').eq('shop_domain', inst.shop_domain).order('created_at', { ascending: false }).limit(20)
      setOrders(ords || [])
    }
    setLoading(false)
  }

  async function handleSignOut() {
    setSigningOut(true)
    await supabase.auth.signOut()
    router.push('/shopify/login')
  }

  async function handleDisconnectStore() {
    if (!installation) return
    if (!confirm('Are you sure you want to disconnect your store? This will remove all synced products.')) return
    setDisconnecting(true)
    await supabase.from('shopify_installations').delete().eq('id', installation.id)
    setInstallation(null); setProducts([]); setOrders([])
    setDisconnecting(false)
  }

  function handleConnectShop() {
    let shop = shopInput.trim()
    if (!shop) return
    if (!shop.includes('.myshopify.com')) shop = `${shop}.myshopify.com`
    setConnectingShop(true)
    window.location.href = `/api/shopify/install?shop=${shop}&expert_id=${expertId}`
  }

  async function handleSyncProducts() {
    if (!installation) return
    setSyncingProducts(true)
    const res = await fetch('/api/shopify/sync-products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop: installation.shop_domain }) })
    const json = await res.json()
    if (json.ok) await loadData()
    setSyncingProducts(false)
  }

  async function handleUploadPdf(shopifyProductId: string, file: File) {
    if (!installation) return
    setUploadingPdf(shopifyProductId)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setUploadingPdf(null); return }
    const formData = new FormData()
    formData.append('file', file)
    formData.append('shopify_product_id', shopifyProductId)
    formData.append('shop', installation.shop_domain)
    const res = await fetch('/api/shopify/upload-pdf', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` }, body: formData })
    const json = await res.json()
    if (json.ok) await loadData()
    setUploadingPdf(null)
  }

  async function handleSaveProduct(shopifyProductId: string) {
    if (!installation) return
    setSavingProduct(shopifyProductId)
    const questions = productQuestions[shopifyProductId] || []
    const validQuestions = questions.filter(q => q.question_text.trim())
    await supabase.from('shopify_products').update({ questions: validQuestions, plan_type: productPlanType[shopifyProductId] || 'weekly', duration_weeks: productDuration[shopifyProductId] || 4, updated_at: new Date().toISOString() }).eq('shop', installation.shop_domain).eq('shopify_product_id', shopifyProductId)
    setSavingProduct(null)
    await loadData()
  }

  async function handleSaveProfile() {
    setProfileMsg(null)
    if (!brandName.trim()) { setProfileMsg({ type: 'error', text: 'Brand name is required.' }); return }
    if (profilePassword && profilePassword.length < 6) { setProfileMsg({ type: 'error', text: 'Password must be at least 6 characters.' }); return }
    if (profilePassword && profilePassword !== profileConfirmPassword) { setProfileMsg({ type: 'error', text: 'Passwords do not match.' }); return }
    setSavingProfile(true)
    const body: Record<string, any> = { name: brandName, category: profileCategory }
    if (profileEmail.trim() !== userEmail) body.email = profileEmail.trim()
    if (profilePassword) body.password = profilePassword
    const res = await fetch('/api/shopify/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const json = await res.json()
    setSavingProfile(false)
    if (!res.ok) { setProfileMsg({ type: 'error', text: json.error || 'Error saving profile.' }); return }
    setMethodCategory(profileCategory)
    setProfileMsg({ type: 'success', text: json.emailChanged ? 'Profile saved. Check your new email to confirm the address change.' : 'Profile saved successfully.' })
    setProfilePassword('')
    setProfileConfirmPassword('')
  }

  async function handleSaveMethodCategory() {
    setSavingMethodCategory(true)
    setMethodCategoryMsg(null)
    const res = await fetch('/api/shopify/update-profile', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ category: methodCategory }) })
    const json = await res.json()
    setSavingMethodCategory(false)
    if (!res.ok) { setMethodCategoryMsg({ type: 'error', text: json.error || 'Error saving category.' }) }
    else { setProfileCategory(methodCategory); setMethodCategoryMsg({ type: 'success', text: 'Category saved.' }); setTimeout(() => setMethodCategoryMsg(null), 3000) }
  }

  async function loadJourneySettings() {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await supabase.from('merchant_profiles').select('checkin_frequency_days, max_journey_weeks, abandonment_days, reengage_email').eq('merchant_id', expertId).maybeSingle()
    if (data) setJourneySettings({ checkin_frequency_days: (data as any).checkin_frequency_days || 7, max_journey_weeks: (data as any).max_journey_weeks || 8, abandonment_days: (data as any).abandonment_days || 21, reengage_email: (data as any).reengage_email !== false, program_duration_weeks: (data as any).program_duration_weeks || 8, after_completion: (data as any).after_completion || 'stop' })
  }

  async function saveJourneySettings() {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    setSavingJourney(true)
    const { error } = await supabase.from('merchant_profiles').update(journeySettings).eq('merchant_id', expertId)
    setJourneyMsg(error ? { type: 'error', text: 'Error saving.' } : { type: 'success', text: 'Journey settings saved!' })
    setSavingJourney(false)
    setTimeout(() => setJourneyMsg(null), 3000)
  }

  async function loadBrandQuestions() {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data } = await supabase.from('merchant_profiles').select('customer_questions, customer').eq('merchant_id', expertId).maybeSingle()
    if (data && data.customer_questions && data.customer_questions.length > 0) {
      setBrandQuestions(data.customer_questions)
      return
    }
    const cat = (expert?.category || 'Skincare').replace(' ', '')
    const defaults: Record<string, any[]> = {
      Skincare: [
        { id: '1', question_text: 'What is your skin type?', question_type: 'select', options: ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive'] },
        { id: '2', question_text: 'What are your main skin concerns?', question_type: 'select', options: ['Hydration', 'Anti-aging', 'Brightening', 'Acne', 'Redness', 'Uneven texture'] },
        { id: '3', question_text: 'Any known sensitivities or allergies?', question_type: 'text' },
        { id: '4', question_text: 'How would you describe your current routine?', question_type: 'select', options: ['No routine', 'Basic 2-3 steps', 'Full routine 5+ steps'] },
        { id: '5', question_text: 'How much time can you dedicate to your skincare routine daily?', question_type: 'select', options: ['Under 2 minutes', '2-5 minutes', '5-10 minutes', '10+ minutes'] },
        { id: '6', question_text: 'What is your age range?', question_type: 'select', options: ['Under 18', '18-24', '25-34', '35-44', '45-54', '55+'] },
      ],
      Fitness: [
        { id: '1', question_text: 'What is your main fitness goal?', question_type: 'select', options: ['Lose weight', 'Build muscle', 'Improve endurance', 'Stay active'] },
        { id: '2', question_text: 'What is your current fitness level?', question_type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'] },
        { id: '3', question_text: 'How many days per week can you train?', question_type: 'select', options: ['2-3 days', '4-5 days', '6-7 days'] },
        { id: '4', question_text: 'Where do you usually train?', question_type: 'select', options: ['Home', 'Gym', 'Outdoors', 'Mixed'] },
        { id: '5', question_text: 'Any injuries or limitations we should know about?', question_type: 'text' },
      ],
      Nutrition: [
        { id: '1', question_text: 'What is your main nutrition goal?', question_type: 'select', options: ['Lose weight', 'Gain muscle', 'Improve energy', 'Eat healthier'] },
        { id: '2', question_text: 'Do you follow any specific diet?', question_type: 'select', options: ['No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free'] },
        { id: '3', question_text: 'Any food allergies?', question_type: 'text' },
        { id: '4', question_text: 'How active are you daily?', question_type: 'select', options: ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'] },
        { id: '5', question_text: 'What is your biggest nutrition challenge?', question_type: 'select', options: ['Portion control', 'Cravings', 'Meal planning', 'Lack of energy', 'Consistency', 'Other'] },
      ],
      Wellness: [
        { id: '1', question_text: 'What is your main wellness goal?', question_type: 'select', options: ['Better sleep', 'More energy', 'Less stress', 'Better focus', 'Overall wellbeing'] },
        { id: '2', question_text: 'How would you rate your stress level?', question_type: 'select', options: ['Low', 'Moderate', 'High', 'Very high'] },
        { id: '3', question_text: 'How many hours do you sleep on average?', question_type: 'select', options: ['Less than 5', '5-6 hours', '6-7 hours', '7-8 hours', '8+ hours'] },
        { id: '4', question_text: 'How much time can you dedicate daily to wellness habits?', question_type: 'select', options: ['5 min', '10 min', '20 min', '30+ min'] },
        { id: '5', question_text: 'What habit would you most like to improve?', question_type: 'select', options: ['Sleep', 'Hydration', 'Stress management', 'Exercise', 'Mindfulness'] },
      ],
      MentalCoaching: [
        { id: '1', question_text: 'What is your primary goal?', question_type: 'select', options: ['Confidence', 'Productivity', 'Focus', 'Motivation', 'Emotional resilience'] },
        { id: '2', question_text: 'How often do you feel overwhelmed?', question_type: 'select', options: ['Rarely', 'Sometimes', 'Often', 'Very often'] },
        { id: '3', question_text: 'What is your biggest current challenge?', question_type: 'select', options: ['Stress', 'Procrastination', 'Low motivation', 'Work-life balance', 'Self-confidence'] },
        { id: '4', question_text: 'How much time can you dedicate daily?', question_type: 'select', options: ['5 min', '10 min', '20 min', '30+ min'] },
        { id: '5', question_text: 'What outcome would make this program successful for you?', question_type: 'text' },
      ],
    }
    setBrandQuestions(defaults[cat] || defaults.Skincare)
  }

  async function saveBrandQuestions() {
    const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    setSavingBrandQuestions(true)
    const { error } = await supabase.from('merchant_profiles').update({ customer_questions: brandQuestions }).eq('merchant_id', expertId)
    setBrandQuestionsMsg(error ? { type: 'error', text: 'Error saving.' } : { type: 'success', text: 'Questions saved!' })
    setSavingBrandQuestions(false)
    setTimeout(() => setBrandQuestionsMsg(null), 3000)
  }

  async function loadAnalytics() {
    if (analyticsData) return
    setLoadingAnalytics(true)
    const res = await fetch('/api/shopify/analytics')
    const json = await res.json()
    if (json.ok) setAnalyticsData(json)
    setLoadingAnalytics(false)
  }

  const hasQuestionsOnAnyProduct = brandQuestions.filter((q: Question) => q.question_text?.trim()).length >= 4
  const onboardingSteps = [
    { label: 'App installed', done: true },
    { label: 'Connect your Shopify store', done: !!installation },
    { label: 'Configure buyer questions', done: hasQuestionsOnAnyProduct },
  ]
  const onboardingComplete = onboardingSteps.every(s => s.done)
  const onboardingProgress = onboardingSteps.filter(s => s.done).length

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '16px 0 0', gap: 8 }}>
            <div>
              <a href="/shopify/home" style={{ textDecoration: 'none' }}>
                <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A' }}>malyte<span style={{ color: '#7C5CFC' }}>.</span></span>
              </a>
              <p style={{ color: '#94A3B8', fontSize: 12, margin: '2px 0 0' }}>Shopify App · {brandName || expertName}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {installation && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#D1FDF3', border: '1px solid #6EE7B7', padding: '3px 8px', borderRadius: 100, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>✓ {installation.shop_domain}</span>}
              <button onClick={handleSignOut} disabled={signingOut} style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', opacity: signingOut ? 0.7 : 1 }}>
                {signingOut ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 0, marginTop: 16, overflowX: 'auto' }}>
            {[{ label: 'Overview', value: 'overview' }, { label: 'Questions', value: 'method' }, { label: 'Products', value: 'products' }, { label: 'Customers', value: 'customers' }, { label: 'Orders', value: 'orders' }, { label: 'Analytics', value: 'analytics' }, { label: 'Settings', value: 'settings' }].map(t => (
              <button key={t.value} onClick={() => setActiveTab(t.value as any)}
                style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', color: activeTab === t.value ? '#7C5CFC' : '#94A3B8', borderBottom: activeTab === t.value ? '2px solid #7C5CFC' : '2px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 24px 64px' }}>

        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[{ label: 'Total orders', value: String(orders.length || totalOrders), color: '#7C5CFC', bg: '#EDE9FE' }, { label: 'Plans generated', value: String(orders.filter((o: any) => o.status === 'plan_generated').length || plansGenerated), color: '#059669', bg: '#D1FDF3' }, { label: 'Products configured', value: String(products.length), color: '#6385FF', bg: '#EEF2FF' }].map((kpi, i) => (
                <div key={i} style={{ background: kpi.bg, borderRadius: 12, padding: '16px' }}>
                  <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>{kpi.label}</p>
                  <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 28, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
                </div>
              ))}
            </div>
            {!onboardingComplete && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: '0 0 2px' }}>Getting started</p>
                    <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>{onboardingProgress} of {onboardingSteps.length} steps completed</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#7C5CFC' }}>{Math.round((onboardingProgress / onboardingSteps.length) * 100)}%</span>
                </div>
                <div style={{ height: 4, background: '#E8EDF8', borderRadius: 100, marginBottom: 20 }}>
                  <div style={{ height: '100%', width: `${(onboardingProgress / onboardingSteps.length) * 100}%`, background: '#7C5CFC', borderRadius: 100 }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {onboardingSteps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: step.done ? '#7C5CFC' : '#F1F5F9', border: `2px solid ${step.done ? '#7C5CFC' : '#E8EDF8'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {step.done ? <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>v</span> : <span style={{ color: '#CBD5E1', fontSize: 10, fontWeight: 700 }}>{i + 1}</span>}
                      </div>
                      <span style={{ fontSize: 13, color: step.done ? '#64748B' : '#0F172A', fontWeight: step.done ? 400 : 600, textDecoration: step.done ? 'line-through' : 'none' }}>{step.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {onboardingComplete && (
              <div style={{ ...card, background: '#F0FDF4', border: '1px solid #6EE7B7' }}>
                <p style={{ fontWeight: 700, fontSize: 14, color: '#059669', margin: '0 0 4px' }}>You are all set!</p>
                <p style={{ fontSize: 13, color: '#065F46', margin: 0 }}>Your Malyte app is fully configured.</p>
              </div>
            )}
            {!installation && (
              <div style={card}>
                <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Connect your store</p>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>Enter your Shopify store URL to connect it to Malyte.</p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input type="text" value={shopInput} onChange={e => setShopInput(e.target.value)} placeholder="your-store.myshopify.com" style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleConnectShop()} />
                  <button onClick={handleConnectShop} disabled={connectingShop || !shopInput.trim()} style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: connectingShop ? 0.7 : 1 }}>
                    {connectingShop ? 'Connecting…' : 'Connect'}
                  </button>
                </div>
              </div>
            )}
            {orders.length > 0 && (
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: 0 }}>Recent orders</p>
                  <button onClick={() => setActiveTab('orders')} style={{ fontSize: 12, color: '#7C5CFC', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View all</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orders.slice(0, 3).map((order: any) => (
                    <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', margin: '0 0 2px' }}>{order.buyer_email || 'Unknown buyer'}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: order.status === 'plan_generated' ? '#D1FDF3' : order.status === 'questionnaire_done' ? '#EDE9FE' : '#FEF3C7', color: order.status === 'plan_generated' ? '#059669' : order.status === 'questionnaire_done' ? '#7C5CFC' : '#D97706' }}>
                        {order.status === 'plan_generated' ? 'Plan generated' : order.status === 'questionnaire_done' ? 'Questionnaire done' : 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'method' && (
          <>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Your category</p>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>Select the category that best describes your expertise.</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                {CATEGORIES.map(cat => (
                  <button key={cat} onClick={() => setMethodCategory(cat)}
                    style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${methodCategory === cat ? '#7C5CFC' : '#E8EDF8'}`, background: methodCategory === cat ? '#EDE9FE' : '#F8FAFC', color: methodCategory === cat ? '#7C5CFC' : '#64748B' }}>
                    {cat}
                  </button>
                ))}
              </div>
              {methodCategoryMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 12, background: methodCategoryMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${methodCategoryMsg.type === 'success' ? '#6EE7B7' : '#FECACA'}`, color: methodCategoryMsg.type === 'success' ? '#059669' : '#EF4444', fontSize: 13 }}>
                  {methodCategoryMsg.text}
                </div>
              )}
              <button onClick={handleSaveMethodCategory} disabled={savingMethodCategory} style={{ padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingMethodCategory ? 0.7 : 1 }}>
                {savingMethodCategory ? 'Saving…' : 'Save category'}
              </button>
            </div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Customer quiz questions</p>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>These are the questions your customers answer before getting their plan. Changes take effect immediately on your quiz page.</p>
              {brandQuestions.length === 0 ? (
                <button onClick={loadBrandQuestions} style={{ padding: '10px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, background: '#F8FAFC', border: '1px solid #E8EDF8', color: '#64748B', cursor: 'pointer' }}>Load current questions</button>
              ) : (
                <>
                  <QuestionBuilder questions={brandQuestions} setQuestions={setBrandQuestions} />
                  {brandQuestionsMsg && (
                    <div style={{ padding: '10px 14px', borderRadius: 8, margin: '12px 0', background: brandQuestionsMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: '1px solid ' + (brandQuestionsMsg.type === 'success' ? '#6EE7B7' : '#FECACA'), color: brandQuestionsMsg.type === 'success' ? '#059669' : '#EF4444', fontSize: 13 }}>
                      {brandQuestionsMsg.text}
                    </div>
                  )}
                  <button onClick={saveBrandQuestions} disabled={savingBrandQuestions} style={{ marginTop: 12, padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingBrandQuestions ? 0.7 : 1 }}>
                    {savingBrandQuestions ? 'Saving…' : 'Save questions'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'products' && (
          <>
            {installation && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                <button onClick={handleSyncProducts} disabled={syncingProducts} style={{ padding: '9px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', opacity: syncingProducts ? 0.7 : 1 }}>
                  {syncingProducts ? 'Syncing…' : 'Sync products'}
                </button>
              </div>
            )}
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Products ({products.length})</p>
              {!installation ? (
                <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>Connect your Shopify store first to sync products.</p>
              ) : products.length === 0 ? (
                <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No products yet. Click "Sync products" to import from Shopify.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {products.map(product => {
                    const isExpanded = expandedProduct === product.shopify_product_id
                    const hasPdf = !!product.pdf_path
                    const hasQuestions = (productQuestions[product.shopify_product_id] || []).filter((q: Question) => q.question_text.trim()).length >= 4
                    const isReady = hasPdf && hasQuestions
                    return (
                      <div key={product.shopify_product_id} style={{ border: `1px solid ${isReady ? '#6EE7B7' : '#E8EDF8'}`, borderRadius: 12, overflow: 'hidden' }}>
                        <div onClick={() => setExpandedProduct(isExpanded ? null : product.shopify_product_id)} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isReady ? '#F0FDF4' : '#F8FAFC' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div>
                              <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', margin: '0 0 2px' }}>{product.shopify_product_title}</p>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {false && <span style={{ fontSize: 11, color: hasPdf ? '#059669' : '#EF4444' }}>{hasPdf ? 'PDF ok' : 'No PDF'}</span>}
                                {false && <span style={{ fontSize: 11, color: hasQuestions ? '#059669' : '#EF4444' }}>{hasQuestions ? 'Questions ok' : 'Questions needed'}</span>}
                              </div>
                            </div>
                          </div>
                          <span style={{ color: '#94A3B8', fontSize: 12 }}>{isExpanded ? 'v' : '>'}</span>
                        </div>
                        {isExpanded && (
                          <div style={{ padding: '20px 16px', borderTop: '1px solid #E8EDF8' }}>
                            <div style={{ marginBottom: 20 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 10 }}>PLAN TYPE</label>
                              <div style={{ display: 'flex', gap: 10 }}>
                                {[{ value: 'weekly', label: 'Weekly plan', desc: 'New plan every week with check-ins' }, { value: 'guide', label: 'One-time guide', desc: 'Personalized guide, no expiry' }].map(opt => (
                                  <button key={opt.value} type="button" onClick={() => setProductPlanType(prev => ({ ...prev, [product.shopify_product_id]: opt.value as 'weekly' | 'guide' }))}
                                    style={{ flex: 1, padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer', border: `1px solid ${productPlanType[product.shopify_product_id] === opt.value ? '#7C5CFC' : '#E8EDF8'}`, background: productPlanType[product.shopify_product_id] === opt.value ? '#EDE9FE' : '#F8FAFC' }}>
                                    <div style={{ fontWeight: 600, fontSize: 12, color: productPlanType[product.shopify_product_id] === opt.value ? '#7C5CFC' : '#0F172A', marginBottom: 2 }}>{opt.label}</div>
                                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{opt.desc}</div>
                                  </button>
                                ))}
                              </div>
                            </div>
                            {productPlanType[product.shopify_product_id] === 'weekly' && (
                              <div style={{ marginBottom: 20 }}>
                                <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 10 }}>DURATION (weeks)</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  {[4, 8, 12, 16, 24].map(w => (
                                    <button key={w} type="button" onClick={() => setProductDuration(prev => ({ ...prev, [product.shopify_product_id]: w }))}
                                      style={{ padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${productDuration[product.shopify_product_id] === w ? '#7C5CFC' : '#E8EDF8'}`, background: productDuration[product.shopify_product_id] === w ? '#EDE9FE' : '#F5F7FA', color: productDuration[product.shopify_product_id] === w ? '#7C5CFC' : '#94A3B8' }}>
                                      {w}w
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {/* PDF PLAN nascosto per i Brand: la routine si genera dai prodotti acquistati, il PDF non serve. Codice mantenuto per Practitioner/PDF Seller (dormienti). */}
                            {false && (
                            <div style={{ marginBottom: 20 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 10 }}>PDF PLAN</label>
                              {hasPdf && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #6EE7B7', marginBottom: 10 }}>
                                  <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>PDF uploaded</span>
                                </div>
                              )}
                              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '2px dashed #E8EDF8', borderRadius: 10, cursor: 'pointer', background: '#F8FAFC' }}>
                                <input type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPdf(product.shopify_product_id, f) }} />
                                <span style={{ fontSize: 13, color: uploadingPdf === product.shopify_product_id ? '#94A3B8' : '#7C5CFC', fontWeight: 600 }}>{uploadingPdf === product.shopify_product_id ? 'Uploading…' : hasPdf ? 'Replace PDF' : '+ Upload PDF'}</span>
                              </label>
                            </div>
                            )}
                            <div style={{ marginBottom: 20 }}>
                              <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>BUYER QUESTIONS (min 4)</label>
                              <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>These questions are shown to buyers before their plan is generated.</p>
                              <QuestionBuilder questions={productQuestions[product.shopify_product_id] || []} setQuestions={(qs: Question[]) => setProductQuestions(prev => ({ ...prev, [product.shopify_product_id]: qs }))} />
                            </div>
                            <button onClick={() => handleSaveProduct(product.shopify_product_id)} disabled={savingProduct === product.shopify_product_id}
                              style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingProduct === product.shopify_product_id ? 0.7 : 1 }}>
                              {savingProduct === product.shopify_product_id ? 'Saving…' : 'Save product settings'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'customers' && (
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 16px' }}>Customers ({orders.length})</p>
            {orders.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <p style={{ color: '#94A3B8', fontSize: 14, marginBottom: 6 }}>No customers yet.</p>
                <p style={{ color: '#CBD5E1', fontSize: 12 }}>Customers will appear here once they purchase a product from your Shopify store.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map((order: any) => {
                  const product = products.find(p => p.shopify_product_id === order.shopify_product_id)
                  const initials = order.buyer_email ? order.buyer_email.slice(0, 2).toUpperCase() : '?'
                  return (
                    <div key={order.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8' }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #7C5CFC, #4DFFD2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: '#fff' }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.buyer_email || 'Unknown'}</p>
                        <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{product?.shopify_product_title || 'Product'} · {new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: order.status === 'plan_generated' ? '#D1FDF3' : order.status === 'questionnaire_done' ? '#EDE9FE' : '#FEF3C7', color: order.status === 'plan_generated' ? '#059669' : order.status === 'questionnaire_done' ? '#7C5CFC' : '#D97706' }}>
                          {order.status === 'plan_generated' ? 'Plan ready' : order.status === 'questionnaire_done' ? 'Questionnaire done' : 'Pending'}
                        </span>
                        {order.token && (
                          <a href={`/plan/${order.token}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '4px 12px', borderRadius: 100, border: '1px solid #C4B5FD' }}>View plan</a>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Orders ({orders.length})</p>
            {orders.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No orders yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.map((order: any) => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', margin: '0 0 2px' }}>{order.buyer_email || 'Unknown buyer'}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: order.status === 'plan_generated' ? '#D1FDF3' : order.status === 'questionnaire_done' ? '#EDE9FE' : '#FEF3C7', color: order.status === 'plan_generated' ? '#059669' : order.status === 'questionnaire_done' ? '#7C5CFC' : '#D97706' }}>
                      {order.status === 'plan_generated' ? 'Plan generated' : order.status === 'questionnaire_done' ? 'Questionnaire done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <AnalyticsTab data={analyticsData} loading={loadingAnalytics} onLoad={loadAnalytics} />
        )}

        {activeTab === 'settings' && (
          <>
            <div style={{ ...card, border: '2px solid #7C5CFC', background: 'linear-gradient(135deg, #F5F3FF 0%, #EEF2FF 100%)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 24 }}>🔗</span>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', margin: 0 }}>Your pre-purchase quiz link</p>
                  <p style={{ fontSize: 12, color: '#64748B', margin: '2px 0 0' }}>Share it anywhere — customers answer a few questions and get a personalised routine with your products</p>
                </div>
              </div>
              <div style={{ background: '#fff', borderRadius: 10, padding: '12px 16px', marginBottom: 12, fontSize: 12, color: '#64748B', lineHeight: 1.8, border: '1px solid #DDD6FE' }}>
                <strong style={{ color: '#7C5CFC' }}>How to share it:</strong><br/>
                {'• Add a "Find your routine" button on your Shopify homepage'}<br/>
                {'• Put the link in your Instagram or TikTok bio'}<br/>
                {'• Include it in your email campaigns or newsletters'}<br/>
                {'• Add it to your store navigation menu'}
              </div>
              {expert?.slug ? (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #DDD6FE', fontSize: 12, color: '#0F172A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                      {(`https://app.malyte.com/start/` + expert.slug)}
                    </div>
                    <button onClick={() => { navigator.clipboard.writeText(`https://app.malyte.com/start/` + expert.slug); alert('Copied!') }}
                      style={{ padding: '10px 18px', borderRadius: 10, fontWeight: 700, fontSize: 12, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                      Copy link
                    </button>
                  </div>
                  <a href={'/start/' + expert.slug} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 12, color: '#7C5CFC', textDecoration: 'none', fontWeight: 600 }}>
                    Preview quiz →
                  </a>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Quiz link will appear here once your profile is set up.</p>
              )}
            </div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 20 }}>Profile</p>

              {/* Brand name — auto-popolato da Shopify */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>BRAND NAME</label>
                <input type="text" value={brandName} onChange={e => setBrandName(e.target.value)} placeholder="Your brand name" style={inputStyle} />
                {installation?.shop_domain && (
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>Auto-populated from your Shopify store: {installation.shop_domain}</p>
                )}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>CATEGORY</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setProfileCategory(cat)}
                      style={{ padding: '7px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${profileCategory === cat ? '#7C5CFC' : '#E8EDF8'}`, background: profileCategory === cat ? '#EDE9FE' : '#F8FAFC', color: profileCategory === cat ? '#7C5CFC' : '#64748B' }}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ height: 1, background: '#F1F5F9', margin: '20px 0' }} />

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>EMAIL</label>
                <input type="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="your@email.com" style={inputStyle} />
                {profileEmail.trim() !== userEmail && (
                  <p style={{ fontSize: 11, color: '#F59E0B', margin: '6px 0 0' }}>You will receive a confirmation email to verify the new address.</p>
                )}
              </div>

              {!isGoogleUser ? (
                <>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>NEW PASSWORD</label>
                    <input type="password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} placeholder="Leave blank to keep current password" style={inputStyle} />
                  </div>
                  {profilePassword && (
                    <div style={{ marginBottom: 14 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>CONFIRM NEW PASSWORD</label>
                      <input type="password" value={profileConfirmPassword} onChange={e => setProfileConfirmPassword(e.target.value)} placeholder="Repeat new password" style={inputStyle} />
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, border: '1px solid #E8EDF8', marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: '#94A3B8', margin: 0 }}>Password change is not available for Google accounts.</p>
                </div>
              )}

              {profileMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, marginBottom: 14, background: profileMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${profileMsg.type === 'success' ? '#6EE7B7' : '#FECACA'}`, color: profileMsg.type === 'success' ? '#059669' : '#EF4444', fontSize: 13 }}>
                  {profileMsg.text}
                </div>
              )}

              <button onClick={handleSaveProfile} disabled={savingProfile}
                style={{ width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingProfile ? 0.7 : 1 }}>
                {savingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>

            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Journey settings</p>
              <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>Configure how your customers experience their personalised journey.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>CHECK-IN FREQUENCY</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[{ label: 'Every 7 days', value: 7 }, { label: 'Every 14 days', value: 14 }, { label: 'Every 30 days', value: 30 }].map(opt => (
                      <button key={opt.value} onClick={() => setJourneySettings(prev => ({ ...prev, checkin_frequency_days: opt.value }))}
                        style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${journeySettings.checkin_frequency_days === opt.value ? '#7C5CFC' : '#E8EDF8'}`, background: journeySettings.checkin_frequency_days === opt.value ? '#EDE9FE' : '#F8FAFC', color: journeySettings.checkin_frequency_days === opt.value ? '#7C5CFC' : '#64748B' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>Skincare/Fitness: 7 days · Supplements/Haircare: 14 days · Wellness: 30 days</p>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>ABANDONMENT WINDOW</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[{ label: '14 days', value: 14 }, { label: '21 days', value: 21 }, { label: '30 days', value: 30 }].map(opt => (
                      <button key={opt.value} onClick={() => setJourneySettings(prev => ({ ...prev, abandonment_days: opt.value }))}
                        style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${journeySettings.abandonment_days === opt.value ? '#7C5CFC' : '#E8EDF8'}`, background: journeySettings.abandonment_days === opt.value ? '#EDE9FE' : '#F8FAFC', color: journeySettings.abandonment_days === opt.value ? '#7C5CFC' : '#64748B' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>Days without check-in before sending the pause email</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px' }}>Re-engagement email</p>
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Send "We've paused your journey" after abandonment window</p>
                  </div>
                  <button onClick={() => setJourneySettings(prev => ({ ...prev, reengage_email: !prev.reengage_email }))}
                    style={{ width: 44, height: 24, borderRadius: 100, border: 'none', cursor: 'pointer', background: journeySettings.reengage_email ? '#7C5CFC' : '#E8EDF8', position: 'relative', transition: 'background 0.2s' }}>
                    <span style={{ position: 'absolute', top: 2, left: journeySettings.reengage_email ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
                  </button>
                </div>
              </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>INITIAL PROGRAM DURATION</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[{ label: '4 weeks', value: 4 }, { label: '8 weeks', value: 8 }, { label: '12 weeks', value: 12 }, { label: 'No limit', value: 0 }].map(opt => (
                      <button key={opt.value} onClick={() => setJourneySettings(prev => ({ ...prev, program_duration_weeks: opt.value }))}
                        style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${journeySettings.program_duration_weeks === opt.value ? '#7C5CFC' : '#E8EDF8'}`, background: journeySettings.program_duration_weeks === opt.value ? '#EDE9FE' : '#F8FAFC', color: journeySettings.program_duration_weeks === opt.value ? '#7C5CFC' : '#64748B' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>Duration of the intensive program phase</p>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 8 }}>AFTER PROGRAM ENDS</label>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[{ label: 'Stop', value: 'stop' }, { label: 'Continue current frequency', value: 'continue' }, { label: 'Monthly follow-up', value: 'monthly' }, { label: 'Quarterly follow-up', value: 'quarterly' }].map(opt => (
                      <button key={opt.value} onClick={() => setJourneySettings(prev => ({ ...prev, after_completion: opt.value }))}
                        style={{ padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${journeySettings.after_completion === opt.value ? '#7C5CFC' : '#E8EDF8'}`, background: journeySettings.after_completion === opt.value ? '#EDE9FE' : '#F8FAFC', color: journeySettings.after_completion === opt.value ? '#7C5CFC' : '#64748B' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: '6px 0 0' }}>What happens when the program ends — Monthly: check-in every 30 days · Quarterly: every 90 days</p>
                </div>
              {journeyMsg && (
                <div style={{ padding: '10px 14px', borderRadius: 8, margin: '16px 0 0', background: journeyMsg.type === 'success' ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${journeyMsg.type === 'success' ? '#6EE7B7' : '#FECACA'}`, color: journeyMsg.type === 'success' ? '#059669' : '#EF4444', fontSize: 13 }}>
                  {journeyMsg.text}
                </div>
              )}
              <button onClick={saveJourneySettings} disabled={savingJourney} style={{ marginTop: 16, width: '100%', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', opacity: savingJourney ? 0.7 : 1 }}>
                {savingJourney ? 'Saving…' : 'Save journey settings'}
              </button>
            </div>
            <div style={card}>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Store settings</p>
              {installation ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: '#F0FDF4', borderRadius: 12, border: '1px solid #6EE7B7', marginBottom: 16 }}>
                    <span style={{ fontSize: 20 }}>v</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 13, color: '#059669', margin: '0 0 2px' }}>Store connected</p>
                      <p style={{ fontSize: 12, color: '#065F46', margin: 0 }}>{installation.shop_domain}</p>
                    </div>
                    <button onClick={handleDisconnectStore} disabled={disconnecting}
                      style={{ padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, border: '1px solid #FECACA', background: '#FEF2F2', color: '#EF4444', cursor: 'pointer', opacity: disconnecting ? 0.7 : 1 }}>
                      {disconnecting ? 'Disconnecting…' : 'Disconnect'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8' }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 4px', fontWeight: 600 }}>Subscription status</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', margin: 0, textTransform: 'capitalize' }}>{installation.subscription_status || 'pending'}</p>
                    </div>
                    <div style={{ flex: 1, padding: '14px 16px', background: '#F8FAFC', borderRadius: 12, border: '1px solid #E8EDF8' }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: '0 0 4px', fontWeight: 600 }}>Plan</p>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#7C5CFC', margin: 0 }}>Malyte Pro · $9.99/mo</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16 }}>Connect your Shopify store to get started.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <input type="text" value={shopInput} onChange={e => setShopInput(e.target.value)} placeholder="your-store.myshopify.com" style={{ ...inputStyle, flex: 1 }} onKeyDown={e => e.key === 'Enter' && handleConnectShop()} />
                    <button onClick={handleConnectShop} disabled={connectingShop || !shopInput.trim()} style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: connectingShop ? 0.7 : 1 }}>
                      {connectingShop ? 'Connecting…' : 'Connect'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

      </div>
    </div>
  )
}

function AnalyticsTab({ data, loading, onLoad }: { data: any, loading: boolean, onLoad: () => void }) {
  if (!data && !loading) { onLoad(); }

  if (loading || !data) return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <p style={{ color: '#94A3B8', fontSize: 14 }}>Loading analytics…</p>
    </div>
  )

  const { overview, funnel, recent_customers } = data

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Total customers', value: String(overview.total_customers), color: '#7C5CFC', bg: '#EDE9FE' },
          { label: 'Check-ins done', value: String(overview.completed_checkins), color: '#059669', bg: '#D1FDF3' },
          { label: 'Avg CSS', value: overview.avg_css > 0 ? Math.round(overview.avg_css * 100) + '%' : '—', color: '#6385FF', bg: '#EEF2FF' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: kpi.bg, borderRadius: 12, padding: '16px' }}>
            <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>{kpi.label}</p>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 28, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Plans generated', value: String(overview.total_plans), color: '#7C5CFC', bg: '#F5F3FF' },
          { label: 'Avg week', value: overview.avg_week > 0 ? 'W' + overview.avg_week : '—', color: '#D97706', bg: '#FEF3C7' },
          { label: 'Pending check-ins', value: String(overview.pending_checkins), color: '#64748B', bg: '#F8FAFC' },
        ].map((kpi, i) => (
          <div key={i} style={{ background: kpi.bg, borderRadius: 12, padding: '16px', border: '1px solid #E8EDF8' }}>
            <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>{kpi.label}</p>
            <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 24, fontWeight: 800, color: kpi.color, margin: 0 }}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Journey A Funnel</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Quiz completed', value: funnel.quiz_completed, color: '#7C5CFC' },
            { label: 'Plan generated', value: funnel.plan_generated, color: '#6385FF' },
            { label: 'Bundle generated', value: funnel.package_generated, color: '#06B6D4' },
            { label: 'Check-in completed', value: funnel.checkin_completed, color: '#059669' },
          ].map((step, i) => {
            const max = funnel.quiz_completed || 1
            const pct = Math.round((step.value / max) * 100)
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: '#64748B' }}>{step.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: step.color }}>{step.value} ({pct}%)</span>
                </div>
                <div style={{ height: 6, background: '#F1F5F9', borderRadius: 100 }}>
                  <div style={{ height: '100%', width: pct + '%', background: step.color, borderRadius: 100 }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {/* ── Revenue Attribution ── */}
      <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px', marginBottom: 16 }}>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Revenue Attribution</p>
        {!data.revenue || data.revenue.orders_influenced === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 4 }}>No attributed orders yet.</p>
            <p style={{ color: '#CBD5E1', fontSize: 12 }}>Orders from customers who completed a Malyte quiz will appear here.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Revenue Influenced', value: data.revenue.currency + ' ' + data.revenue.revenue_influenced.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 }), color: '#059669', bg: '#D1FDF3', sub: 'within 90 days of quiz' },
                { label: 'Orders Influenced', value: String(data.revenue.orders_influenced), color: '#7C5CFC', bg: '#EDE9FE', sub: data.revenue.orders_with_product_match + ' product match' },
                { label: 'Conversion Rate', value: data.revenue.conversion_rate + '%', color: '#6385FF', bg: '#EEF2FF', sub: 'customers who repurchased' },
              ].map((kpi, i) => (
                <div key={i} style={{ background: kpi.bg, borderRadius: 12, padding: '16px' }}>
                  <p style={{ fontSize: 10, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>{kpi.label}</p>
                  <p style={{ fontFamily: "'Satoshi', sans-serif", fontSize: 22, fontWeight: 800, color: kpi.color, margin: '0 0 4px' }}>{kpi.value}</p>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: 0 }}>{kpi.sub}</p>
                </div>
              ))}
            </div>
            {data.revenue.revenue_matched > 0 && (
              <div style={{ padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, border: '1px solid #6EE7B7', marginBottom: 12 }}>
                <p style={{ fontSize: 12, color: '#059669', fontWeight: 600, margin: '0 0 2px' }}>{data.revenue.currency} {data.revenue.revenue_matched.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} from recommended products</p>
                <p style={{ fontSize: 11, color: '#065F46', margin: 0 }}>Customers purchased exactly the products Malyte recommended</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {[
                { label: '≤ 30 days', value: data.revenue.window_breakdown['30d'] },
                { label: '31-60 days', value: data.revenue.window_breakdown['60d'] },
                { label: '61-90 days', value: data.revenue.window_breakdown['90d'] },
                { label: '> 90 days', value: data.revenue.window_breakdown['beyond'] },
              ].map((w, i) => (
                <div key={i} style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8', textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: '#94A3B8', margin: '0 0 4px' }}>{w.label}</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>{w.value}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {recent_customers?.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E8EDF8', padding: '20px' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>Recent customers</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recent_customers.map((customer: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7C5CFC, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
                  {customer.email?.slice(0, 2).toUpperCase() || '?'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email || 'Unknown'}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>Week {customer.current_week} · {customer.total_checkins} check-in{customer.total_checkins !== 1 ? 's' : ''}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: '#EDE9FE', color: '#7C5CFC' }}>W{customer.current_week}</span>
                  {customer.plan_token && (
                    <a href={'/routine/' + customer.plan_token} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, fontWeight: 600, color: '#7C5CFC', textDecoration: 'none', background: '#EDE9FE', padding: '3px 10px', borderRadius: 100 }}>
                      View →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
