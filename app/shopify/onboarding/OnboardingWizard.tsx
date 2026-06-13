'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Step1Identity from './steps/Step1Identity'
import Step2Catalog from './steps/Step2Catalog'
import Step3Intake from './steps/Step3Intake'
import Step4Preview from './steps/Step4Preview'
import Step5GoLive from './steps/Step5GoLive'

interface Props {
  merchant: any
  merchantProfile: any
  catalogItems: any[]
  installation: any
  userEmail: string
  initialStep: number
}

const STEPS = [
  { number: 1, label: 'Identity' },
  { number: 2, label: 'Catalog' },
  { number: 3, label: 'Intake' },
  { number: 4, label: 'Preview' },
  { number: 5, label: 'Get Started' },
]

export default function OnboardingWizard({
  merchant,
  merchantProfile,
  catalogItems,
  installation,
  userEmail,
  initialStep,
}: Props) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(initialStep || 1)
  const [saving, setSaving] = useState(false)
  const [merchantData, setMerchantData] = useState({
    seller_type: merchant?.seller_type || 'brand',
    category: merchant?.category || '',
    ...merchantProfile,
  })
  const [catalogItemsState, setCatalogItemsState] = useState(catalogItems)
  const [catalogCounts, setCatalogCounts] = useState({
    total: catalogItems?.length || 0,
    tagged: 0,
  })

  // Legge i conteggi reali da catalog_items (sorgente di verità),
  // invece di affidarsi allo stato del wizard che non riflette il sync.
  async function refreshCatalogCounts() {
    if (!merchant?.id) return
    try {
      const res = await fetch(`/api/shopify/catalog-count?merchantId=${merchant.id}`)
      const json = await res.json()
      if (res.ok) {
        setCatalogCounts({ total: json.total ?? 0, tagged: json.tagged ?? 0 })
      }
    } catch (err) {
      console.error('refreshCatalogCounts error:', err)
    }
  }

  async function saveStep(step: number, data: any) {
    setSaving(true)
    try {
      const res = await fetch('/api/shopify/save-onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      })
      const json = await res.json()
      if (!res.ok) {
        console.error('Save step error:', json.error)
        return false
      }
      return true
    } catch (err) {
      console.error('Save step error:', err)
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleStep1Complete(data: any) {
    setMerchantData((prev: any) => ({ ...prev, ...data }))
    const ok = await saveStep(1, data)
    if (ok) {
      setCurrentStep(2)
      window.history.pushState({}, '', '/shopify/onboarding?step=2')
    }
  }

  async function handleStep2Complete(data: any) {
    const ok = await saveStep(2, data)
    if (ok) {
      setCurrentStep(3)
      window.history.pushState({}, '', '/shopify/onboarding?step=3')
    }
  }

  async function handleStep3Complete(data: any) {
    setMerchantData((prev: any) => ({ ...prev, ...data }))
    const ok = await saveStep(3, data)
    if (ok) {
      setCurrentStep(4)
      window.history.pushState({}, '', '/shopify/onboarding?step=4')
    }
  }

  async function handleStep4Complete(data: any) {
    const ok = await saveStep(4, data)
    if (ok) {
      await refreshCatalogCounts()
      setCurrentStep(5)
      window.history.pushState({}, '', '/shopify/onboarding?step=5')
    }
  }

  async function handleStep5Complete() {
    const ok = await saveStep(5, {
      seller_type: merchantData.seller_type,
      category: merchantData.category,
    })
    if (ok) {
      router.push('/shopify')
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      const prev = currentStep - 1
      setCurrentStep(prev)
      window.history.pushState({}, '', `/shopify/onboarding?step=${prev}`)
    }
  }

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100

  return (
    <div style={{ minHeight: '100vh', background: '#F5F7FA', fontFamily: "'Inter', sans-serif" }}>

      {/* Header */}
      <div style={{ background: '#FFFFFF', borderBottom: '1px solid #E8EDF8', padding: '0 24px' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 0 16px' }}>
            <a href="/shopify/home" style={{ textDecoration: 'none' }}>
              <span style={{ fontFamily: "'Satoshi', sans-serif", fontWeight: 800, fontSize: 20, color: '#0F172A' }}>
                malyte<span style={{ color: '#7C5CFC' }}>.</span>
              </span>
            </a>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>
              Step {currentStep} of {STEPS.length}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ height: 3, background: '#E8EDF8', borderRadius: 100, marginBottom: 0 }}>
            <div style={{
              height: '100%',
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #7C5CFC, #06B6D4)',
              borderRadius: 100,
              transition: 'width 0.4s ease',
            }} />
          </div>

          {/* Step labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0 0' }}>
            {STEPS.map(s => (
              <span key={s.number} style={{
                fontSize: 10,
                fontWeight: 700,
                color: s.number === currentStep ? '#7C5CFC' : s.number < currentStep ? '#059669' : '#CBD5E1',
                letterSpacing: '0.04em',
              }}>
                {s.number < currentStep ? '✓' : ''} {s.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px 64px' }}>
        <div style={{
          background: '#FFFFFF',
          borderRadius: 20,
          border: '1px solid #E8EDF8',
          padding: '32px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
        }}>

          {saving && (
            <div style={{ position: 'fixed', top: 20, right: 20, background: '#0F172A', color: '#fff', padding: '8px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, zIndex: 100 }}>
              Saving…
            </div>
          )}

          {currentStep === 1 && (
            <Step1Identity
              initialData={merchantData}
              onComplete={handleStep1Complete}
            />
          )}

          {currentStep === 2 && (
            <Step2Catalog
              merchantId={merchant?.id}
              hasInstallation={!!installation}
              initialItems={catalogItemsState}
              onComplete={handleStep2Complete}
              onBack={handleBack}
            />
          )}

          {currentStep === 3 && (
            <Step3Intake
              category={merchantData.category || merchant?.category || 'Skincare'}
              initialQuestions={merchantData.customer_questions}
              onComplete={handleStep3Complete}
              onBack={handleBack}
            />
          )}

          {currentStep === 4 && (
            <Step4Preview
              onComplete={handleStep4Complete}
              onBack={handleBack}
            />
          )}

          {currentStep === 5 && (
            <Step5GoLive
              merchant={merchant}
              merchantProfile={merchantData}
              catalogItemsCount={catalogCounts.total}
              taggedCount={catalogCounts.tagged}
              onComplete={handleStep5Complete}
            />
          )}

        </div>
      </div>
    </div>
  )
}
