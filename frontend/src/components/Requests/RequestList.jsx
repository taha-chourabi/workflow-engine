import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { deleteRequest, getRequests } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiFileText, FiCalendar, FiUser, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle, FiTrash2, FiFilter, FiSearch, FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight, FiArrowUpRight, FiGrid, FiList, FiDollarSign, FiUserPlus, FiTrendingUp, FiTool } from 'react-icons/fi';

const RequestList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem('darkMode') === 'true'; } catch (e) { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('darkMode', darkMode ? 'true' : 'false'); } catch (e) {}
  }, [darkMode]);

  useEffect(() => {
    loadRequests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="w-5 h-5" />;
      case 'pending': return <FiClock className="w-5 h-5" />;
      case 'rejected': return <FiXCircle className="w-5 h-5" />;
      case 'in_progress': return <FiAlertCircle className="w-5 h-5" />;
      default: return <FiFileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusPercentage = (count) => {
    if (!stats.total) return 0;
    return Math.round((count / stats.total) * 100);
  };

  const getStatusBarClass = (status) => {
    switch (status) {
      case 'approved': return 'bg-gradient-to-r from-emerald-500 to-lime-400';
      case 'pending': return 'bg-gradient-to-r from-sky-500 to-cyan-500';
      case 'rejected': return 'bg-gradient-to-r from-red-500 to-rose-500';
      case 'in_progress': return 'bg-gradient-to-r from-amber-500 to-yellow-400';
      case 'draft': return 'bg-gradient-to-r from-slate-500 to-slate-400';
      default: return 'bg-gradient-to-r from-slate-500 to-slate-400';
    }
  };

  const statusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Approuvé';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      case 'in_progress': return 'En cours';
      case 'draft': return 'Brouillon';
      default: return status;
    }
  };

  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.workflowType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || req.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getSortedRequests = (items) => {
    if (!sortBy) return items;
    return [...items].sort((a, b) => {
      const aVal = a[sortBy] || '';
      const bVal = b[sortBy] || '';
      if (sortBy === 'createdAt') {
        return sortDir === 'asc' ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
      }
      const A = String(aVal).toLowerCase();
      const B = String(bVal).toLowerCase();
      if (A < B) return sortDir === 'asc' ? -1 : 1;
      if (A > B) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const sortedRequests = getSortedRequests(filteredRequests);
  const totalPages = Math.max(1, Math.ceil(sortedRequests.length / pageSize));
  // Une recherche ou un filtre peut réduire le nombre de pages : on ne reste jamais sur une page vide
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = sortedRequests.slice((safePage - 1) * pageSize, safePage * pageSize);

  const tableStatusLabel = (status) => ({
    draft: 'Brouillon',
    pending: 'En attente',
    in_progress: 'En cours',
    returned: 'Retournée',
    approved: 'Approuvée',
    rejected: 'Refusée',
  }[status] || status);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
    setCurrentPage(1);
  };

  const changePage = (delta) => {
    setCurrentPage((p) => {
      const next = Math.min(p, totalPages) + delta;
      if (next < 1) return 1;
      if (next > totalPages) return totalPages;
      return next;
    });
  };

  const getStatusStats = () => ({
    total: requests.length,
    approved: requests.filter((r) => r.status === 'approved').length,
    pending: requests.filter((r) => r.status === 'pending').length,
    rejected: requests.filter((r) => r.status === 'rejected').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    draft: requests.filter((r) => r.status === 'draft').length,
  });

  const stats = getStatusStats();

  const loadRequests = async () => {
    try {
      const data = await getRequests();
      const mine = data.filter((req) => Number(req.createdBy) === Number(user?.id));
      setRequests(mine);
    } catch (error) {
      toast.error('Erreur lors du chargement des demandes');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = window.confirm('Voulez-vous vraiment supprimer cette demande ?');
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteRequest(id);
      setRequests((prev) => prev.filter((req) => req.id !== id));
      toast.success('Demande supprimée avec succès');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  const statusFilters = [
    { value: 'all', label: 'Toutes', count: stats.total },
    { value: 'pending', label: 'En attente', count: stats.pending },
    { value: 'in_progress', label: 'En cours', count: stats.in_progress },
    { value: 'approved', label: 'Approuvées', count: stats.approved },
    { value: 'rejected', label: 'Rejetées', count: stats.rejected },
    { value: 'draft', label: 'Brouillons', count: stats.draft },
  ];

  const statTiles = [
    { label: 'Total', value: stats.total, tile: 'ui-tile-slate' },
    { label: 'En cours', value: stats.in_progress, tile: 'ui-tile-amber' },
    { label: 'Approuvées', value: stats.approved, tile: 'ui-tile-green' },
    { label: 'Rejetées', value: stats.rejected, tile: 'ui-tile-red' },
  ];

  const distribution = [
    { status: 'approved', color: '#2f7d5b' },
    { status: 'in_progress', color: '#e8591a' },
    { status: 'pending', color: '#3b82c4' },
    { status: 'rejected', color: '#c23b3b' },
    { status: 'draft', color: '#a8a195' },
  ];

  const formatDate = (value) =>
    new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

  const workflowMeta = (type) => {
    const map = {
      AvanceCaisse: { label: 'Avance sur caisse', icon: FiDollarSign },
      CreationClient: { label: 'Création client', icon: FiUserPlus },
      Investissement: { label: 'Investissement', icon: FiTrendingUp },
      AvisTechnique: { label: 'Avis technique', icon: FiTool },
    };
    return map[type] || { label: type, icon: FiFileText };
  };

  const statusTone = (status) => {
    const map = {
      draft: { color: '#a8a195', light: '#d8d3c9', progress: 10 },
      pending: { color: '#3b82c4', light: '#93c5fd', progress: 30 },
      in_progress: { color: '#e8591a', light: '#fdba8c', progress: 60 },
      returned: { color: '#8a6bd1', light: '#c4b5fd', progress: 45 },
      approved: { color: '#2f9e6b', light: '#86efac', progress: 100 },
      rejected: { color: '#d64545', light: '#fca5a5', progress: 100 },
    };
    return map[status] || map.draft;
  };

  const SortIcon = ({ column }) =>
    sortBy === column ? (sortDir === 'asc' ? <FiChevronUp className="ml-1 inline-block" /> : <FiChevronDown className="ml-1 inline-block" />) : null;

  return (
    <div className="ui-page">
      {/* En-tête */}
      <div className="ui-page-header">
        <div>
          <span className="ui-eyebrow">Gestion des demandes</span>
          <h1 className="ui-title">Mes demandes</h1>
        </div>
        <div className="ui-toolbar">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Référence ou type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ui-input ui-input-icon w-64"
            />
          </div>
          <Link to="/requests/new" className="ui-btn ui-btn-primary">
            Nouvelle demande
            <FiArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Indicateurs + répartition */}
      {!loading && requests.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {statTiles.map((tile) => (
              <div key={tile.label} className="ui-stat">
                <div className="flex items-start justify-between">
                  <p className="ui-stat-label">{tile.label}</p>
                  <span className={`ui-icon-tile h-7 w-7 ${tile.tile}`}>
                    <FiFileText className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="ui-stat-value">{tile.value}</p>
              </div>
            ))}
          </div>

          <div className="ui-card flex flex-col justify-between p-5">
            <div className="flex items-baseline justify-between">
              <p className="ui-stat-label">Répartition</p>
              <p className="text-xs text-[var(--muted)]">{stats.total} demande(s)</p>
            </div>
            <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--line-soft)]">
              {distribution.map(({ status, color }) => (
                <div
                  key={status}
                  className="h-full transition-all duration-500"
                  style={{ width: `${getStatusPercentage(stats[status])}%`, backgroundColor: color }}
                  title={`${statusLabel(status)} : ${getStatusPercentage(stats[status])}%`}
                />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {distribution.map(({ status, color }) => (
                <div key={status} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[var(--ink-2)]">{statusLabel(status)}</span>
                  <span className="ml-auto tabular-nums text-[var(--muted)]">{getStatusPercentage(stats[status])}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Barre de filtres */}
      <div className="flex flex-col gap-3 border-b border-[var(--line)] pb-3 md:flex-row md:items-center md:justify-between">
        <div className="-mb-3 flex gap-1 overflow-x-auto">
          {statusFilters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilterStatus(item.value)}
              className={`relative whitespace-nowrap px-3 pb-3 pt-1 text-sm transition-colors ${
                filterStatus === item.value
                  ? 'font-medium text-[var(--ink)]'
                  : 'text-[var(--muted)] hover:text-[var(--ink)]'
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-xs tabular-nums text-[var(--muted)]">{item.count}</span>
              {filterStatus === item.value && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-500" />}
            </button>
          ))}
        </div>
        <div className="inline-flex self-start rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 md:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
              viewMode === 'cards' ? 'bg-[var(--ink)] text-[var(--app-bg)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <FiGrid className="h-3.5 w-3.5" />
            Cartes
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition ${
              viewMode === 'table' ? 'bg-[var(--ink)] text-[var(--app-bg)]' : 'text-[var(--muted)] hover:text-[var(--ink)]'
            }`}
          >
            <FiList className="h-3.5 w-3.5" />
            Tableau
          </button>
        </div>
      </div>

      {/* Chargement */}
      {loading && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="ui-skeleton h-56 rounded-[1.1rem]" />)}
        </div>
      )}

      {/* État vide */}
      {!loading && filteredRequests.length === 0 && (
        <div className="ui-card ui-empty">
          <div className="ui-empty-icon">
            <FiFileText className="h-6 w-6" />
          </div>
          <h3 className="ui-empty-title">{requests.length === 0 ? 'Aucune demande trouvée' : 'Aucun résultat trouvé'}</h3>
          <p className="ui-empty-text">
            {requests.length === 0 ? 'Vos demandes apparaîtront ici une fois créées' : 'Essayez de modifier vos filtres de recherche'}
          </p>
          {requests.length === 0 && (
            <Link to="/requests/new" className="ui-btn ui-btn-primary mt-6">
              Créer votre première demande
              <FiArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>
      )}

      {/* Liste */}
      {!loading && filteredRequests.length > 0 && (
        viewMode === 'cards' ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredRequests.map((req, index) => {
              const assignedToMe = req.assignedTo === user?.id || req.assignee?.id === user?.id;
              const meta = workflowMeta(req.workflowType);
              const tone = statusTone(req.status);
              const WorkflowIcon = meta.icon;
              return (
                <div
                  key={req.id}
                  className="group relative flex flex-col overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] transition-all duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_28px_50px_-22px_rgba(27,27,26,0.45)] animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 9) * 50}ms` }}
                >
                  {/* Bandeau */}
                  <div className="relative overflow-hidden bg-[#1b1b1a] px-6 pb-6 pt-5 text-white">
                    <div
                      className="pointer-events-none absolute inset-0 opacity-[0.07]"
                      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '28px 28px' }}
                    />
                    <div
                      className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-60 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                      style={{ background: `radial-gradient(circle, ${tone.color}, transparent 65%)` }}
                    />
                    <span className="pointer-events-none absolute -bottom-6 right-4 select-none font-['Inter_Tight'] text-[6.5rem] font-extralight leading-none tracking-[-0.06em] text-white/[0.06]">
                      {String(index + 1).padStart(2, '0')}
                    </span>

                    <div className="relative flex items-center justify-between gap-3">
                      <span className="rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-1 font-mono text-[11px] tracking-wider text-stone-300">
                        {req.reference}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                        style={{ backgroundColor: `${tone.color}26`, color: tone.light }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tone.light }} />
                        {statusLabel(req.status)}
                      </span>
                    </div>

                    <div className="relative mt-7 flex items-end gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/15 backdrop-blur transition-colors duration-300 group-hover:bg-brand-500 group-hover:ring-brand-400">
                        <WorkflowIcon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">{req.workflowType}</p>
                        <h3 className="mt-1 truncate font-['Inter_Tight'] text-[1.6rem] font-light leading-tight tracking-[-0.03em]">
                          {meta.label}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Progression */}
                  <div className="px-6 pt-5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Avancement</span>
                      <span className="tabular-nums text-[var(--ink-2)]">{tone.progress}%</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${tone.progress}%`, backgroundColor: tone.color }}
                      />
                    </div>
                  </div>

                  {/* Détails */}
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4 px-6 pt-5 text-sm">
                    <div>
                      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]"><FiCalendar className="h-3 w-3" /> Créée le</dt>
                      <dd className="mt-1 text-[var(--ink)]">{formatDate(req.createdAt)}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]"><FiUser className="h-3 w-3" /> Créée par</dt>
                      <dd className="mt-1 truncate text-[var(--ink)]">{req.creator?.fullName || 'N/A'}</dd>
                    </div>
                    {req.assignee?.fullName && (
                      <div className="col-span-2 flex items-center gap-3 rounded-xl bg-[var(--surface-2)] px-3 py-2.5">
                        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#1b1b1a] text-xs font-medium text-white">
                          {req.assignee.fullName.charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--muted)]">Chez</p>
                          <p className="truncate text-sm text-[var(--ink)]">
                            {req.assignee.fullName}
                            {assignedToMe && <span className="ml-2 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">moi</span>}
                          </p>
                        </div>
                      </div>
                    )}
                  </dl>

                  {/* Actions */}
                  <div className="mt-auto flex items-center justify-between gap-3 px-6 pb-5 pt-6">
                    <Link
                      to={`/requests/${req.id}`}
                      className="group/btn inline-flex items-center gap-3 rounded-full bg-[var(--ink)] py-1.5 pl-4 pr-1.5 text-sm font-medium text-[var(--app-bg)] transition-colors hover:bg-brand-500 hover:text-white"
                    >
                      Voir le détail
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-bg)] text-[var(--ink)] transition-transform duration-300 group-hover/btn:rotate-45">
                        <FiArrowUpRight className="h-4 w-4" />
                      </span>
                    </Link>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] text-[var(--muted)] transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                      onClick={() => handleDelete(req.id)}
                      disabled={deletingId === req.id}
                      title="Supprimer"
                    >
                      {deletingId === req.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <FiTrash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-[var(--surface)] animate-fade-up">
            <div className="overflow-x-auto">
              <table className="requests-table w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="bg-[#1b1b1a] text-left">
                    {[
                      { key: null, label: 'N°', className: 'w-14 pl-6' },
                      { key: 'workflowType', label: 'Demande' },
                      { key: 'status', label: 'Statut' },
                      { key: null, label: 'Avancement', className: 'w-44' },
                      { key: null, label: 'Chez' },
                      { key: 'createdAt', label: 'Créée le' },
                      { key: null, label: '', className: 'pr-6' },
                    ].map((col) => (
                      <th
                        key={col.label || 'actions'}
                        onClick={col.key ? () => handleSort(col.key) : undefined}
                        className={`px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                          col.key && sortBy === col.key ? 'text-brand-400' : 'text-stone-400'
                        } ${col.key ? 'cursor-pointer select-none transition-colors hover:text-white' : ''} ${col.className || ''}`}
                      >
                        <span className="inline-flex items-center">
                          {col.label}
                          {col.key && <SortIcon column={col.key} />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedRequests.map((req, index) => {
                    const meta = workflowMeta(req.workflowType);
                    const tone = statusTone(req.status);
                    const WorkflowIcon = meta.icon;
                    const assignedToMe = req.assignedTo === user?.id || req.assignee?.id === user?.id;
                    const isOpen = !['approved', 'rejected', 'draft'].includes(req.status);
                    const days = Math.max(0, Math.floor((Date.now() - new Date(req.createdAt).getTime()) / 86400000));
                    const rowNumber = (safePage - 1) * pageSize + index + 1;
                    return (
                      <tr
                        key={req.id}
                        onClick={() => navigate(`/requests/${req.id}`)}
                        className="group relative cursor-pointer border-t border-[var(--line-soft)] transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <td className="relative py-4 pl-6 pr-4">
                          <span
                            className="absolute inset-y-0 left-0 w-[3px] origin-center scale-y-0 transition-transform duration-300 group-hover:scale-y-100"
                            style={{ backgroundColor: tone.color }}
                          />
                          <span className="font-['Inter_Tight'] text-sm tabular-nums text-[var(--muted)] transition-colors group-hover:text-brand-500">
                            {String(rowNumber).padStart(2, '0')}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3.5">
                            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#1b1b1a] text-white ring-1 ring-transparent transition-colors duration-300 group-hover:bg-brand-500 dark:bg-white/[0.07] dark:ring-white/10">
                              <WorkflowIcon className="h-4 w-4" />
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-['Inter_Tight'] text-base font-light tracking-[-0.01em] text-[var(--ink)]">{meta.label}</p>
                              <p className="mt-0.5 font-mono text-[11px] tracking-wider text-[var(--muted)]">{req.reference}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold"
                            style={{ backgroundColor: `${tone.color}1f`, color: tone.color }}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${isOpen ? 'animate-pulse' : ''}`} style={{ backgroundColor: tone.color }} />
                            {tableStatusLabel(req.status)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--line-soft)]">
                              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${tone.progress}%`, backgroundColor: tone.color }} />
                            </div>
                            <span className="w-9 text-right text-xs tabular-nums text-[var(--ink-2)]">{tone.progress}%</span>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {isOpen && req.assignee?.fullName ? (
                            <div className="flex items-center gap-2.5">
                              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-xs font-semibold text-[var(--ink)] ring-1 ring-[var(--line)]">
                                {req.assignee.fullName.charAt(0).toUpperCase()}
                              </span>
                              <span className="truncate text-[var(--ink)]">{req.assignee.fullName}</span>
                              {assignedToMe && <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-semibold text-white">moi</span>}
                            </div>
                          ) : (
                            <span className="text-[var(--muted)]">—</span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-4 py-4">
                          <p className="text-[var(--ink)]">{formatDate(req.createdAt)}</p>
                          <p className="mt-0.5 text-[11px] text-[var(--muted)]">{days === 0 ? "aujourd'hui" : `il y a ${days} j`}</p>
                        </td>

                        <td className="py-4 pl-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/requests/${req.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="group/btn inline-flex items-center gap-2 rounded-full border border-[var(--line)] py-1 pl-3.5 pr-1 text-xs font-medium text-[var(--ink)] transition-colors hover:border-transparent hover:bg-[var(--ink)] hover:text-[var(--app-bg)]"
                            >
                              Ouvrir
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ink)] text-[var(--app-bg)] transition-transform duration-300 group-hover/btn:rotate-45 group-hover/btn:bg-brand-500 group-hover/btn:text-white">
                                <FiArrowUpRight className="h-3.5 w-3.5" />
                              </span>
                            </Link>
                            <button
                              type="button"
                              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] opacity-60 transition-all hover:bg-red-50 hover:text-red-600 hover:opacity-100 group-hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(req.id);
                              }}
                              disabled={deletingId === req.id}
                              title="Supprimer"
                            >
                              {deletingId === req.id ? (
                                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : (
                                <FiTrash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pied : compteur et pagination */}
            <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-[var(--surface-2)] px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-[var(--muted)]">
                <span className="font-medium tabular-nums text-[var(--ink)]">
                  {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, sortedRequests.length)}
                </span>{' '}
                sur <span className="tabular-nums">{sortedRequests.length}</span> demande{sortedRequests.length > 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => changePage(-1)}
                  disabled={safePage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-40"
                  title="Page précédente"
                >
                  <FiChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 min-w-[2rem] rounded-full px-2 text-xs font-medium tabular-nums transition-colors ${
                      page === safePage ? 'bg-[var(--ink)] text-[var(--app-bg)]' : 'text-[var(--muted)] hover:bg-[var(--line-soft)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => changePage(1)}
                  disabled={safePage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink)] transition-colors hover:bg-[var(--ink)] hover:text-[var(--app-bg)] disabled:pointer-events-none disabled:opacity-40"
                  title="Page suivante"
                >
                  <FiChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default RequestList;
