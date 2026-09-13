import { SignIn } from '@clerk/react'

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-[400px] bg-base-100 shadow-xl">
        <div className="card-body items-center text-center gap-4">
          <h1 className="text-xl font-bold text-primary">RutuChakra</h1>
          <p className="text-sm text-base-content/70">
            Understand your PCOD risk in minutes — private, explainable, and free.
          </p>
          <SignIn forceRedirectUrl="/dashboard" />
        </div>
      </div>
    </div>
  )
}