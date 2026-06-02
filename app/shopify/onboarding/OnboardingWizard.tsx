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

export default function OnboardingWizard({ merchant, merchantProfile, catalogItems, installation, userEmail, initialStep }: Props) {
  return <div>OnboardingWizard</div>
}
