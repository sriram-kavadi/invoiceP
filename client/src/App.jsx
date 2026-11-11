import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth pages — kept eager so unauthenticated users get them instantly
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Layout — eager (tiny shell, needed immediately after login)
import DashboardLayout from './layouts/DashboardLayout'

// Protected pages — lazy loaded (split into separate JS chunks)
const OnboardingPage        = lazy(() => import('./pages/OnboardingPage'))
const DashboardPage         = lazy(() => import('./pages/dashboard/DashboardPage'))
const InvoicesPage          = lazy(() => import('./pages/invoices/InvoicesPage'))
const CreateInvoicePage     = lazy(() => import('./pages/invoices/CreateInvoicePage'))
const InvoiceDetailPage     = lazy(() => import('./pages/invoices/InvoiceDetailPage'))
const EditInvoicePage       = lazy(() => import('./pages/invoices/EditInvoicePage'))
const CustomersPage         = lazy(() => import('./pages/customers/CustomersPage'))
const CustomerFormPage      = lazy(() => import('./pages/customers/CustomerFormPage'))
const CustomerDetailPage    = lazy(() => import('./pages/customers/CustomerDetailPage'))
const ProductsPage          = lazy(() => import('./pages/products/ProductsPage'))
const ProductFormPage       = lazy(() => import('./pages/products/ProductFormPage'))
const PaymentsPage          = lazy(() => import('./pages/payments/PaymentsPage'))
const ReportsPage           = lazy(() => import('./pages/reports/ReportsPage'))
const BusinessSettingsPage  = lazy(() => import('./pages/settings/BusinessSettingsPage'))
const BankSettingsPage      = lazy(() => import('./pages/settings/BankSettingsPage'))
const InvoiceSettingsPage   = lazy(() => import('./pages/settings/InvoiceSettingsPage'))

// Shared page-level loading fallback
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-xs text-gray-400">Loading…</p>
      </div>
    </div>
  )
}

// App-level spinner (shown while auth state resolves)
function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Redirect if already logged in
function PublicRoute({ children }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return <LoadingSpinner />
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Onboarding */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Suspense fallback={<PageLoader />}>
                <OnboardingPage />
              </Suspense>
            </ProtectedRoute>
          }
        />

        {/* Dashboard layout routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route path="dashboard" element={<Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>} />

          {/* Invoices */}
          <Route path="invoices" element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
          <Route path="invoices/create" element={<Suspense fallback={<PageLoader />}><CreateInvoicePage /></Suspense>} />
          <Route path="invoices/:id" element={<Suspense fallback={<PageLoader />}><InvoiceDetailPage /></Suspense>} />
          <Route path="invoices/:id/edit" element={<Suspense fallback={<PageLoader />}><EditInvoicePage /></Suspense>} />

          {/* Customers */}
          <Route path="customers" element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
          <Route path="customers/new" element={<Suspense fallback={<PageLoader />}><CustomerFormPage /></Suspense>} />
          <Route path="customers/:id" element={<Suspense fallback={<PageLoader />}><CustomerDetailPage /></Suspense>} />
          <Route path="customers/:id/edit" element={<Suspense fallback={<PageLoader />}><CustomerFormPage /></Suspense>} />

          {/* Products */}
          <Route path="products" element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
          <Route path="products/new" element={<Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>} />
          <Route path="products/:id/edit" element={<Suspense fallback={<PageLoader />}><ProductFormPage /></Suspense>} />

          {/* Other */}
          <Route path="payments" element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
          <Route path="reports" element={<Suspense fallback={<PageLoader />}><ReportsPage /></Suspense>} />

          {/* Settings */}
          <Route path="settings/business" element={<Suspense fallback={<PageLoader />}><BusinessSettingsPage /></Suspense>} />
          <Route path="settings/bank" element={<Suspense fallback={<PageLoader />}><BankSettingsPage /></Suspense>} />
          <Route path="settings/bank-accounts" element={<Navigate to="/settings/bank" replace />} />
          <Route path="settings/invoice" element={<Suspense fallback={<PageLoader />}><InvoiceSettingsPage /></Suspense>} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  )
}
