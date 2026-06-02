'use client'

import { useState } from 'react'

interface Question {
  id: string
  text: string
  type: 'text' | 'select' | 'multiselect'
  options?: string[]
  enabled: boolean
}

const DEFAULT_QUESTIONS: Record<string, Question[]> = {
  Skincare: [
    { id: '1', text: 'What is your skin type?', type: 'select', options: ['Dry', 'Oily', 'Combination', 'Normal', 'Sensitive'], enabled: true },
    { id: '2', text: 'What are your main skin concerns?', type: 'multiselect', options: ['Hydration', 'Anti-aging', 'Brightening', 'Acne', 'Redness', 'Uneven texture'], enabled: true },
    { id: '3', text: 'Do you have any known sensitivities or allergies?', type: 'text', enabled: true },
    { id: '4', text: 'Describe your current skincare routine briefly', type: 'text', enabled: true },
    { id: '5', text: 'How many steps can you commit to daily?', type: 'select', options: ['2-3 steps', '4-5 steps', '6+ steps'], enabled: true },
  ],
  Fitness: [
    { id: '1', text: 'What is your main fitness goal?', type: 'select', options: ['Lose weight', 'Build muscle', 'Improve endurance', 'Stay active', 'Recover from injury'], enabled: true },
    { id: '2', text: 'What is your current fitness level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], enabled: true },
    { id: '3', text: 'How many days per week can you train?', type: 'select', options: ['2-3 days', '4-5 days', '6-7 days'], enabled: true },
    { id: '4', text: 'What equipment do you have access to?', type: 'select', options: ['No equipment', 'Home equipment', 'Full gym'], enabled: true },
    { id: '5', text: 'Do you have any injuries or physical limitations?', type: 'text', enabled: true },
  ],
  Nutrition: [
    { id: '1', text: 'What is your main nutrition goal?', type: 'select', options: ['Lose weight', 'Gain muscle', 'Improve energy', 'Eat healthier', 'Manage a condition'], enabled: true },
    { id: '2', text: 'Do you follow any specific diet?', type: 'select', options: ['No restrictions', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Other'], enabled: true },
    { id: '3', text: 'Do you have any food allergies?', type: 'text', enabled: true },
    { id: '4', text: 'How would you describe your current eating habits?', type: 'text', enabled: true },
    { id: '5', text: 'How active are you on a daily basis?', type: 'select', options: ['Sedentary', 'Lightly active', 'Moderately active', 'Very active'], enabled: true },
  ],
}

const FALLBACK_QUESTIONS: Question[] = [
  { id: '1', text: 'What is your main goal?', type: 'text', enabled: true },
  { id: '2', text: 'What is your current experience level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], enabled: true },
  { id: '3', text: 'How much time can you dedicate per day?', type: 'select', options: ['15-30 minutes', '30-60 minutes', '60+ minutes'], enabled: true },
  { id: '4', text: 'Do you have any limitations or special needs?', type: 'text', enabled: true },
  { id: '5', text: 'What results are you hoping to see in the first month?', type: 'text', enabled: true },
]

export default function Step3Intake({ category, initialQuestions, onComplete, onBack }: { category: string, initialQuestions?: Question[], onComplete: (data: any) => void, onBack: () => void }) {
  const defaultQs = initialQuestions?.length ? initialQuestions : DEFAULT_QUESTIONS[category] || FALLBACK_QUESTIONS
  const [questions, setQuestions] = useState<Question[]>(defaultQs)
  const [editingId, setEditingId] = useState<string | null>(null)

  function toggleQuestion(id: string) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, enabled: !q.enabled } : q))
  }

  function updateText(id: string, text: string) {
    setQuestions(qs => qs.map(q => q.id === id ? { ...q, text } : q))
  }

  function addQuestion() {
    const newQ: Question = { id: crypto.randomUUID(), text: '', type: 'text', enabled: true }
    setQuestions(qs => [...qs, newQ])
    setEditingId(newQ.id)
  }

  const enabledCount = questions.filter(q => q.enabled).length

  return (
    <div>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: '0 0 6px', fontFamily: "'Satoshi', sans-serif" }}>Customer Intake</h2>
      <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 8px', lineHeight: 1.6 }}>These questions will be shown to your customers before their plan is generated.</p>
      <p style={{ fontSize: 12, color: '#94A3B8', margin: '0 0 24px' }}>{enabledCount} question{enabledCount !== 1 ? 's' : ''} active</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {questions.map((q, i) => (
          <div key={q.id} style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid #E8EDF8', background: '#F8FAFC', opacity: q.enabled ? 1 : 0.5 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', minWidth: 20, paddingTop: 2 }}>Q{i + 1}</span>
              <div style={{ flex: 1 }}>
                {editingId === q.id ? (
                  <input autoFocus type="text" value={q.text} onChange={e => updateText(q.id, e.target.value)} onBlur={() => setEditingId(null)}
                    style={{ width: '100%', padding: '6px 10px', borderRadius: 7, border: '1px solid #7C5CFC', fontSize: 13, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                ) : (
                  <p style={{ fontSize: 13, fontWeight: 500, color: '#0F172A', margin: '0 0 4px', cursor: 'text' }} onClick={() => setEditingId(q.id)}>
                    {q.text || <span style={{ color: '#94A3B8' }}>Click to edit</span>}
                  </p>
                )}
                <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 100, background: '#EDE9FE', color: '#7C5CFC', fontWeight: 600 }}>
                  {q.type === 'text' ? 'Open answer' : q.type === 'select' ? 'Single choice' : 'Multi choice'}
                </span>
              </div>
              <button onClick={() => toggleQuestion(q.id)}
                style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid #E8EDF8', background: q.enabled ? '#F0FDF4' : '#F1F5F9', color: q.enabled ? '#059669' : '#94A3B8' }}>
                {q.enabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addQuestion} style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px dashed #C4B5FD', background: 'transparent', color: '#94A3B8', fontSize: 13, cursor: 'pointer', marginBottom: 20 }}>
        + Add custom question
      </button>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onBack} style={{ flex: 1, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#F8FAFC', color: '#64748B', border: '1px solid #E8EDF8', cursor: 'pointer' }}>Back</button>
        <button onClick={() => onComplete({ customer_questions: questions.filter(q => q.enabled && q.text.trim()) })}
          style={{ flex: 2, padding: '14px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#7C5CFC', color: '#fff', border: 'none', cursor: 'pointer' }}>
          Continue
        </button>
      </div>
    </div>
  )
}
