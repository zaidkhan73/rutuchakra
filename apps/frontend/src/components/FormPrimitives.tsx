import type { ReactNode } from 'react'

/* ── Section heading with step badge ── */
export function SectionHead({ step, title, desc }: { step: number; title: string; desc: string }) {
  return (
    <div className="mb-6 animate-fade-down">
      <span className="badge badge-primary badge-sm mb-3">Step {step} of 4</span>
      <h2 className="text-xl sm:text-2xl font-bold text-base-content">{title}</h2>
      <p className="text-sm text-base-content/70 mt-1.5">{desc}</p>
    </div>
  )
}

/* ── Labeled field wrapper ── */
export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <div className="form-control flex flex-col gap-1.5">
      <label className="text-sm font-medium text-base-content">
        {label} {hint && <span className="text-base-content/50 font-normal">{hint}</span>}
      </label>
      {children}
      {error && <span className="text-xs text-error animate-fade-up">{error}</span>}
    </div>
  )
}

/* ── Number input ── */
export function NumberInput({
  id,
  placeholder,
  min,
  max,
  value,
  onChange,
  hasError,
}: {
  id: string
  placeholder: string
  min: number
  max: number
  value: string
  onChange: (v: string) => void
  hasError?: boolean
}) {
  return (
    <input
      id={id}
      type="number"
      inputMode="decimal"
      placeholder={placeholder}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`input input-bordered w-full ${hasError ? 'input-error' : ''}`}
    />
  )
}

/* ── Info callout ── */
export function InfoBox({ children }: { children: ReactNode }) {
  return (
    <div className="alert alert-info bg-info/10 border-info/30 text-base-content/80 text-sm py-3">
      <span>{children}</span>
    </div>
  )
}

/* ── Back / Next navigation ── */
export function NavButtons({
  onBack,
  onNext,
  nextLabel = 'Continue',
  loading,
}: {
  onBack?: () => void
  onNext: () => void
  nextLabel?: string
  loading?: boolean
}) {
  return (
    <div className="flex gap-3 mt-8">
      {onBack && (
        <button type="button" onClick={onBack} className="btn btn-outline flex-1" disabled={loading}>
          Back
        </button>
      )}
      <button type="button" onClick={onNext} className="btn btn-primary flex-1" disabled={loading}>
        {loading ? <span className="loading loading-spinner loading-sm" /> : nextLabel}
      </button>
    </div>
  )
}

/* ── Symptom toggle card ── */
export function SymptomCard({
  icon,
  label,
  selected,
  onClick,
}: {
  icon: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-center transition-all
        ${selected ? 'border-primary bg-primary/10 text-primary' : 'border-base-300 bg-base-100 text-base-content/70 hover:border-base-content/20'}`}
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium leading-snug">{label}</span>
    </button>
  )
}

/* ── Cycle length slider ── */
export function CycleSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-center gap-1.5 mb-3">
        <span className="text-4xl font-extrabold text-primary tabular-nums">{value}</span>
        <span className="text-sm text-base-content/60">days</span>
      </div>
      <input
        type="range"
        min={15}
        max={60}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="range range-primary"
      />
      <div className="flex justify-between text-xs text-base-content/50 mt-1 px-1">
        <span>15</span>
        <span>60</span>
      </div>
    </div>
  )
}

/* ── Subtle decorative background (single, understated) ── */
export function BackgroundMesh() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute top-1/2 -right-24 w-96 h-96 rounded-full bg-secondary/10 blur-3xl" />
    </div>
  )
}

/* ── Decorative floating dots (single restrained motion, not scattered) ── */
export function FloatingPetals() {
  const dots = [
    { top: '15%', left: '8%', size: 10, delay: '0s' },
    { top: '65%', left: '4%', size: 6, delay: '1.2s' },
    { top: '25%', left: '92%', size: 8, delay: '0.6s' },
    { top: '75%', left: '90%', size: 6, delay: '1.8s' },
  ]
  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-accent/30 animate-float-slow"
          style={{ top: d.top, left: d.left, width: d.size, height: d.size, animationDelay: d.delay }}
        />
      ))}
    </div>
  )
}

/* ── Step progress indicator (1-4) ── */
export function StepProgress({ current }: { current: number }) {
  const labels = ['Body', 'Cycle', 'Symptoms', 'Lifestyle']
  return (
    <ul className="steps steps-horizontal w-full max-w-[480px] mb-8">
      {labels.map((label, i) => (
        <li key={label} className={`step ${current > i ? 'step-primary' : ''}`}>
          {label}
        </li>
      ))}
    </ul>
  )
}

/* ── Card wrapper with directional slide-in per step change ── */
export function FormCard({ children, animDir }: { children: ReactNode; animDir: 'r' | 'l' }) {
  return (
    <div
      className={`card bg-base-100 shadow-xl w-full max-w-[560px] p-6 sm:p-8
        ${animDir === 'r' ? 'animate-slide-in-right' : 'animate-slide-in-left'}`}
    >
      {children}
    </div>
  )
}