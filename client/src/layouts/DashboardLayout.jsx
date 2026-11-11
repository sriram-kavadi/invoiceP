import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus2,
  FileText,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Building2,
  Landmark,
  Sliders,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children }) {
  const { user, business, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Create Invoice', href: '/invoices/create', icon: FilePlus2, highlight: true },
    { name: 'All Invoices', href: '/invoices', icon: FileText },
    { name: 'Customers', href: '/customers', icon: Users },
    { name: 'Products & Services', href: '/products', icon: Package },
    { name: 'Payments', href: '/payments', icon: CreditCard },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
  ];

  const settingsNav = [
    { name: 'Business Profile', href: '/settings/business', icon: Building2 },
    { name: 'Bank Accounts', href: '/settings/bank', icon: Landmark },
    { name: 'Invoice Settings', href: '/settings/invoice', icon: Sliders },
  ];

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row bg-gray-50 overflow-hidden">
      {/* Mobile top bar */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-sm shadow">
            IH
          </div>
          <span className="font-bold text-gray-900 tracking-tight">InvoiceHub</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="text-gray-500 hover:text-gray-700 p-1 rounded-md focus:outline-none"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar: Fixed on desktop, sliding drawer on mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-xl md:shadow-none transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-primary-500/20">
              IH
            </div>
            <div>
              <h1 className="font-black text-gray-900 text-lg leading-tight tracking-tight">
                InvoiceHub
              </h1>
              <p className="text-xs text-gray-400 font-medium">Multi-Business Invoicing</p>
            </div>
          </div>
          {/* Close button inside drawer for mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Selector Pill */}
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex-shrink-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
            Current Business
          </div>
          <div className="font-semibold text-xs text-gray-900 truncate">
            {business?.name || 'My Business'}
          </div>
          {business?.gstin && (
            <div className="text-[10px] text-gray-500 font-mono">
              GST: {business.gstin}
            </div>
          )}
        </div>

        {/* Nav Links - Scrollable */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  item.highlight && !active
                    ? 'bg-primary-50 text-primary-700 hover:bg-primary-100 font-semibold'
                    : active
                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
                {active && <ChevronRight className="w-3.5 h-3.5 opacity-70" />}
              </Link>
            );
          })}

          <div className="pt-4 pb-1">
            <p className="px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Settings
            </p>
          </div>

          {settingsNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-primary-600 text-white font-semibold shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <item.icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* User Card & Logout - Pinned to bottom */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 font-bold text-xs flex items-center justify-center flex-shrink-0 border border-primary-200">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-[10px] text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area - Independently scrollable */}
      <main className="flex-1 h-[calc(100vh-57px)] md:h-screen overflow-y-auto min-w-0 flex flex-col bg-gray-50">
        <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children || <Outlet />}
        </div>
      </main>
    </div>
  );
}

