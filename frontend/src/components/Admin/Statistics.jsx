import React, { useEffect, useState, useMemo } from 'react';
import { getStats, getUsers } from '../services/adminService';
import { getRequests } from '../services/requestService';
import { toast } from 'react-toastify';
import { downloadCsv, fileDateStamp, requestsToRows, statusLabel } from '../../utils/exportFiles';
import { exportRequestsExcel } from '../../utils/excelExport';
import {
  FiUsers, FiFileText, FiClock, FiActivity, FiTrendingUp,
  FiRefreshCw, FiFilter, FiSearch, FiBarChart2, FiPieChart,
  FiUserCheck, FiPercent, FiDownload, FiTarget, FiShield,
  FiChevronLeft, FiChevronRight, FiChevronDown, FiX
} from 'react-icons/fi';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement,
  Title, Tooltip, Legend, ArcElement, Filler
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement, Filler);

const Statistics = () => {
  const [users, setUsers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: '', department: '', dateRange: 'all' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    loadData();
    if (autoRefresh) {
      const interval = setInterval(loadData, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadData = async () => {
    try {
      const [statsData, requestsData, usersData] = await Promise.all([getStats(), getRequests(), getUsers()]);
      setRequests(requestsData);
      setUsers(usersData);
    } catch (error) {
      toast.error('Erreur chargement données');
    } finally {
      setLoading(false);
    }
  };

  // Calculs analytiques
  const analytics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const totalRequests = requests.length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const inProgress = requests.filter(r => r.status === 'in_progress').length;
    const returned = requests.filter(r => r.status === 'returned').length;
    const approvalRate = totalRequests ? (approved / totalRequests * 100).toFixed(1) : 0;
    const avgProcessingTime = '2.4j'; // À adapter avec vos données réelles
    const healthScore = (approved / (totalRequests || 1) * 0.6 + activeUsers / (totalUsers || 1) * 0.4) * 100;
    const departments = [...new Set(users.map(u => u.department).filter(Boolean))];
    const monthlyTrend = Array(12).fill(0);
    requests.forEach(r => { if (r.createdAt) monthlyTrend[new Date(r.createdAt).getMonth()] += 1; });
    return { totalUsers, activeUsers, totalRequests, approved, rejected, pending, inProgress, returned, approvalRate, avgProcessingTime, healthScore, departments, monthlyTrend };
  }, [users, requests]);

  // Filtrage
  const filteredRequests = useMemo(() => {
    let filtered = [...requests];
    if (searchTerm) {
      filtered = filtered.filter(r => r.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.workflowType?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (filters.status) filtered = filtered.filter(r => r.status === filters.status);
    if (filters.department) filtered = filtered.filter(r => r.creator?.department === filters.department);
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const cutoff = new Date();
      if (filters.dateRange === 'month') cutoff.setMonth(now.getMonth() - 1);
      else if (filters.dateRange === 'quarter') cutoff.setMonth(now.getMonth() - 3);
      else if (filters.dateRange === 'year') cutoff.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(r => new Date(r.createdAt) >= cutoff);
    }
    return filtered;
  }, [requests, searchTerm, filters]);

  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);
  const paginatedRequests = filteredRequests.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Graphiques
  const lineData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
    datasets: [{
      label: 'Demandes',
      data: analytics.monthlyTrend,
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.05)',
      fill: true,
      tension: 0.3,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#fff'
    }]
  };

  const statusChartData = {
    labels: ['Approuvées', 'Rejetées', 'En attente', 'En cours', 'Retournées'],
    datasets: [{
      data: [analytics.approved, analytics.rejected, analytics.pending, analytics.inProgress, analytics.returned],
      backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6']
    }]
  };

  // Description lisible des filtres actifs, reprise dans l'export
  const describeFilters = () => {
    const parts = [];
    if (searchTerm) parts.push(`recherche « ${searchTerm} »`);
    if (filters.status) parts.push(`statut : ${statusLabel(filters.status)}`);
    if (filters.department) parts.push(`département : ${filters.department}`);
    const periods = { month: 'dernier mois', quarter: 'dernier trimestre', year: 'dernière année' };
    if (filters.dateRange !== 'all') parts.push(`période : ${periods[filters.dateRange] || filters.dateRange}`);
    return parts.length ? `Filtres : ${parts.join(', ')}` : 'Toutes les demandes';
  };

  const [exporting, setExporting] = useState(false);

  const exportExcel = async () => {
    setExporting(true);
    try {
      await exportRequestsExcel(filteredRequests, { title: 'Statistiques des demandes', filtersLabel: describeFilters() });
      toast.success('Fichier Excel téléchargé');
    } catch (error) {
      toast.error("Impossible de générer le fichier Excel");
    } finally {
      setExporting(false);
    }
  };

  const exportCSV = () => {
    downloadCsv(requestsToRows(filteredRequests), `statistiques_demandes_${fileDateStamp()}.csv`);
    toast.success('CSV téléchargé');
  };

  // Cartes KPI
  const kpis = [
    { label: 'Utilisateurs actifs', value: analytics.activeUsers, change: '+8%', icon: FiUserCheck, color: 'blue' },
    { label: 'Demandes totales', value: analytics.totalRequests, change: '+12%', icon: FiFileText, color: 'indigo' },
    { label: "Taux d'approbation", value: `${analytics.approvalRate}%`, change: '+5%', icon: FiPercent, color: 'green' },
    { label: 'Score de santé', value: `${Math.round(analytics.healthScore)}%`, change: '+2%', icon: FiActivity, color: 'purple' }
  ];

  const isDark = document.documentElement.classList.contains('dark');
  const axisColor = isDark ? '#9a948a' : '#7a756c';
  const gridColor = isDark ? 'rgba(154,148,138,0.12)' : 'rgba(122,117,108,0.14)';

  const styledLineData = {
    ...lineData,
    datasets: lineData.datasets.map((dataset) => ({
      ...dataset,
      borderColor: '#e8591a',
      backgroundColor: 'rgba(232,89,26,0.10)',
      pointBackgroundColor: '#e8591a',
      pointBorderColor: isDark ? '#1c1c1a' : '#fbfaf7',
      pointBorderWidth: 2,
      pointRadius: 4,
      borderWidth: 2.5,
      tension: 0.4,
    })),
  };

  const styledStatusData = {
    ...statusChartData,
    datasets: statusChartData.datasets.map((dataset) => ({
      ...dataset,
      backgroundColor: ['#2f7d5b', '#c23b3b', '#e0a019', '#e8591a', '#3d3b37'],
      borderColor: isDark ? '#1c1c1a' : '#fbfaf7',
      borderWidth: 3,
      hoverOffset: 6,
    })),
  };

  const kpiTiles = { blue: 'ui-tile-blue', indigo: 'ui-tile-brand', green: 'ui-tile-green', purple: 'ui-tile-violet' };

  const statusBadge = {
    approved: ['ui-badge-green', 'Approuvée'],
    rejected: ['ui-badge-red', 'Rejetée'],
    pending: ['ui-badge-amber', 'En attente'],
    in_progress: ['ui-badge-blue', 'En cours'],
    returned: ['ui-badge-violet', 'Retournée'],
  };

  /* ---------- Présentation ---------- */

  const statusSlices = [
    { key: 'approved', label: 'Approuvées', value: analytics.approved, color: '#2f7d5b' },
    { key: 'rejected', label: 'Rejetées', value: analytics.rejected, color: '#c23b3b' },
    { key: 'pending', label: 'En attente', value: analytics.pending, color: '#e0a019' },
    { key: 'in_progress', label: 'En cours', value: analytics.inProgress, color: '#e8591a' },
    { key: 'returned', label: 'Retournées', value: analytics.returned, color: '#3d3b37' },
  ];

  const typeLabels = {
    AvanceCaisse: 'Avance sur caisse',
    CreationClient: 'Création client',
    Investissement: 'Investissement',
    AvisTechnique: 'Avis technique',
  };
  const byType = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.workflowType] = (acc[r.workflowType] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);
  const maxType = byType.length ? byType[0][1] : 1;

  const peakMonth = analytics.monthlyTrend.reduce((best, value, index) => (value > analytics.monthlyTrend[best] ? index : best), 0);
  const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

  const hasFilters = searchTerm || filters.status || filters.department || filters.dateRange !== 'all';

  const pillSelect =
    'h-10 appearance-none rounded-full border border-[var(--line)] bg-[var(--surface)] pl-4 pr-9 text-sm text-[var(--ink)] outline-none transition hover:border-[var(--ink-2)] focus:border-[var(--ink-2)] focus:ring-4 focus:ring-brand-500/10';

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
              Analytique
            </p>
            <h1 className="mt-5 font-['Inter_Tight'] text-5xl font-extralight leading-none tracking-[-0.045em] sm:text-6xl">
              Statistiques
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm text-stone-200 transition hover:bg-white/15"
            >
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'animate-pulse bg-emerald-400' : 'bg-stone-500'}`} />
              {autoRefresh ? 'Live' : 'Auto off'}
            </button>
            <button
              onClick={loadData}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-stone-200 transition hover:bg-white/15"
              title="Actualiser"
            >
              <FiRefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={exportCSV}
              className="inline-flex h-10 items-center rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm text-stone-200 transition hover:bg-white/15"
              title="Données brutes, séparateur point-virgule"
            >
              CSV
            </button>
            <button
              onClick={exportExcel}
              disabled={exporting}
              className="group inline-flex h-10 items-center gap-3 rounded-full bg-white pl-5 pr-1.5 text-sm font-medium text-[#1b1b1a] transition-colors hover:bg-brand-500 hover:text-white disabled:opacity-60"
            >
              {exporting ? 'Préparation…' : 'Exporter Excel'}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b1b1a] text-white">
                <FiDownload className="h-3.5 w-3.5" />
              </span>
            </button>
          </div>
        </div>

        <div className="relative mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-[#1b1b1a]/95 px-5 py-5">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-500">
                <kpi.icon className="h-3 w-3" /> {kpi.label}
              </p>
              <p className="mt-3 font-['Inter_Tight'] text-4xl font-extralight tabular-nums tracking-[-0.04em] sm:text-5xl">
                {loading ? '—' : kpi.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] pb-5">
        <span className="mr-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
          <FiFilter className="h-3.5 w-3.5" /> Filtres
        </span>
        <div className="relative min-w-[240px] flex-1">
          <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher par référence ou type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-10 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink-2)] focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
        {[
          {
            value: filters.status,
            onChange: (e) => setFilters({ ...filters, status: e.target.value }),
            options: [['', 'Tous statuts'], ['pending', 'En attente'], ['in_progress', 'En cours'], ['approved', 'Approuvé'], ['rejected', 'Rejeté'], ['returned', 'Retourné']],
          },
          {
            value: filters.department,
            onChange: (e) => setFilters({ ...filters, department: e.target.value }),
            options: [['', 'Tous départements'], ...analytics.departments.map((d) => [d, d])],
          },
          {
            value: filters.dateRange,
            onChange: (e) => setFilters({ ...filters, dateRange: e.target.value }),
            options: [['all', 'Toute période'], ['month', 'Dernier mois'], ['quarter', 'Dernier trimestre'], ['year', 'Dernière année']],
          },
        ].map((select, i) => (
          <div key={i} className="relative">
            <select value={select.value} onChange={select.onChange} className={pillSelect}>
              {select.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
          </div>
        ))}
        {hasFilters && (
          <button
            onClick={() => { setSearchTerm(''); setFilters({ status: '', department: '', dateRange: 'all' }); }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm text-brand-500 transition hover:bg-brand-500/10"
          >
            <FiX className="h-3.5 w-3.5" /> Réinitialiser
          </button>
        )}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="ui-card p-6 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="ui-stat-label">Évolution mensuelle</p>
              <p className="mt-2 font-['Inter_Tight'] text-3xl font-light tracking-[-0.03em] text-[var(--ink)]">
                {analytics.totalRequests} <span className="text-base text-[var(--muted)]">demandes</span>
              </p>
            </div>
            {analytics.totalRequests > 0 && (
              <p className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-2)]">
                Pic d’activité : <span className="font-medium text-brand-500">{monthNames[peakMonth]}</span>
              </p>
            )}
          </div>
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
                  x: { grid: { display: false }, ticks: { color: axisColor }, border: { display: false } },
                  y: { grid: { color: gridColor }, ticks: { color: axisColor, precision: 0 }, border: { display: false }, beginAtZero: true },
                },
              }}
            />
          </div>
        </div>

        <div className="ui-card flex flex-col p-6">
          <p className="ui-stat-label">État des demandes</p>
          <div className="relative mx-auto mt-4 h-52 w-52">
            <Doughnut
              data={styledStatusData}
              options={{
                cutout: '74%',
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: { backgroundColor: '#1b1b1a', padding: 10, cornerRadius: 10 },
                },
              }}
            />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-['Inter_Tight'] text-4xl font-extralight tracking-[-0.04em] text-[var(--ink)]">{analytics.approvalRate}%</span>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">approuvées</span>
            </div>
          </div>
          <ul className="mt-6 space-y-2.5">
            {statusSlices.map((slice) => (
              <li key={slice.key} className="flex items-center gap-3 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: slice.color }} />
                <span className="text-[var(--ink-2)]">{slice.label}</span>
                <span className="ml-auto tabular-nums text-[var(--ink)]">{slice.value}</span>
                <span className="w-10 text-right text-xs tabular-nums text-[var(--muted)]">
                  {analytics.totalRequests ? Math.round((slice.value / analytics.totalRequests) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Répartition et indicateurs */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="ui-card p-6 xl:col-span-2">
          <p className="ui-stat-label">Demandes par processus</p>
          {byType.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Aucune donnée.</p>
          ) : (
            <ul className="mt-5 space-y-5">
              {byType.map(([type, count], index) => (
                <li key={type} className="grid grid-cols-[2rem_1fr_auto] items-center gap-4">
                  <span className="font-['Inter_Tight'] text-xs tabular-nums text-[var(--muted)]">{String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-[var(--ink)]">{typeLabels[type] || type}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--line-soft)]">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${(count / maxType) * 100}%`, backgroundColor: index === 0 ? '#e8591a' : 'var(--ink)' }}
                      />
                    </div>
                  </div>
                  <span className="font-['Inter_Tight'] text-2xl font-light tabular-nums tracking-[-0.03em] text-[var(--ink)]">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid grid-cols-1 gap-5">
          {[
            { label: 'Temps moyen de traitement', value: analytics.avgProcessingTime, icon: FiClock },
            { label: 'Taux de conversion', value: `${analytics.approvalRate}%`, icon: FiTarget, bar: Number(analytics.approvalRate), note: 'Objectif 75%' },
            { label: 'Score global', value: `${Math.round(analytics.healthScore)}/100`, icon: FiShield, bar: Math.round(analytics.healthScore) },
          ].map(({ label, value, icon: Icon, bar, note }) => (
            <div key={label} className="ui-card p-5">
              <div className="flex items-center justify-between">
                <p className="ui-stat-label">{label}</p>
                <Icon className="h-4 w-4 text-brand-500" />
              </div>
              <p className="mt-3 font-['Inter_Tight'] text-3xl font-light tracking-[-0.03em] text-[var(--ink)]">{value}</p>
              {bar !== undefined && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--line-soft)]">
                  <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${Math.min(100, bar)}%` }} />
                </div>
              )}
              {note && <p className="mt-2 text-xs text-[var(--muted)]">{note}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* Tableau */}
      <div className="ui-card overflow-hidden">
        <div className="flex items-end justify-between border-b border-[var(--line-soft)] px-6 py-5">
          <div>
            <p className="ui-stat-label">Registre</p>
            <h2 className="mt-1 font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">Dernières demandes</h2>
          </div>
          <span className="text-xs text-[var(--muted)]">{filteredRequests.length} enregistrement(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="ui-table">
            <thead>
              <tr>
                {['Référence', 'Type', 'Statut', 'Date', 'Demandeur'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedRequests.map(req => (
                <tr key={req.id}>
                  <td className="font-mono text-xs">{req.reference}</td>
                  <td className="!text-[var(--ink)]">{typeLabels[req.workflowType] || req.workflowType}</td>
                  <td>
                    <span className={`ui-badge ${(statusBadge[req.status] || statusBadge.returned)[0]}`}>
                      {(statusBadge[req.status] || statusBadge.returned)[1]}
                    </span>
                  </td>
                  <td className="tabular-nums">{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td>{req.user?.name || '-'}</td>
                </tr>
              ))}
              {paginatedRequests.length === 0 && (
                <tr><td colSpan="5" className="py-12 text-center !text-[var(--muted)]">Aucune demande trouvée</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[var(--line-soft)] px-6 py-3">
            <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="ui-btn ui-btn-secondary ui-btn-sm"><FiChevronLeft /> Précédent</button>
            <span className="text-xs text-[var(--muted)]">Page <span className="font-medium text-[var(--ink)]">{currentPage}</span> / {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="ui-btn ui-btn-secondary ui-btn-sm">Suivant <FiChevronRight /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Statistics;
