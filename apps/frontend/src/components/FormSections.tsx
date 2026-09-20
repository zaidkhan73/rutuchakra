import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})

  const bmiResult = computeBMI(parseFloat(data.weight), parseFloat(data.height))

  function validate() {
    const e: Record<string, string> = {}
    const age = parseFloat(data.age)
    const w = parseFloat(data.weight)
    const h = parseFloat(data.height)
    if (!data.age || age < 10 || age > 60) e.age = t('form.section1.ageError')
    if (!data.weight || w < 25 || w > 200) e.weight = t('form.section1.weightError')
    if (!data.height || h < 100 || h > 220) e.height = t('form.section1.heightError')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleNext() {
    if (!validate()) return
    onChange({ bmi: bmiResult?.value ?? null, bmiLabel: bmiResult ? t(bmiResult.labelKey) : '' })
    onNext()
  }

  return (
    <div>
      <SectionHead
        step={1}
        title={t('form.section1.title')}
        desc={t('form.section1.desc')}
      />
      <div className="flex flex-col gap-5">
        <Field label={t('form.section1.ageLabel')} hint={t('form.section1.ageHint')} error={errors.age}>
          <NumberInput
            id="age" placeholder={t('form.section1.agePlaceholder')} min={10} max={60}
            value={data.age} onChange={(v) => onChange({ age: v })}
            hasError={!!errors.age}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label={t('form.section1.weightLabel')} hint={t('form.section1.weightHint')} error={errors.weight}>
            <NumberInput
              id="weight" placeholder={t('form.section1.weightPlaceholder')} min={25} max={200}
              value={data.weight} onChange={(v) => onChange({ weight: v })}
              hasError={!!errors.weight}
            />
          </Field>
          <Field label={t('form.section1.heightLabel')} hint={t('form.section1.heightHint')} error={errors.height}>
            <NumberInput
              id="height" placeholder={t('form.section1.heightPlaceholder')} min={100} max={220}
              value={data.height} onChange={(v) => onChange({ height: v })}
              hasError={!!errors.height}
            />
          </Field>
        </div>

        <Field label={t('form.section1.bmiLabel')} hint={t('form.section1.bmiHint')}>
          <div className="flex items-center justify-between px-4 py-3.5 rounded-xl border-2 border-dashed border-base-300 bg-base-200 min-h-[54px]">
            <span className="text-2xl font-bold text-primary leading-none tabular-nums">
              {bmiResult ? bmiResult.value.toFixed(1) : '—'}
            </span>
            {bmiResult && (
              <span className={`text-xs font-medium px-3 py-1 rounded-full border ${bmiResult.classes}`}>
                {t(bmiResult.labelKey)}
              </span>
            )}
          </div>
        </Field>

        <InfoBox>{t('form.section1.infoBox')}</InfoBox>
      </div>
      <NavButtons onNext={handleNext} />
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 2 — Menstrual Cycle
════════════════════════════════════════ */
export function Section2({ data, onChange, onNext, onBack }: StepProps) {
  const { t } = useTranslation()
  const days = data.cycleLen ?? 28
  const label = t(cycleLabel(days))
  const colorClass = cycleColor(days)
  const irregular = isIrregular(days)

  return (
    <div>
      <SectionHead
        step={2}
        title={t('form.section2.title')}
        desc={t('form.section2.desc')}
      />
      <div className="flex flex-col gap-5">
        <Field label={t('form.section2.cycleLengthLabel')}>
          <CycleSlider value={days} onChange={(v) => onChange({ cycleLen: v })} />
        </Field>

        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 ${colorClass}`}>
          <span className="text-xl">{days <= 15 ? '🚫' : irregular ? '⚠️' : '✅'}</span>
          <div>
            <p className="text-sm font-semibold">{label}</p>
            <p className="text-xs opacity-80 mt-0.5">
              {days <= 15
                ? t('cycleMessages.amenorrhoea')
                : irregular
                ? t('cycleMessages.irregular')
                : t('cycleMessages.regular')}
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
          <span>{t('form.section2.short')}</span>
          <span className="text-success font-medium">{t('form.section2.regular')}</span>
          <span>{t('form.section2.long')}</span>
        </div>

        <InfoBox>{t('form.section2.infoBox')}</InfoBox>
      </div>
      <NavButtons onBack={onBack} onNext={onNext} />
    </div>
  )
}

/* ════════════════════════════════════════
   SECTION 3 — Symptoms
════════════════════════════════════════ */
const SYMPTOM_IDS: { key: keyof Symptoms; icon: string }[] = [
  { key: 'weightGain', icon: '⚖️' },
  { key: 'facialHair', icon: '🪮' },
  { key: 'skinDark', icon: '🩺' },
  { key: 'hairLoss', icon: '💇' },
  { key: 'acne', icon: '🔴' },
  { key: 'none', icon: '✅' },
]

export function Section3({ data, onChange, onNext, onBack }: StepProps) {
  const { t } = useTranslation()
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
        title={t('form.section3.title')}
        desc={t('form.section3.desc')}
      />
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          {SYMPTOM_IDS.map((s) => (
            <SymptomCard
              key={s.key}
              icon={s.icon}
              label={t(`symptoms.${s.key}`)}
              selected={!!symptoms[s.key]}
              onClick={() => tap(s.key)}
            />
          ))}
        </div>
        <InfoBox>{t('form.section3.infoBox')}</InfoBox>
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
  const { t } = useTranslation()
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (data.fastFood === null || data.fastFood === undefined) e.ff = t('form.section4.selectOptionError')
    if (data.exercise === null || data.exercise === undefined) e.ex = t('form.section4.selectOptionError')
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
        title={t('form.section4.title')}
        desc={t('form.section4.desc')}
      />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-base-content">
            {t('form.section4.fastFoodQuestion')}{' '}
            <span className="font-normal text-xs text-base-content/50">{t('form.section4.frequencyHint')}</span>
          </p>
          <div className="flex gap-2.5">
            {[{ label: t('form.section4.yes'), val: true }, { label: t('form.section4.no'), val: false }].map(({ label, val }) => (
              <button
                key={String(val)}
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
            {t('form.section4.exerciseQuestion')}{' '}
            <span className="font-normal text-xs text-base-content/50">{t('form.section4.frequencyHint')}</span>
          </p>
          <div className="flex gap-2.5">
            {[{ label: t('form.section4.yes'), val: true }, { label: t('form.section4.no'), val: false }].map(({ label, val }) => (
              <button
                key={String(val)}
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

        <InfoBox>{t('form.section4.infoBox')}</InfoBox>

        {error && (
          <div className="alert alert-error bg-error/10 border-error/30 text-error text-sm py-3">
            <span>{error}</span>
          </div>
        )}
      </div>

      <NavButtons onBack={onBack} onNext={handleNext} nextLabel={t('form.section4.seeMyResult')} loading={submitting} />
    </div>
  )
}