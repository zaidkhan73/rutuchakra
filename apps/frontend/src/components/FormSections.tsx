import { useState } from 'react'
import {
  SectionHead, Field, NumberInput, InfoBox,
  NavButtons, SymptomCard, CycleSlider,
} from './FormPrimitives'
import { computeBMI, cycleLabel, cycleColor, isIrregular } from '../utils/pcos'
import type { PCOSFormData, Symptoms } from '../utils/pcos'

interface StepProps {
  data: PCOSFormData
  onChange: (patch: Partial<PCOSFormData>) => void
  onNext: () => void
  onBack?: () => void
}

/* ════════════════════════════════════════
   SECTION 1 — Body Measurements
════════════════════════════════════════ */
export function Section1({ data, onChange, onNext }: StepProps) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  const bmiResult = computeBMI(parseFloat(data.weight), parseFloat(data.height))

  function validate() {
    const e: Record<string, string> = {}
    const age = parseFloat(data.age)
    const w = parseFloat(data.weight)
    const h = parseFloat(data.height)
    if (!data.age || age < 10 || age > 60) e.age = 'Please enter a valid age (10–60)'
    if (!data.weight || w < 25 || w > 200) e.weight = 'Enter weight between 25–200 kg'
    if (!data.height || h < 100 || h > 220) e.height = 'Enter height between 100–220 cm'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return
    onChange({ bmi: bmiResult?.value ?? null, bmiLabel: bmiResult?.label ?? '' })
    onNext()
  }

  return (
    <div>
      <SectionHead
        step={1}
        title="Let's start with the basics"
        desc="Enter your age, weight, and height. BMI is calculated automatically — no math needed."
      />
      <div className="flex flex-col gap-5">
        <Field label="Age" hint="(years)" error={errors.age}>
          <NumberInput
            id="age" placeholder="e.g. 24" min={10} max={60}
            value={data.age} onChange={(v) => onChange({ age: v })}
            hasError={!!errors.age}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Weight" hint="(kg)" error={errors.weight}>
            <NumberInput
              id="weight" placeholder="e.g. 58" min={25} max={200}
              value={data.weight} onChange={(v) => onChange({ weight: v })}
              hasError={!!errors.weight}
            />
          </Field>
          <Field label="Height" hint="(cm)" error={errors.height}>
            <NumberInput
              id="height" placeholder="e.g. 162" min={100} max={220}
              value={data.height} onChange={(v) => onChange({ height: v })}
              hasError={!!errors.height}
            />
          </Field>
        </div>

        <Field label="Your BMI" hint="— auto-calculated">
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-dashed border-base-300 bg-base-200 min-h-[54px]">
            <span className="text-2xl font-bold text-primary leading-none tabular-nums">
              {bmiResult ? bmiResult.value.toFixed(1) : '—'}
            </span>
            {bmiResult && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${bmiResult.classes}`}>
                {bmiResult.label}
              </span>
            )}
          </div>
        </Field>

        <InfoBox>
          BMI = weight (kg) ÷ height² (m). It is one of several indicators — not a
          standalone measure of PCOS risk or overall health.
        </InfoBox>
      </div>
      <NavButtons onNext={handleNext} />
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 2 — Menstrual Cycle
════════════════════════════════════════ */
export function Section2({ data, onChange, onNext, onBack }: StepProps) {
  const days = data.cycleLen ?? 28
  const label = cycleLabel(days)
  const colorClass = cycleColor(days)
  const irregular = isIrregular(days)

  return (
    <div>
      <SectionHead
        step={2}
        title="Your cycle pattern"
        desc="Drag the slider to select your average menstrual cycle length. Regularity is determined automatically from the value you choose."
      />
      <div className="flex flex-col gap-5">
        <Field label="Average cycle length">
          <CycleSlider value={days} onChange={(v) => onChange({ cycleLen: v })} />
        </Field>

        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${colorClass}`}>
          <span className="text-xl">{days <= 15 ? '🚫' : irregular ? '⚠️' : '✅'}</span>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs opacity-80 mt-0.5">
              {days <= 15
                ? 'This may indicate amenorrhoea. Please consult a doctor.'
                : irregular
                ? 'Cycles outside 21–35 days are flagged as irregular — a key PCOS indicator.'
                : 'Your cycle length falls within the typical healthy range of 21–35 days.'}
            </p>
          </div>
        </div>

        <div className="relative h-2 rounded-full overflow-hidden flex">
          <div className="bg-error/30 flex-[6]" title="< 21 (short/absent)" />
          <div className="bg-success/30 flex-[14]" title="21–35 (regular)" />
          <div className="bg-warning/30 flex-[25]" title="> 35 (long)" />
          <div
            className="absolute top-0 bottom-0 w-[3px] bg-primary rounded-full transition-all duration-200"
            style={{ left: `${((days - 15) / (60 - 15)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-base-content/50 -mt-3">
          <span>Short</span>
          <span className="text-success font-medium">Regular (21–35)</span>
          <span>Long</span>
        </div>

        <InfoBox>
          Your regularity is decided automatically. A typical cycle is 21–35 days.
          Cycles shorter, longer, absent, or very unpredictable may signal a hormonal imbalance.
        </InfoBox>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 3 — Symptoms
════════════════════════════════════════ */
const SYMPTOMS: { key: keyof Symptoms; icon: string; label: string }[] = [
  { key: 'weightGain', icon: '⚖️', label: 'Unexplained weight gain' },
  { key: 'facialHair', icon: '🪮', label: 'Excess facial or body hair' },
  { key: 'skinDark', icon: '🩺', label: 'Skin darkening on neck or folds' },
  { key: 'hairLoss', icon: '💇', label: 'Hair thinning or hair loss' },
  { key: 'acne', icon: '🔴', label: 'Persistent acne or pimples' },
  { key: 'none', icon: '✅', label: 'None of the above' },
]

export function Section3({ data, onChange, onNext, onBack }: StepProps) {
  const symptoms = data.symptoms

  function tap(key: keyof Symptoms) {
    if (key === 'none') {
      const wasNone = symptoms.none
      const cleared: Symptoms = {
        weightGain: false, facialHair: false, skinDark: false, hairLoss: false, acne: false, none: !wasNone,
      }
      onChange({ symptoms: cleared })
    } else {
      onChange({
        symptoms: { ...symptoms, none: false, [key]: !symptoms[key] },
      })
    }
  }

  return (
    <div>
      <SectionHead
        step={3}
        title="What have you been experiencing?"
        desc="Select every symptom that applies. These are self-reportable — no tests needed. Tap to select or deselect."
      />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          {SYMPTOMS.map((s) => (
            <SymptomCard
              key={s.key}
              icon={s.icon}
              label={s.label}
              selected={!!symptoms[s.key]}
              onClick={() => tap(s.key)}
            />
          ))}
        </div>
        <InfoBox>
          Even one or two symptoms can be worth discussing with a doctor.
          PCOS presents differently in every person.
        </InfoBox>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 4 — Lifestyle
════════════════════════════════════════ */
interface Section4Props extends StepProps {
  submitting?: boolean
  error?: string
}

export function Section4({ data, onChange, onNext, onBack, submitting, error }: Section4Props) {
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (data.fastFood === null || data.fastFood === undefined) e.ff = 'Please select an option'
    if (data.exercise === null || data.exercise === undefined) e.ex = 'Please select an option'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return
    onNext()
  }

  function toggleClasses(active: boolean) {
    return `flex-1 py-[13px] px-3 rounded-xl text-sm font-medium border-2 transition-all outline-none cursor-pointer
      ${active
        ? 'border-primary bg-primary/10 text-primary scale-[1.03]'
        : 'border-base-300 bg-base-100 text-base-content/60 hover:border-base-content/20 hover:bg-base-200'}`
  }

  return (
    <div>
      <SectionHead
        step={4}
        title="Your everyday routine"
        desc="Diet and activity directly affect insulin resistance and hormone levels — both key factors in PCOS."
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-base-content">
            Do you consume fast food frequently?{' '}
            <span className="font-normal text-xs text-base-content/50">(3+ times / week)</span>
          </p>
          <div className="flex gap-2.5">
            {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                onClick={() => { onChange({ fastFood: val }); setErrors((e) => ({ ...e, ff: '' })) }}
                className={toggleClasses(data.fastFood === val)}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.ff && <span className="text-xs text-error animate-fade-up">{errors.ff}</span>}
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-base-content">
            Do you exercise regularly?{' '}
            <span className="font-normal text-xs text-base-content/50">(3+ times / week)</span>
          </p>
          <div className="flex gap-2.5">
            {[{ label: 'Yes', val: true }, { label: 'No', val: false }].map(({ label, val }) => (
              <button
                key={label}
                type="button"
                onClick={() => { onChange({ exercise: val }); setErrors((e) => ({ ...e, ex: '' })) }}
                className={toggleClasses(data.exercise === val)}
              >
                {label}
              </button>
            ))}
          </div>
          {errors.ex && <span className="text-xs text-error animate-fade-up">{errors.ex}</span>}
        </div>

        <InfoBox>
          A sedentary lifestyle and diet high in processed food can worsen hormonal imbalance
          and elevate PCOS risk over time.
        </InfoBox>

        {error && (
          <div className="alert alert-error bg-error/10 border-error/30 text-error text-sm py-3">
            <span>{error}</span>
          </div>
        )}
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} nextLabel="See my result" loading={submitting} />
    </div>
  )
}