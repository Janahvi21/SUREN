import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/layout/AppShell'
import { ProtectedRoute } from './features/auth/ProtectedRoute'

const LandingPage = lazy(() => import('./pages/LandingPage').then((module) => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/RegisterPage').then((module) => ({ default: module.RegisterPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const ResourcesPage = lazy(() => import('./pages/ResourcesPage').then((module) => ({ default: module.ResourcesPage })))
const RequestsPage = lazy(() => import('./pages/RequestsPage').then((module) => ({ default: module.RequestsPage })))
const TransactionsPage = lazy(() => import('./pages/TransactionsPage').then((module) => ({ default: module.TransactionsPage })))
const MapPage = lazy(() => import('./pages/MapPage').then((module) => ({ default: module.MapPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage').then((module) => ({ default: module.NotificationsPage })))
const UsersPage = lazy(() => import('./pages/UsersPage').then((module) => ({ default: module.UsersPage })))
const DemandPage = lazy(() => import('./pages/DemandPage').then((module) => ({ default: module.DemandPage })))
const MatchingPage = lazy(() => import('./pages/MatchingPage').then((module) => ({ default: module.MatchingPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((module) => ({ default: module.ProfilePage })))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-100 text-sm text-slate-600" role="status" aria-live="polite">Loading page...</div>}>
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
      </Suspense>
    </BrowserRouter>
  )
}

export default App
