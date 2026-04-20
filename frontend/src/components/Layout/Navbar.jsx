import React from 'react';
import { useAuth } from '../context/AuthContext';
import NotificationBell from '../Notifications/NotificationBell';
import ChatIcon from '../Chat/ChatIcon';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-white/95 border-b border-slate-200 px-6 py-3 flex justify-between items-center sticky top-0 z-20 backdrop-blur-sm">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-blue-700 tracking-tight">SOTACIB Workflow</h1>
      </div>
      <div className="flex items-center space-x-4">
        <NotificationBell />
        <ChatIcon />
        <span className="text-slate-600 text-sm">{user?.fullName} ({user?.role})</span>
        <button onClick={logout} className="btn btn-danger text-sm">Déconnexion</button>
      </div>
    </nav>
  );
};

export default Navbar;