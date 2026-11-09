import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage'
import ResetPasswordPage from './pages/auth/ResetPasswordPage'

// Layout
import DashboardLayout from './layouts/DashboardLayout'

// Protected pages
import OnboardingPage from './pages/OnboardingPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import InvoicesPage from './pages/invoices/InvoicesPage'
import CreateInvoicePage from './pages/invoices/CreateInvoicePage'
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage'
import EditInvoicePage from './pages/invoices/EditInvoicePage'
import CustomersPage from './pages/customers/CustomersPage'
import CustomerFormPage from './pages/customers/CustomerFormPage'
import CustomerDetailPage from './pages/customers/CustomerDetailPage'
import ProductsPage from './pages/products/ProductsPage'
import ProductFormPage from './pages/products/ProductFormPage'
import PaymentsPage from './pages/payments/PaymentsPage'
import ReportsPage from './pages/reports/ReportsPage'
import BusinessSettingsPage from './pages/settings/BusinessSettingsPage'
import BankSettingsPage from './pages/settings/BankSettingsPage'
import InvoiceSettingsPage from './pages/settings/InvoiceSettingsPage'

// Loading spinner
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
            <OnboardingPage />
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
        <Route path="dashboard" element={<DashboardPage />} />

        {/* Invoices */}
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/create" element={<CreateInvoicePage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="invoices/:id/edit" element={<EditInvoicePage />} />

        {/* Customers */}
        <Route path="customers" element={<CustomersPage />} />
        <Route path="customers/new" element={<CustomerFormPage />} />
        <Route path="customers/:id" element={<CustomerDetailPage />} />
        <Route path="customers/:id/edit" element={<CustomerFormPage />} />

        {/* Products */}
        <Route path="products" element={<ProductsPage />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />

        {/* Other */}
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* Settings */}
        <Route path="settings/business" element={<BusinessSettingsPage />} />
        <Route path="settings/bank" element={<BankSettingsPage />} />
        <Route path="settings/invoice" element={<InvoiceSettingsPage />} />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
