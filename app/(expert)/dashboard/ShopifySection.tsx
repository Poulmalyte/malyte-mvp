'use client'

import { useState, useEffect } from 'react'
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

function QuestionBuilder({ questions, setQuestions }: {
  questions: Question[]
  setQuestions: (qs: Question[]) => void
}) {
  function addQuestion() {
    setQuestions([...questions, { id: crypto.randomUUID(), question_text: '', question_type: 'text', options: [] }])
  }
  function updateQuestion(id: string, field: keyof Question, value: any) {
    setQuestions(questions.map(q => q.id === id ? { ...q, [field]: value } : q))
  }
  function removeQuestion(id: string) {
    if (questions.length <= 4) return
    setQuestions(questions.filter(q => q.id !== id))
  }
  function addOption(qid: string) {
    setQuestions(questions.map(q => q.id === qid ? { ...q, options: [...q.options, ''] } : q))
  }
  function updateOption(qid: string, i: number, val: string) {
    setQuestions(questions.map(q => q.id === qid ? { ...q, options: q.options.map((o, j) => j === i ? val : o) } : q))
  }
  function removeOption(qid: string, i: number) {
    setQuestions(questions.map(q => q.id === qid ? { ...q, options: q.options.filter((_, j) => j !== i) } : q))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {questions.map((q, i) => (
        <div key={q.id} style={{ background: '#F5F7FA', borderRadius: 10, padding: 16, border: '1px solid #E8EDF8' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ color: '#7C5CFC', fontSize: 11, fontWeight: 600 }}>Question {i + 1}</span>
            {questions.length > 4 && (
              <button onClick={() => removeQuestion(q.id)} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 12, cursor: 'pointer' }}>Remove</button>
            )}
          </div>
          <input type="text" value={q.question_text} onChange={e => updateQuestion(q.id, 'question_text', e.target.value)}
            placeholder="e.g. What is your main goal?" style={{ ...input, marginBottom: 10 }} />
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            {(['text', 'select'] as QuestionType[]).map(type => (
              <button key={type} onClick={() => updateQuestion(q.id, 'question_type', type)}
                style={{ padding: '5px 12px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${q.question_type === type ? '#7C5CFC' : '#E8EDF8'}`,
                  background: q.question_type === type ? '#EDE9FE' : '#fff',
                  color: q.question_type === type ? '#7C5CFC' : '#94A3B8' }}>
                {type === 'text' ? '✏️ Open answer' : '☑️ Multiple choice'}
              </button>
            ))}
          </div>
          {q.question_type === 'select' && (
            <div>
              {q.options.map((opt, j) => (
                <div key={j} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                  <input type="text" value={opt} onChange={e => updateOption(q.id, j, e.target.value)}
                    placeholder={`Option ${j + 1}`}
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 7, border: '1px solid #E8EDF8', fontSize: 12, outline: 'none' }} />
                  <button onClick={() => removeOption(q.id, j)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button onClick={() => addOption(q.id)}
                style={{ fontSize: 11, color: '#7C5CFC', background: 'none', border: '1px dashed #C4B5FD', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
                + Add option
              </button>
            </div>
          )}
        </div>
      ))}
      <button onClick={addQuestion}
        style={{ padding: '10px', borderRadius: 10, border: '1px dashed #C4B5FD', background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer' }}>
        + Add question
      </button>
    </div>
  )
}

export default function ShopifySection({ expertId }: { expertId: string }) {
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

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: inst } = await supabase
      .from('shopify_installations')
      .select('*')
      .eq('expert_id', expertId)
      .maybeSingle()
    setInstallation(inst)

    if (inst) {
      const { data: prods } = await supabase
        .from('shopify_products')
        .select('*')
        .eq('shop_domain', inst.shop_domain)
        .order('created_at', { ascending: false })
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

      const { data: ords } = await supabase
        .from('shopify_orders')
        .select('*')
        .eq('shop', inst.shop_domain)
        .order('created_at', { ascending: false })
        .limit(20)
      setOrders(ords || [])
    }
    setLoading(false)
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
    const res = await fetch('/api/shopify/sync-products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shop: installation.shop_domain }),
    })
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

    const res = await fetch('/api/shopify/upload-pdf', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
      body: formData,
    })
    const json = await res.json()
    if (json.ok) await loadData()
    setUploadingPdf(null)
  }

  async function handleSaveProduct(shopifyProductId: string) {
    if (!installation) return
    setSavingProduct(shopifyProductId)
    const questions = productQuestions[shopifyProductId] || []
    const validQuestions = questions.filter(q => q.question_text.trim())

    await supabase
      .from('shopify_products')
      .update({
        questions: validQuestions,
        plan_type: productPlanType[shopifyProductId] || 'weekly',
        duration_weeks: productDuration[shopifyProductId] || 4,
        updated_at: new Date().toISOString(),
      })
      .eq('shop_domain', installation.shop_domain)
      .eq('shopify_product_id', shopifyProductId)

    setSavingProduct(null)
    await loadData()
  }

  if (loading) return <div style={{ color: '#94A3B8', fontSize: 13, padding: 24 }}>Loading…</div>

  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 22, color: '#0F172A', margin: '0 0 6px' }}>Shopify</h2>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Connect your Shopify store and configure your products.</p>
      </div>

      {!installation && (
        <div style={card}>
          <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Connect your store</p>
          <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
            Enter your Shopify store URL to connect it to Malyte. After connecting, you can configure each product with a PDF and buyer questions.
          </p>
          <div style={{ display: 'flex', gap: 10 }}>
            <input type="text" value={shopInput} onChange={e => setShopInput(e.target.value)}
              placeholder="your-store.myshopify.com"
              style={{ ...input, flex: 1 }}
              onKeyDown={e => e.key === 'Enter' && handleConnectShop()}
            />
            <button onClick={handleConnectShop} disabled={connectingShop || !shopInput.trim()}
              style={{ padding: '12px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', opacity: connectingShop ? 0.7 : 1 }}>
              {connectingShop ? 'Connecting…' : 'Connect →'}
            </button>
          </div>
        </div>
      )}

      {installation && (
        <>
          <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', margin: '0 0 4px' }}>Connected store</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#059669', margin: 0 }}>✓ {installation.shop_domain}</p>
            </div>
            <button onClick={handleSyncProducts} disabled={syncingProducts}
              style={{ padding: '9px 18px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', opacity: syncingProducts ? 0.7 : 1 }}>
              {syncingProducts ? 'Syncing…' : '🔄 Sync products'}
            </button>
          </div>

          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Products ({products.length})
            </p>
            {products.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ color: '#94A3B8', fontSize: 13, marginBottom: 12 }}>No products yet. Click "Sync products" to import from Shopify.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {products.map(product => {
                  const isExpanded = expandedProduct === product.shopify_product_id
                  const hasPdf = !!product.pdf_path
                  const hasQuestions = (productQuestions[product.shopify_product_id] || []).filter(q => q.question_text.trim()).length >= 4
                  const isReady = hasPdf && hasQuestions

                  return (
                    <div key={product.shopify_product_id} style={{ border: `1px solid ${isReady ? '#6EE7B7' : '#E8EDF8'}`, borderRadius: 12, overflow: 'hidden' }}>
                      <div onClick={() => setExpandedProduct(isExpanded ? null : product.shopify_product_id)}
                        style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isReady ? '#F0FDF4' : '#F8FAFC' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ fontSize: 16 }}>{isReady ? '✅' : '⚙️'}</span>
                          <div>
                            <p style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', margin: '0 0 2px' }}>{product.shopify_product_title}</p>
                            <div style={{ display: 'flex', gap: 8 }}>
                              <span style={{ fontSize: 11, color: hasPdf ? '#059669' : '#EF4444' }}>{hasPdf ? '✓ PDF' : '✗ No PDF'}</span>
                              <span style={{ fontSize: 11, color: hasQuestions ? '#059669' : '#EF4444' }}>{hasQuestions ? '✓ Questions' : '✗ Questions needed'}</span>
                            </div>
                          </div>
                        </div>
                        <span style={{ color: '#94A3B8', fontSize: 12 }}>{isExpanded ? '▲' : '▼'}</span>
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '20px 16px', borderTop: '1px solid #E8EDF8' }}>
                          <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 10 }}>PLAN TYPE</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                              {[
                                { value: 'weekly', label: '📅 Weekly plan', desc: 'New plan every week with check-ins' },
                                { value: 'guide', label: '📖 One-time guide', desc: 'Personalized guide, no expiry' },
                              ].map(opt => (
                                <button key={opt.value} type="button"
                                  onClick={() => setProductPlanType(prev => ({ ...prev, [product.shopify_product_id]: opt.value as 'weekly' | 'guide' }))}
                                  style={{ flex: 1, padding: '12px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                                    border: `1px solid ${productPlanType[product.shopify_product_id] === opt.value ? '#7C5CFC' : '#E8EDF8'}`,
                                    background: productPlanType[product.shopify_product_id] === opt.value ? '#EDE9FE' : '#F8FAFC' }}>
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
                                  <button key={w} type="button"
                                    onClick={() => setProductDuration(prev => ({ ...prev, [product.shopify_product_id]: w }))}
                                    style={{ padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                      border: `1px solid ${productDuration[product.shopify_product_id] === w ? '#7C5CFC' : '#E8EDF8'}`,
                                      background: productDuration[product.shopify_product_id] === w ? '#EDE9FE' : '#F5F7FA',
                                      color: productDuration[product.shopify_product_id] === w ? '#7C5CFC' : '#94A3B8' }}>
                                    {w}w
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 10 }}>PDF PLAN</label>
                            {hasPdf && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#F0FDF4', borderRadius: 8, border: '1px solid #6EE7B7', marginBottom: 10 }}>
                                <span>📄</span>
                                <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>PDF uploaded ✓</span>
                              </div>
                            )}
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '2px dashed #E8EDF8', borderRadius: 10, cursor: 'pointer', background: '#F8FAFC' }}>
                              <input type="file" accept=".pdf" style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadPdf(product.shopify_product_id, f) }} />
                              <span style={{ fontSize: 13, color: uploadingPdf === product.shopify_product_id ? '#94A3B8' : '#7C5CFC', fontWeight: 600 }}>
                                {uploadingPdf === product.shopify_product_id ? 'Uploading…' : hasPdf ? '🔄 Replace PDF' : '+ Upload PDF'}
                              </span>
                            </label>
                          </div>

                          <div style={{ marginBottom: 20 }}>
                            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748B', display: 'block', marginBottom: 6 }}>BUYER QUESTIONS (min 4)</label>
                            <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 12 }}>These questions are shown to buyers before their plan is generated.</p>
                            <QuestionBuilder
                              questions={productQuestions[product.shopify_product_id] || []}
                              setQuestions={(qs: Question[]) => setProductQuestions(prev => ({ ...prev, [product.shopify_product_id]: qs }))}
                            />
                          </div>

                          <button onClick={() => handleSaveProduct(product.shopify_product_id)}
                            disabled={savingProduct === product.shopify_product_id}
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

          <div style={card}>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 14 }}>
              Recent orders ({orders.length})
            </p>
            {orders.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13 }}>No orders yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {orders.map(order => (
                  <div key={order.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E8EDF8' }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', margin: '0 0 2px' }}>{order.buyer_email || 'Unknown buyer'}</p>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>{new Date(order.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 100,
                      background: order.status === 'plan_generated' ? '#D1FDF3' : order.status === 'questionnaire_done' ? '#EDE9FE' : '#FEF3C7',
                      color: order.status === 'plan_generated' ? '#059669' : order.status === 'questionnaire_done' ? '#7C5CFC' : '#D97706',
                    }}>
                      {order.status === 'plan_generated' ? '✓ Plan generated' : order.status === 'questionnaire_done' ? 'Questionnaire done' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}