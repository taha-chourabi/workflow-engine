import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { getOrgChart, updateOrgChart } from '../services/adminService';
import { toast } from 'react-toastify';

// Vue 3D chargée uniquement à la demande (bibliothèque three.js volumineuse)
const OrgChart3D = lazy(() => import('./OrgChart3D'));

const isWebGLAvailable = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (canvas.getContext('webgl2') || canvas.getContext('webgl')));
  } catch (e) {
    return false;
  }
};

// Filet de sécurité : une erreur dans la vue 3D ne doit jamais casser la page
class View3DBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('Vue 3D de l’organigramme indisponible :', error);
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}

const OrgChart = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('2d');

  const normalizeText = (value) =>
    (value || '').toString().toLowerCase().trim();

  const managerNameByUser = useMemo(() => {
    return users.reduce((acc, user) => {
      acc[user.id] = user.fullName;
      return acc;
    }, {});
  }, [users]);

  const departmentHierarchy = useMemo(() => {
    const nodes = {};
    users.forEach((user) => {
      nodes[user.id] = { ...user, children: [] };
    });

    const roots = {};
    users.forEach((user) => {
      const departmentKey = user.departmentKey || normalizeText(user.department) || 'sans_departement';
      if (!roots[departmentKey]) roots[departmentKey] = { label: user.department || 'Sans département', users: [] };
      const managerNode = user.effectiveManagerId ? nodes[user.effectiveManagerId] : null;

      if (managerNode && ((managerNode.departmentKey || normalizeText(managerNode.department)) === departmentKey)) {
        managerNode.children.push(nodes[user.id]);
      } else {
        roots[departmentKey].users.push(nodes[user.id]);
      }
    });

    Object.values(roots).forEach((group) => {
      group.users.sort((a, b) => Number(a.hierarchyLevel) - Number(b.hierarchyLevel));
    });

    return roots;
  }, [users]);

  const loadOrgChart = async () => {
    try {
      const data = await getOrgChart();
      const sorted = [...data].sort((a, b) => {
        if (a.department !== b.department) {
          return String(a.department).localeCompare(String(b.department));
        }
        if (Number(a.hierarchyLevel) !== Number(b.hierarchyLevel)) {
          return Number(a.hierarchyLevel) - Number(b.hierarchyLevel);
        }
        return String(a.fullName).localeCompare(String(b.fullName));
      });
      setUsers(sorted);
    } catch (error) {
      toast.error('Erreur lors du chargement de l organigramme');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgChart();
  }, []);

  /* ---------- Présentation ---------- */

  const countTree = (node) => 1 + node.children.reduce((sum, child) => sum + countTree(child), 0);
  const departments = Object.entries(departmentHierarchy);
  const maxLevel = users.reduce((max, u) => Math.max(max, Number(u.hierarchyLevel) || 0), 0);
  const managersCount = new Set(users.map((u) => u.effectiveManagerId).filter(Boolean)).size;

  const renderUserNode = (user, level = 0, isLast = true) => (
    <li key={user.id} className="relative">
      {level > 0 && (
        <>
          <span className="absolute -left-6 -top-3 h-10 w-px bg-[var(--line)]" />
          <span className="absolute -left-6 top-7 h-px w-5 bg-[var(--line)]" />
          {!isLast && <span className="absolute -left-6 top-7 -bottom-3 w-px bg-[var(--line)]" />}
        </>
      )}
      <div className="group flex items-center gap-4 rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--ink-2)]">
        <span
          className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium ${
            level === 0 ? 'bg-brand-500 text-white' : 'bg-[#1b1b1a] text-white'
          }`}
        >
          {user.fullName?.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-['Inter_Tight'] text-lg font-light leading-tight tracking-[-0.02em] text-[var(--ink)]">{user.fullName}</p>
          <p className="mt-0.5 truncate text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{user.role || 'Rôle non défini'}</p>
          <p className="mt-1 hidden truncate text-xs text-[var(--muted)] sm:block">
            Manager : <span className="text-[var(--ink-2)]">{user.effectiveManagerId ? user.effectiveManagerName || managerNameByUser[user.effectiveManagerId] : 'Aucun'}</span>
            {user.email && <span> · {user.email}</span>}
          </p>
        </div>
        <span className="flex flex-shrink-0 flex-col items-center rounded-xl border border-[var(--line)] px-2.5 py-1.5">
          <span className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">Niv.</span>
          <span className="font-['Inter_Tight'] text-lg font-light leading-none tabular-nums text-[var(--ink)]">{user.hierarchyLevel}</span>
        </span>
      </div>

      {user.children.length > 0 && (
        <ul className="relative ml-10 mt-3 space-y-3 pl-6">
          {user.children.map((child, index) => renderUserNode(child, level + 1, index === user.children.length - 1))}
        </ul>
      )}
    </li>
  );

  return (
    <div className="ui-page">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#1b1b1a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.45),transparent_65%)] blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              <span className="h-px w-6 bg-brand-500" />
              Administration
            </p>
            <h1 className="mt-5 font-['Inter_Tight'] text-5xl font-extralight leading-none tracking-[-0.045em] sm:text-6xl">
              Organigramme
            </h1>
          </div>
          <div className="inline-flex self-start rounded-full border border-white/15 bg-white/[0.06] p-1 lg:self-auto">
            {[
              ['2d', 'Vue 2D'],
              ['3d', 'Vue 3D'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setView(value)}
                className={`h-9 rounded-full px-5 text-sm font-medium transition ${
                  view === value ? 'bg-white text-[#1b1b1a]' : 'text-stone-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {[
            { label: 'Départements', value: departments.length },
            { label: 'Utilisateurs actifs', value: users.length },
            { label: 'Responsables', value: managersCount },
            { label: 'Niveaux hiérarchiques', value: maxLevel },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#1b1b1a]/95 px-5 py-5">
              <p className="text-[10px] uppercase tracking-[0.16em] text-stone-500">{label}</p>
              <p className="mt-3 font-['Inter_Tight'] text-4xl font-extralight tabular-nums tracking-[-0.04em] sm:text-5xl">{loading ? '—' : value}</p>
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {[1, 2].map((i) => <div key={i} className="ui-skeleton h-72 rounded-[1.1rem]" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="ui-card ui-empty">
          <p className="ui-empty-title">Aucun utilisateur actif.</p>
        </div>
      ) : view === '3d' ? (
        (() => {
          const fallback = (
            <div className="flex h-[420px] flex-col items-center justify-center rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] px-6 text-center">
              <p className="font-['Inter_Tight'] text-2xl font-light text-[var(--ink)]">La vue 3D n’est pas disponible sur ce poste</p>
              <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
                Le navigateur ne permet pas l’affichage 3D (WebGL désactivé ou accélération matérielle coupée).
              </p>
              <button
                type="button"
                onClick={() => setView('2d')}
                className="mt-6 rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--app-bg)] transition hover:bg-brand-500 hover:text-white"
              >
                Revenir à la vue 2D
              </button>
            </div>
          );
          if (!isWebGLAvailable()) return fallback;
          return (
            <View3DBoundary fallback={fallback}>
              <Suspense fallback={<div className="ui-skeleton h-[640px] rounded-[1.25rem]" />}>
                <OrgChart3D users={users} />
              </Suspense>
            </View3DBoundary>
          );
        })()
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-2">
          {departments.map(([departmentKey, group], index) => {
            const total = group.users.reduce((sum, u) => sum + countTree(u), 0);
            return (
              <section
                key={departmentKey}
                className="overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--app-bg)] animate-fade-up"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <div className="flex items-end justify-between gap-4 bg-[var(--surface)] px-6 py-5">
                  <div className="flex items-baseline gap-4">
                    <span className="font-['Inter_Tight'] text-sm tabular-nums text-brand-500">{String(index + 1).padStart(2, '0')}</span>
                    <h2 className="font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">{group.label}</h2>
                  </div>
                  <span className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--muted)]">
                    {total} membre{total > 1 ? 's' : ''}
                  </span>
                </div>
                <ul className="space-y-3 border-t border-[var(--line-soft)] p-5">
                  {group.users.map((user) => renderUserNode(user))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrgChart;
