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
    <aside className="w-72 bg-gradient-to-b from-slate-50 to-slate-100 border-r border-slate-200 min-h-screen p-5 shadow-sm">
      <nav className="space-y-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center space-x-3 px-5 py-3.5 rounded-1xl transition-all duration-300 ${
                isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/40 font-semibold' 
                  : 'text-slate-700 hover:bg-blue-50/80 font-medium'
              }`}
            >
              <Icon size={22} />
              <span className="flex-1">{item.label}</span>
              {isActive && <div className="w-2 h-2 rounded-full bg-white"></div>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;