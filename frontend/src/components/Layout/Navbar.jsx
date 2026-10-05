import React from 'react';
import { FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';
import ChatIcon from '../Chat/ChatIcon';
import ChatBot from '../Chat/ChatBot';
import ThemeToggle from './ThemeToggle';
import logo from '../../assets/sotacib-logo.jpg';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-40 flex h-16 items-center justify-between gap-4 border-b border-[var(--line)] bg-[#f3f1ec]/90 px-4 backdrop-blur-md dark:bg-[#141413]/90 sm:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <div className="h-9 w-9 flex-shrink-0 overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 md:hidden dark:ring-slate-700">
          <img src={logo} alt="SOTACIB" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-['Inter_Tight'] text-lg font-light tracking-tight text-[var(--ink)]">SOTACIB <span className="font-medium">Workflow</span></h1>
          <p className="hidden truncate text-xs text-slate-500 dark:text-slate-400 sm:block">
            Bonjour{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1">
          <NotificationBell />
          <ChatIcon />
          <ThemeToggle />
        </div>

        <ChatBot />

        <div className="ml-1 hidden items-center gap-3 rounded-full border border-[var(--line)] bg-[var(--surface)] py-1 pl-1 pr-4 sm:flex">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-stone-900 text-sm font-medium text-stone-100 dark:bg-stone-100 dark:text-stone-900">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="leading-tight">
            <p className="max-w-[140px] truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.fullName}</p>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{user?.role}</p>
          </div>
        </div>

        <button
          onClick={logout}
          className="ui-icon-btn hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          title="Déconnexion"
          aria-label="Déconnexion"
        >
          <FiLogOut size={18} />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
