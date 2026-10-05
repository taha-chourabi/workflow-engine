import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, deleteUser } from '../services/adminService';
import { getRequests } from '../services/requestService';
import { getUsers } from '../services/adminService';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { toast } from 'react-toastify';
import { exportRequestsExcel } from '../../utils/excelExport';
import { FiUsers, FiFileText, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiTrendingUp, FiActivity, FiCalendar, FiRefreshCw, FiFilter, FiSearch, FiSettings, FiShield, FiZap, FiTarget, FiBarChart2, FiPieChart, FiUserX, FiMoreVertical, FiDownload, FiArrowUpRight, FiChevronDown } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [exporting, setExporting] = useState(false);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="w-3 h-3" />;
      case 'rejected': return <FiXCircle className="w-3 h-3" />;
      case 'in_progress': return <FiActivity className="w-3 h-3" />;
      case 'pending': return <FiClock className="w-3 h-3" />;
      case 'returned': return <FiAlertCircle className="w-3 h-3" />;
      default: return <FiFileText className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'ui-badge-green';
      case 'rejected': return 'ui-badge-red';
      case 'in_progress': return 'ui-badge-blue';
      case 'pending': return 'ui-badge-violet';
      case 'returned': return 'ui-badge-amber';
      default: return 'ui-badge-slate';
    }
  };

  useEffect(() => {
    loadData();
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        loadData();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh]);

  const filteredRequests = recentRequests.filter(req => {
    const matchesSearch = req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.workflowType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <FiShield className="w-3 h-3" />;
      case 'validator': return <FiCheckCircle className="w-3 h-3" />;
      default: return <FiUsers className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'ui-badge-red';
      case 'validator': return 'ui-badge-blue';
      default: return 'ui-badge-slate';
    }
  };

  const loadData = async () => {
    try {
      const statsData = await getStats();
      setStats(statsData);
      const requests = await getRequests();
      const sortedRequests = [...requests].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setAllRequests(sortedRequests);
      setRecentRequests(sortedRequests.slice(0, 5));
      const users = await getUsers();
      setRecentUsers(users.slice(0, 5));
    } catch (error) {
      toast.error('Erreur chargement dashboard admin');
    }
  };

  // Export Excel mis en forme de toutes les demandes (filtrées par la recherche en cours)
  const handleExport = async () => {
    const term = searchTerm.toLowerCase();
    const rows = allRequests.filter((req) =>
      !term || req.reference?.toLowerCase().includes(term) || req.workflowType?.toLowerCase().includes(term)
    );
    setExporting(true);
    try {
      await exportRequestsExcel(rows, {
        title: 'Tableau de bord des demandes',
        filtersLabel: searchTerm ? `Recherche « ${searchTerm} »` : 'Toutes les demandes',
      });
      toast.success('Fichier Excel téléchargé');
    } catch (error) {
      toast.error("Impossible de générer le fichier Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Supprimer l utilisateur ${user.fullName} ?`);
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      toast.success('Utilisateur supprimé');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const requestsByMonth = new Array(12).fill(0);
  allRequests.forEach((request) => {
    if (!request.createdAt) return;
    const monthIndex = new Date(request.createdAt).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      requestsByMonth[monthIndex] += 1;
    }
  });

  const lineData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Demandes créées',
        data: requestsByMonth,
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,0.2)',
        tension: 0.2,
      },
    ],
  };

  const approvedCount = allRequests.filter((request) => request.status === 'approved').length;
  const rejectedCount = allRequests.filter((request) => request.status === 'rejected').length;
  const inProgressCount = allRequests.filter((request) =>
    ['pending', 'in_progress', 'returned'].includes(request.status)
  ).length;

  const doughnutData = {
    labels: ['Approuvées', 'Rejetées', 'En cours'],
    datasets: [{ data: [approvedCount, rejectedCount, inProgressCount], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'] }],
  };

  const getStatusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      pending: 'En attente',
      in_progress: 'En cours',
      approved: 'Approuvée',
      rejected: 'Refusée',
      returned: 'Retournée',
    };
    return labels[status] || status;
  };

  const statCards = [
    { title: 'Utilisateurs', value: stats.totalUsers || 0, tone: 'slate', icon: <FiUsers className="w-5 h-5" />, trend: '+12%' },
    { title: 'Total demandes', value: stats.totalRequests || 0, tone: 'blue', icon: <FiFileText className="w-5 h-5" />, trend: '+8%' },
    { title: 'Demandes en attente', value: stats.pendingRequests || 0, tone: 'violet', icon: <FiClock className="w-5 h-5" />, trend: '-3%' },
    { title: 'Demandes en cours', value: stats.inProgressRequests || 0, tone: 'amber', icon: <FiActivity className="w-5 h-5" />, trend: '+5%' },
    { title: 'Demandes approuvées', value: stats.approvedRequests || 0, tone: 'green', icon: <FiCheckCircle className="w-5 h-5" />, trend: '+15%' },
    { title: 'Demandes refusées', value: stats.rejectedRequests || 0, tone: 'red', icon: <FiXCircle className="w-5 h-5" />, trend: '-2%' },
    { title: 'Demandes retournées', value: stats.returnedRequests || 0, tone: 'orange', icon: <FiAlertCircle className="w-5 h-5" />, trend: '+1%' },
    { title: 'Terminées', value: stats.completedRequests || 0, tone: 'indigo', icon: <FiTarget className="w-5 h-5" />, trend: '+10%' },
  ];

  const toneTiles = {
    slate: 'ui-tile-slate',
    blue: 'ui-tile-blue',
    violet: 'ui-tile-violet',
    amber: 'ui-tile-amber',
    green: 'ui-tile-green',
    red: 'ui-tile-red',
    orange: 'ui-tile-amber',
    indigo: 'ui-tile-brand',
  };

  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#9a948a' : '#7a756c';
  const gridColor = isDark ? 'rgba(154,148,138,0.12)' : 'rgba(122,117,108,0.14)';

  const styledLineData = {
    ...lineData,
    datasets: lineData.datasets.map((dataset) => ({
      ...dataset,
      borderColor: '#e8591a',
      backgroundColor: 'rgba(232,89,26,0.10)',
      fill: true,
      tension: 0.4,
      borderWidth: 2.5,
      pointRadius: 3,
      pointBackgroundColor: '#e8591a',
    })),
  };

  const styledDoughnutData = {
    ...doughnutData,
    datasets: doughnutData.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: ['#2f7d5b', '#c23b3b', '#e8591a'],
      borderColor: isDark ? '#1c1c1a' : '#fbfaf7',
      borderWidth: 3,
    })),
  };

  const statusDots = {
    violet: '#8a6bd1', amber: '#e8591a', green: '#2f7d5b', red: '#c23b3b', orange: '#e0a019', indigo: '#3d3b37', slate: '#a8a195', blue: '#3b82c4',
  };

  const typeLabels = {
    AvanceCaisse: 'Avance sur caisse',
    CreationClient: 'Création client',
    Investissement: 'Investissement',
    AvisTechnique: 'Avis technique',
  };

  const doughnutLegend = [
    { label: 'Approuvées', value: approvedCount, color: '#2f7d5b' },
    { label: 'Rejetées', value: rejectedCount, color: '#c23b3b' },
    { label: 'En cours', value: inProgressCount, color: '#e8591a' },
  ];
  const doughnutTotal = approvedCount + rejectedCount + inProgressCount;

  const quickActions = [
    { label: 'Paramètres', hint: 'Configuration du système', icon: FiSettings, to: '/admin/settings' },
    { label: 'Gérer les utilisateurs', hint: 'Comptes, rôles et inscriptions', icon: FiUsers, to: '/admin/users' },
    { label: 'Voir toutes les demandes', hint: 'Registre complet', icon: FiFileText, to: '/admin/requests' },
  ];

  const pillSelect =
    'h-10 appearance-none rounded-full border border-white/15 bg-white/[0.06] pl-4 pr-9 text-sm text-white outline-none transition hover:bg-white/10 focus:border-white/40';

  return (
    <div className="ui-page">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#1b1b1a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.45),transparent_65%)] blur-2xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              <span className="h-px w-6 bg-brand-500" />
              Espace administrateur
            </p>
            <h1 className="mt-5 font-['Inter_Tight'] text-5xl font-extralight leading-none tracking-[-0.045em] sm:text-6xl">
              Tableau de bord
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="!h-10 w-52 rounded-full border border-white/15 !bg-white/[0.06] pl-10 pr-4 text-sm !text-white outline-none placeholder:text-stone-400 focus:border-white/40"
              />
            </div>
            <div className="relative">
              <select value={filterPeriod} onChange={(e) => setFilterPeriod(e.target.value)} className={`${pillSelect} !bg-white/[0.06] !text-white`}>
                <option value="all" className="text-[#1b1b1a]">Toutes les périodes</option>
                <option value="today" className="text-[#1b1b1a]">Aujourd'hui</option>
                <option value="week" className="text-[#1b1b1a]">Cette semaine</option>
                <option value="month" className="text-[#1b1b1a]">Ce mois</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm text-stone-200 transition hover:bg-white/15"
            >
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'animate-pulse bg-emerald-400' : 'bg-stone-500'}`} />
              Auto
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="group inline-flex h-10 items-center gap-3 rounded-full bg-white pl-5 pr-1.5 text-sm font-medium text-[#1b1b1a] transition-colors hover:bg-brand-500 hover:text-white disabled:opacity-60"
            >
              {exporting ? 'Préparation…' : 'Exporter'}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b1b1a] text-white">
                <FiDownload className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>

        <div className="relative mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {statCards.slice(0, 4).map((card) => (
            <div key={card.title} className="bg-[#1b1b1a]/95 px-5 py-5">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-500 [&>svg]:h-3 [&>svg]:w-3">
                {card.icon} {card.title}
              </p>
              <p className="mt-3 font-['Inter_Tight'] text-4xl font-extralight tabular-nums tracking-[-0.04em] sm:text-5xl">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Statuts */}
      <div className="grid grid-cols-2 overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface)] lg:grid-cols-4">
        {statCards.slice(4).map((card, index) => (
          <div key={card.title} className={`px-5 py-5 ${index > 0 ? 'lg:border-l' : ''} ${index % 2 === 1 ? 'border-l' : ''} ${index > 1 ? 'border-t lg:border-t-0' : ''} border-[var(--line-soft)]`}>
            <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: statusDots[card.tone] }} />
              {card.title}
            </p>
            <p className="mt-2 font-['Inter_Tight'] text-3xl font-light tabular-nums tracking-[-0.03em] text-[var(--ink)]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="ui-card p-6 xl:col-span-2">
          <p className="ui-stat-label">Évolution des demandes</p>
          <p className="mt-2 font-['Inter_Tight'] text-3xl font-light tracking-[-0.03em] text-[var(--ink)]">
            {allRequests.length} <span className="text-base text-[var(--muted)]">demandes créées</span>
          </p>
          <div className="mt-6 h-72">
            <Line
              data={styledLineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: '#1b1b1a', padding: 10, cornerRadius: 10, displayColors: false },
                },
                scales: {
                  y: { beginAtZero: true, ticks: { color: axisColor, precision: 0 }, border: { display: false }, grid: { color: gridColor } },
                  x: { ticks: { color: axisColor }, border: { display: false }, grid: { display: false } },
                },
              }}
            />
          </div>
        </div>

        <div className="ui-card flex flex-col p-6">
          <p className="ui-stat-label">Répartition des statuts</p>
          <div className="relative mx-auto mt-4 h-52 w-52">
            <Doughnut
              data={styledDoughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                cutout: '74%',
                plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1b1b1a', padding: 10, cornerRadius: 10 } },
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-['Inter_Tight'] text-4xl font-extralight tracking-[-0.04em] text-[var(--ink)]">{doughnutTotal}</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">demandes</span>
            </div>
          </div>
          <ul className="mt-6 space-y-2.5">
            {doughnutLegend.map((item) => (
              <li key={item.label} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[var(--ink-2)]">{item.label}</span>
                <span className="ml-auto tabular-nums text-[var(--ink)]">{item.value}</span>
                <span className="w-10 text-right text-xs tabular-nums text-[var(--muted)]">
                  {doughnutTotal ? Math.round((item.value / doughnutTotal) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Activité récente */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <div className="ui-card overflow-hidden">
          <div className="flex items-end justify-between border-b border-[var(--line-soft)] px-6 py-5">
            <div>
              <p className="ui-stat-label">Activité</p>
              <h2 className="mt-1 font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">Dernières demandes</h2>
            </div>
            <span className="text-xs text-[var(--muted)]">{filteredRequests.length} demande(s)</span>
          </div>
          {filteredRequests.length === 0 ? (
            <div className="ui-empty py-10"><p className="ui-empty-text">Aucune demande récente</p></div>
          ) : (
            <ul className="divide-y divide-[var(--line-soft)]">
              {filteredRequests.slice(0, 5).map((req, index) => (
                <li key={req.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/requests/${req.id}`)}
                    className="group flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-[var(--surface-2)]"
                  >
                    <span className="font-['Inter_Tight'] text-xs tabular-nums text-[var(--muted)]">{String(index + 1).padStart(2, '0')}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--ink)]">{typeLabels[req.workflowType] || req.workflowType}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        <span className="font-mono">{req.reference}</span> · {req.createdAt ? new Date(req.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </p>
                    </div>
                    <span className={`ui-badge ${getStatusColor(req.status)}`}>{getStatusLabel(req.status)}</span>
                    <FiArrowUpRight className="h-4 w-4 text-[var(--muted)] transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ui-card overflow-hidden">
          <div className="flex items-end justify-between border-b border-[var(--line-soft)] px-6 py-5">
            <div>
              <p className="ui-stat-label">Équipe</p>
              <h2 className="mt-1 font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">Derniers utilisateurs</h2>
            </div>
            <span className="text-xs text-[var(--muted)]">{recentUsers.length} utilisateur(s)</span>
          </div>
          <ul className="divide-y divide-[var(--line-soft)]">
            {recentUsers.map((user) => (
              <li key={user.id} className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-[var(--surface-2)]">
                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1b1b1a] text-sm font-medium text-white">
                  {user.fullName?.charAt(0).toUpperCase() || 'U'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[var(--ink)]">{user.fullName}</p>
                  <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                </div>
                <span className={`ui-badge ${getRoleColor(user.role)}`}>{user.role}</span>
                <button
                  onClick={() => handleDeleteUser(user)}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--muted)] opacity-60 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                  title="Supprimer l'utilisateur"
                >
                  <FiUserX className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Actions rapides */}
      <div>
        <p className="mb-3 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          <span className="h-px w-6 bg-brand-500" /> Actions rapides
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className={`group relative flex items-end justify-between overflow-hidden rounded-[1.1rem] p-6 text-left transition-all duration-300 hover:-translate-y-0.5 ${
                  index === 1
                    ? 'bg-brand-500 text-white hover:shadow-[0_24px_44px_-22px_rgba(232,89,26,0.8)]'
                    : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink-2)]'
                }`}
              >
                <div>
                  <Icon className={`h-5 w-5 ${index === 1 ? 'text-white' : 'text-brand-500'}`} />
                  <p className="mt-8 font-['Inter_Tight'] text-xl font-light tracking-[-0.02em]">{action.label}</p>
                  <p className={`mt-1 text-xs ${index === 1 ? 'text-white/75' : 'text-[var(--muted)]'}`}>{action.hint}</p>
                </div>
                <span
                  className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:rotate-45 ${
                    index === 1 ? 'bg-white text-brand-500' : 'bg-[var(--ink)] text-[var(--app-bg)]'
                  }`}
                >
                  <FiArrowUpRight className="h-4 w-4" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
