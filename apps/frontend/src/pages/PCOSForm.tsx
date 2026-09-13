import { useState } from 'react'
import { useAuth } from '@clerk/react'
import { BackgroundMesh, FloatingPetals, StepProgress, FormCard } from '../components/FormPrimitives'
import { Section1, Section2, Section3, Section4 } from '../components/FormSections'
import ResultScreen from '../components/ResultScreen'
import { fetchPrediction } from '../utils/pcos'
import type { PCOSFormData, PredictionResult } from '../utils/pcos'

const INITIAL: PCOSFormData = {
  age: '',
  weight: '',
  height: '',
  bmi: null,
  bmiLabel: '',
  cycleLen: 28,
  symptoms: {
    weightGain: false,
    facialHair: false,
    skinDark: false,
    hairLoss: false,
    acne: false,
    none: false,
  },
  fastFood: null,
  exercise: null,
}

export default function PCOSForm() {
  const { getToken } = useAuth()
  const [step, setStep] = useState(1)
  const [animDir, setAnimDir] = useState<'r' | 'l'>('r')
  const [formData, setFormData] = useState<PCOSFormData>(INITIAL)
  const [result, setResult] = useState<PredictionResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  function update(patch: Partial<PCOSFormData>) {
    setFormData((prev) => ({ ...prev, ...patch }))
  }

  function goTo(n: number, dir: 'r' | 'l') {
    setAnimDir(dir)
    setTimeout(() => setStep(n), 10)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNext(n: number) { goTo(n + 1, 'r') }
  function handleBack(n: number) { goTo(n - 1, 'l') }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError('')
    try {
      const prediction = await fetchPrediction(formData, getToken)
      console.log(prediction)
      setResult(prediction)
      goTo(5, 'r')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function restart() {
    setFormData(INITIAL)
    setResult(null)
    setSubmitError('')
    goTo(1, 'l')
  }

  const showProgress = step <= 4

  return (
    <div className="relative min-h-screen bg-base-100 text-base-content overflow-x-hidden">
      <BackgroundMesh />
      <FloatingPetals />

      <div className="relative z-10 flex flex-col items-center px-4 pt-12 pb-24 min-h-screen">
        {showProgress && (
          <header className="text-center mb-10 animate-fade-down w-full max-w-[580px]">
            <span className="badge badge-outline badge-sm mb-5 tracking-wide uppercase text-primary border-primary/40">
              PCOD / PCOS Awareness Tool
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-base-content leading-tight mb-3">
              Know Your <em className="italic text-primary">Risk.</em>
            </h1>
            <p className="text-sm text-base-content/70 max-w-[440px] mx-auto leading-relaxed">
              A gentle 4-step symptom check to raise awareness about PCOS &amp; PCOD.
              No lab tests — just your lived experience.
            </p>
          </header>
        )}

        {showProgress && <StepProgress current={step} />}

        <FormCard animDir={animDir}>
          {step === 1 && <Section1 data={formData} onChange={update} onNext={() => handleNext(1)} />}
          {step === 2 && (
            <Section2 data={formData} onChange={update} onNext={() => handleNext(2)} onBack={() => handleBack(2)} />
          )}
          {step === 3 && (
            <Section3 data={formData} onChange={update} onNext={() => handleNext(3)} onBack={() => handleBack(3)} />
          )}
          {step === 4 && (
            <Section4
              data={formData}
              onChange={update}
              onNext={handleSubmit}
              onBack={() => handleBack(4)}
              submitting={submitting}
              error={submitError}
            />
          )}
          {step === 5 && result && <ResultScreen result={result} onRestart={restart} />}
        </FormCard>
      </div>
    </div>
  )
}