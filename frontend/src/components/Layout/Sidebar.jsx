import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiArrowUpRight } from 'react-icons/fi';
import logo from '../../assets/sotacib-logo.jpg';

const Sidebar = ({ isAdmin }) => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Tableau de bord' },
    { path: '/requests', label: 'Mes demandes' },
    { path: '/chats', label: 'Messages' },
  ];

  const adminItems = [
    { path: '/admin/users', label: 'Utilisateurs' },
    { path: '/admin/orgchart', label: 'Organigramme' },
    { path: '/admin/workflows', label: 'Workflows' },
    { path: '/admin/stats', label: 'Statistiques' },
  ];

  const isActivePath = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const renderItem = (item, index, offset = 0) => {
    const isActive = isActivePath(item.path);
    return (
      <Link
        key={item.path}
        to={item.path}
        className={`group flex items-center gap-3 border-b border-white/[0.06] py-3 text-[15px] transition-colors duration-200 ${
          isActive ? 'text-white' : 'text-stone-400 hover:text-white'
        }`}
      >
        <span className={`w-6 font-['Inter_Tight'] text-[11px] tabular-nums ${isActive ? 'text-brand-400' : 'text-stone-600'}`}>
          {String(index + 1 + offset).padStart(2, '0')}
        </span>
        <span className={`flex-1 font-['Inter_Tight'] tracking-tight ${isActive ? 'font-medium' : 'font-light'}`}>{item.label}</span>
        {isActive ? (
          <span className="h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_0_4px_rgba(232,89,26,0.18)]" />
        ) : (
          <FiArrowUpRight size={14} className="text-stone-600 opacity-0 transition group-hover:opacity-100" />
        )}
      </Link>
    );
  };

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col bg-[#1b1b1a] text-stone-200 md:flex">
      <div className="flex h-20 items-center gap-3 px-6">
        <div className="h-9 w-9 overflow-hidden rounded-full bg-white p-0.5">
          <img src={logo} alt="SOTACIB" className="h-full w-full rounded-full object-contain" />
        </div>
        <div className="leading-tight">
          <p className="font-['Inter_Tight'] text-[15px] font-medium tracking-tight text-white">SOTACIB</p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-stone-500">Workflow</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
        <p className="mb-1 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
          <span className="h-px w-5 bg-brand-500" /> Espace
        </p>
        <div>{navItems.map((item, i) => renderItem(item, i))}</div>

        {isAdmin && (
          <>
            <p className="mb-1 mt-8 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
              <span className="h-px w-5 bg-brand-500" /> Administration
            </p>
            <div>{adminItems.map((item, i) => renderItem(item, i, navItems.length))}</div>
          </>
        )}
      </nav>

      <div className="m-4 rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/[0.06]">
        <svg viewBox="0 0 24 24" className="h-6 w-6 text-brand-500" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M5 5l14 14M19 5L5 19" />
        </svg>
        <p className="mt-3 font-['Inter_Tight'] text-[15px] font-light leading-snug text-white">
          Des circuits de validation plus rapides et traçables.
        </p>
        <p className="mt-2 text-[11px] text-stone-500">Assistant disponible en haut à droite.</p>
      </div>
    </aside>
  );
};

export default Sidebar;
