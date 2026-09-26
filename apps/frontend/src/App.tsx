import { useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { useAuth, Show } from '@clerk/react'

import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/shell/AppShell'
import { syncUser } from './lib/syncUser'
import PCOSForm from './pages/PCOSForm'
import History from './pages/History'
import HistoricalResult from './pages/HistoricalResult'
import CycleTracker from './pages/CycleTracker'
import HabitTracker from './pages/HabitTracker'
import AIAssistant from './pages/AIAssistant'

function UserSync() {
  const { isSignedIn, getToken } = useAuth()

  useEffect(() => {
    if (!isSignedIn) return
    syncUser(getToken).catch((err) => console.error('User sync failed:', err))
  }, [isSignedIn])

  return null
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
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/predict" element={<PCOSForm />} />
          <Route path="/history" element={<History />} />
          <Route path="/history/:id" element={<HistoricalResult />} />
          <Route path="/cycle" element={<CycleTracker />} />
          <Route path="/habits" element={<HabitTracker />} />
          <Route path="/assistant" element={<AIAssistant />} />
        </Route>
      </Routes>
    </>
  )
}

export default App