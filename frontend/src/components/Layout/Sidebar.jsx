import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiFileText, FiUsers, FiPieChart, FiGitBranch } from 'react-icons/fi';

const Sidebar = ({ isAdmin }) => {
  const location = useLocation();
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: FiHome },
    { path: '/requests', label: 'Mes demandes', icon: FiFileText },
  ];
  
  const adminItems = [
    { path: '/admin/users', label: 'Utilisateurs', icon: FiUsers },
    { path: '/admin/orgchart', label: 'Organigramme', icon: FiGitBranch },
    { path: '/admin/workflows', label: 'Workflows', icon: FiGitBranch },
    { path: '/admin/stats', label: 'Statistiques', icon: FiPieChart },
  ];

  const items = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <aside className="w-64 bg-white/95 border-r border-slate-200 min-h-screen p-4">
      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all ${
                isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:bg-blue-50'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;