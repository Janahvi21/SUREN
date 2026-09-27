import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { DashboardPage } from './pages/DashboardPage'
import { ProtectedRoute } from './features/auth/ProtectedRoute'
import { ResourcesPage } from './pages/ResourcesPage'
import { RequestsPage } from './pages/RequestsPage'
import { TransactionsPage } from './pages/TransactionsPage'
import { MapPage } from './pages/MapPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { NotificationsPage } from './pages/NotificationsPage'
import { UsersPage } from './pages/UsersPage'
import { DemandPage } from './pages/DemandPage'
import { MatchingPage } from './pages/MatchingPage'
import { ProfilePage } from './pages/ProfilePage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<AppShell><DashboardPage /></AppShell>} />
          <Route path="/dashboard/resources" element={<AppShell><ResourcesPage /></AppShell>} />
          <Route path="/dashboard/requests" element={<AppShell><RequestsPage /></AppShell>} />
          <Route path="/dashboard/transactions" element={<AppShell><TransactionsPage /></AppShell>} />
          <Route path="/dashboard/analytics" element={<AppShell><AnalyticsPage /></AppShell>} />
          <Route path="/dashboard/demand" element={<AppShell><DemandPage /></AppShell>} />
          <Route path="/dashboard/matching" element={<AppShell><MatchingPage /></AppShell>} />
          <Route path="/dashboard/notifications" element={<AppShell><NotificationsPage /></AppShell>} />
          <Route path="/dashboard/profile" element={<AppShell><ProfilePage /></AppShell>} />
          <Route path="/dashboard/settings" element={<AppShell><SettingsPage /></AppShell>} />
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/dashboard/users" element={<AppShell><UsersPage /></AppShell>} />
          </Route>
          <Route path="/dashboard/map" element={<AppShell><MapPage /></AppShell>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
