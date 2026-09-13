import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth, Show } from '@clerk/react'
import { UserButton } from '@clerk/react'

import Landing from './pages/Landing'
import Login from './pages/Login'
import ProtectedRoute from './components/ProtectedRoute'
import { syncUser } from './lib/syncUser'
import PCOSForm from './pages/PCOSForm'

function UserSync() {
  const { isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isSignedIn) return
    syncUser(getToken).catch((err) => console.error('User sync failed:', err))
  }, [isSignedIn])

  return null
}

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <UserButton />
    </div>
  )
}

function App() {
  return (
    <>
      <Show when="signed-in">
        <UserSync />
      </Show>

      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/predict"
          element={
            <ProtectedRoute>
              <PCOSForm />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  )
}

export default App