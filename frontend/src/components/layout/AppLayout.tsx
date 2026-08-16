import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Layers,
  Link2,
  Bell,
  Sliders,
  LogOut,
  Sparkles,
  Menu,
  X,
  Radio,
  FileCode,
  Shield,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { SendTestNotificationModal } from '../modals/SendTestNotificationModal';
import { Button } from '../ui/button';

export const AppLayout: React.FC = () => {
  const { role, apiKeyPrefix, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [testModalOpen, setTestModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate(role === 'admin' ? '/login' : '/api-login');
  };

  const adminNavItems = [
    { to: '/admin/products', label: 'Products', icon: Layers },
    { to: '/admin/connections', label: 'All Connections', icon: Link2 },
    { to: '/admin/notifications', label: 'All Notifications', icon: Bell },
  ];

  const productNavItems = [
    { to: '/connections', label: 'Connections', icon: Link2 },
    { to: '/definitions', label: 'Definitions', icon: FileCode },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/settings', label: 'Settings', icon: Sliders },
  ];

  const navItems = role === 'admin' ? adminNavItems : productNavItems;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row text-slate-100 font-sans">
      {/* ─── Mobile Header ──────────────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#798777] to-[#BDD2B6] flex items-center justify-center shadow-md shadow-[#798777]/30">
            <Radio className="w-4 h-4 text-[#111511]" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-[#F8EDE3]">PingLayer</span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-[#798777]/25 text-[#BDD2B6] border border-[#A2B29F]/30 font-semibold uppercase">
              {role}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-[#F8EDE3]"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* ─── Sidebar (Desktop & Mobile Drawer) ─────────────────────────────────── */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-full md:h-screen w-64 bg-slate-900/95 md:bg-slate-900/60 backdrop-blur-xl border-r border-slate-800/80 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top: Brand & Role */}
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#798777] to-[#BDD2B6] flex items-center justify-center shadow-lg shadow-[#798777]/30"
              >
                <Radio className="w-5 h-5 text-[#111511]" />
              </motion.div>
              <div>
                <h1 className="font-bold text-base tracking-tight text-[#F8EDE3] flex items-center gap-1.5">
                  PingLayer
                  <span className="w-1.5 h-1.5 rounded-full bg-[#BDD2B6] inline-block animate-pulse" />
                </h1>
                <p className="text-[11px] text-[#A2B29F] font-medium">Notification Manager</p>
              </div>
            </div>
          </div>

          {/* Role Pill Card */}
          <div className="px-4 py-3">
            <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3 shadow-inner">
              <div
                className={`p-2 rounded-xl ${
                  role === 'admin'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-[#798777]/20 text-[#BDD2B6] border border-[#A2B29F]/30'
                }`}
              >
                {role === 'admin' ? <Shield className="w-4 h-4" /> : <KeyRound className="w-4 h-4" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#A2B29F]">
                  {role === 'admin' ? 'Platform Admin' : 'Product Workspace'}
                </div>
                <div className="text-xs font-mono text-[#F8EDE3] truncate font-medium">
                  {role === 'admin' ? 'Root Session' : `${apiKeyPrefix || 'key'}••••••••`}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#798777] text-[#F8EDE3] shadow-md shadow-[#798777]/30 font-semibold'
                      : 'text-[#A2B29F] hover:text-[#F8EDE3] hover:bg-[#798777]/15'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F8EDE3]' : 'text-[#A2B29F]'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions & Logout */}
        <div className="p-4 border-t border-slate-800/80 space-y-3">
          {role === 'product' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 border-[#A2B29F]/30 bg-[#798777]/15 hover:bg-[#798777]/25 text-[#BDD2B6]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#BDD2B6]" />
              <span>Test Dispatcher</span>
            </Button>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <button
              type="button"
              onClick={() => navigate(role === 'admin' ? '/api-login' : '/login')}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-300 transition-colors text-[11px] cursor-pointer"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Switch to {role === 'admin' ? 'Product' : 'Admin'}</span>
            </button>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors text-xs font-medium cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content Area with Page Motion ────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Test Notification Modal */}
      {role === 'product' && (
        <SendTestNotificationModal
          isOpen={testModalOpen}
          onClose={() => setTestModalOpen(false)}
        />
      )}
    </div>
  );
};
