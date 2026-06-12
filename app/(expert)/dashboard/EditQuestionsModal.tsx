'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const input: React.CSSProperties = {
  width: '100%', padding: '10px 12px', borderRadius: 8,
  border: '1px solid #E8EDF8', fontSize: 13, color: '#0F172A',
  background: '#F8FAFC', outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box',
}

type QuestionType = 'text' | 'select'

interface Question {
  id: string
  question_text: string
  question_type: QuestionType
  allow_multiple: boolean
  options: string[]
}

function QuestionBuilder({ questions, setQuestions }: {
  questions: Question[]
  setQuestions: React.Dispatch<React.SetStateAction<Question[]>>
}) {
  function addQuestion() {
    setQuestions(prev => [...prev, { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] }])
  }
  function updateQuestion(id: string, field: keyof Question, value: any) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q))
  }
  function removeQuestion(id: string) {
    if (questions.length <= 4) return
    setQuestions(prev => prev.filter(q => q.id !== id))
  }
  function addOption(qid: string) {
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, options: [...q.options, ''] } : q))
  }
  function updateOption(qid: string, i: number, val: string) {
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, options: q.options.map((o, j) => j === i ? val : o) } : q))
  }
  function removeOption(qid: string, i: number) {
    setQuestions(prev => prev.map(q => q.id === qid ? { ...q, options: q.options.filter((_, j) => j !== i) } : q))
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
                style={{ fontSize: 11, color: '#7C5CFC', background: 'none', border: '1px dashed #C4B5FD', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', marginBottom: 4 }}>
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

export default function EditQuestionsModal({ productId }: { productId: string }) {
  const [open, setOpen] = useState(false)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function loadQuestions() {
    setLoading(true)
    const { data } = await supabase
      .from('product_questions')
      .select('*')
      .eq('product_id', productId)
      .order('order_index')
    if (data && data.length > 0) {
      setQuestions(data.map(q => ({
        id: q.id || crypto.randomUUID(),
        question_text: q.question_text,
        question_type: q.question_type as QuestionType,
        allow_multiple: q.allow_multiple || false,
        options: q.options || [],
      })))
    } else {
      setQuestions([
        { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] },
        { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] },
        { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] },
        { id: crypto.randomUUID(), question_text: '', question_type: 'text', allow_multiple: false, options: [] },
      ])
    }
    setLoading(false)
  }

  function handleOpen() {
    setOpen(true)
    setSaved(false)
    setError('')
    loadQuestions()
  }

  async function handleSave() {
    const valid = questions.filter(q => q.question_text.trim())
    if (valid.length < 4) { setError('Add at least 4 questions.'); return }
    for (const q of valid) {
      if (q.question_type === 'select' && q.options.filter(o => o.trim()).length < 2) {
        setError('Multiple choice questions need at least 2 options.'); return
      }
    }
    setSaving(true); setError('')
    await supabase.from('product_questions').delete().eq('product_id', productId)
    const { error: insertError } = await supabase.from('product_questions').insert(
      valid.map((q, i) => ({
        product_id: productId,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.question_type === 'select' ? q.options.filter(o => o.trim()) : null,
        allow_multiple: q.question_type === 'select' ? q.allow_multiple : false,
        order_index: i,
      }))
    )
    setSaving(false)
    if (insertError) { setError('Error saving. Try again.'); return }
    setSaved(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) fetch('/api/seller-bridge', { method: 'POST', headers: { Authorization: `Bearer ${session.access_token}` } })
    } catch { /* non bloccante */ }
    setTimeout(() => setOpen(false), 1200)
  }

  return (
    <>
      <button onClick={handleOpen}
        style={{ padding: '6px 14px', borderRadius: 100, fontSize: 12, fontWeight: 600, border: '1px solid #E8EDF8', background: '#F8FAFC', color: '#64748B', cursor: 'pointer', whiteSpace: 'nowrap' }}>
        ✏️ Edit questions
      </button>

      {open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          onClick={() => setOpen(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: 28, width: '100%', maxWidth: 560, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h2 style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 18, color: '#0F172A', margin: 0 }}>Edit buyer questions</h2>
              <button onClick={() => setOpen(false)} style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 30, height: 30, cursor: 'pointer', fontSize: 14, color: '#64748B' }}>✕</button>
            </div>
            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 20 }}>
              Buyers who haven't generated their plan yet will see the updated questions. Minimum 4.
            </p>
            {loading ? (
              <p style={{ color: '#94A3B8', fontSize: 13 }}>Loading…</p>
            ) : (
              <QuestionBuilder questions={questions} setQuestions={setQuestions} />
            )}
            {error && <p style={{ color: '#EF4444', fontSize: 12, marginTop: 12 }}>{error}</p>}
            <button onClick={handleSave} disabled={saving || saved}
              style={{ width: '100%', marginTop: 20, padding: '13px', borderRadius: 12, fontWeight: 700, fontSize: 14,
                background: saved ? '#D1FDF3' : '#7C5CFC',
                color: saved ? '#059669' : '#fff',
                border: saved ? '1px solid #6EE7B7' : 'none',
                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save questions'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}