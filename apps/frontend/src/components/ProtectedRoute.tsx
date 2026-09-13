import { Show } from '@clerk/react'
import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to="/login" replace />
      </Show>
    </>
  )
}