import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiHome, FiFileText, FiUsers, FiPieChart, FiGitBranch } from 'react-icons/fi';
import logo from '../../assets/sotacib-logo.jpg';
import workflowLogo from '../../assets/logo.png';

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
      <div className="mb-6 rounded-3xl bg-white/90 border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden">
            <img src={logo} alt="SOTACIB" className="h-full w-full object-contain" />
          </div>
          <div className="w-16 h-16 rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden">
            <img src={workflowLogo} alt="Workflow" className="h-full w-full object-contain" />
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">SOTACIB Workflow</p>
        </div>
      </div>
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