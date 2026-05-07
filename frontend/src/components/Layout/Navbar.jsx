import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';
import ChatIcon from '../Chat/ChatIcon';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-gradient-to-r from-slate-900 via-blue-900 to-cyan-700 px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-2xl shadow-slate-900/20 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-3xl bg-white/15 border border-white/20 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-slate-900/30">
          S
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">SOTACIB Workflow</h1>
          <p className="text-sm text-slate-200/90">Pilotage des demandes, users et workflows</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-3 rounded-3xl bg-white/10 border border-white/15 px-4 py-2 text-white shadow-sm shadow-slate-900/10">
          <NotificationBell />
          <ChatIcon />
          <span className="text-sm">Messages / Notifications</span>
        </div>
        <div className="flex items-center gap-3 rounded-3xl bg-white/10 border border-white/15 px-4 py-2 text-white shadow-sm shadow-slate-900/10">
          <div className="h-10 w-10 rounded-full bg-white/20 grid place-items-center text-base font-semibold text-white">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <div className="text-sm">
            <p className="font-semibold text-white">{user?.fullName}</p>
            <p className="text-[0.75rem] text-slate-200/80">{user?.role}</p>
          </div>
        </div>
        <button onClick={logout} className="btn btn-danger text-sm">Déconnexion</button>
      </div>
    </nav>
  );
};

export default Navbar;