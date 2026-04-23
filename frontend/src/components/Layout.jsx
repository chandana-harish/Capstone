import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HomeIcon, UsersIcon, AcademicCapIcon, ClipboardDocumentCheckIcon,
  ArrowRightOnRectangleIcon, Bars3Icon, XMarkIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';

const navItems = [
  { to: '/dashboard', label: 'Dashboard',  Icon: HomeIcon },
  { to: '/users',     label: 'Users',      Icon: UsersIcon },
  { to: '/trainings', label: 'Trainings',  Icon: AcademicCapIcon },
  { to: '/attendance',label: 'Attendance', Icon: ClipboardDocumentCheckIcon },
];

export default function Layout() {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleBadgeColor = {
    admin:   'bg-purple-500/20 text-purple-300 border border-purple-500/30',
    trainer: 'bg-brand-500/20 text-brand-300 border border-brand-500/30',
    trainee: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  };

  const SidebarContent = () => (
    <aside className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-border">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-900/50">
          <AcademicCapIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">TMS</p>
          <p className="text-xs text-slate-500">Training Management</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-surface-hover'
              }`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRightIcon className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User card */}
      <div className="px-3 py-4 border-t border-surface-border">
        <div className="flex items-center gap-3 px-3 py-3 rounded-lg bg-surface">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
            {(profile?.firstName?.[0] || user?.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-100 truncate">
              {profile ? `${profile.firstName} ${profile.lastName}` : user?.email}
            </p>
            <span className={`badge text-[10px] mt-0.5 ${roleBadgeColor[user?.role] || ''}`}>
              {user?.role}
            </span>
          </div>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="p-1.5 rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Logout"
          >
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 bg-surface-card border-r border-surface-border flex-shrink-0">
        <SidebarContent />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-50 w-72 bg-surface-card border-r border-surface-border animate-slide-up">
            <button
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-surface-card border-b border-surface-border">
          <button
            id="mobile-menu-btn"
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-surface-hover"
          >
            <Bars3Icon className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <AcademicCapIcon className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-semibold text-white">TMS</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
