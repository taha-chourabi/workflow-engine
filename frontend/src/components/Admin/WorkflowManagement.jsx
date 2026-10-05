import React, { useEffect, useMemo, useState } from 'react';
import { getWorkflows } from '../services/workflowService';
import { getRequests } from '../services/requestService';
import { toast } from 'react-toastify';
import { FiActivity, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiUser, FiCalendar, FiTrendingUp, FiFilter, FiSearch, FiRefreshCw, FiUsers, FiTarget, FiZap } from 'react-icons/fi';

const WorkflowManagement = () => {
  const [workflows, setWorkflows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="w-3 h-3" />;
      case 'rejected': return <FiXCircle className="w-3 h-3" />;
      case 'in_progress': return <FiActivity className="w-3 h-3" />;
      case 'pending': return <FiClock className="w-3 h-3" />;
      case 'returned': return <FiAlertCircle className="w-3 h-3" />;
      default: return <FiZap className="w-3 h-3" />;
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

  const getProgressColor = (progress) => {
    if (progress === 100) return 'bg-gradient-to-r from-green-500 to-emerald-400';
    if (progress >= 75) return 'bg-gradient-to-r from-blue-500 to-cyan-400';
    if (progress >= 50) return 'bg-gradient-to-r from-amber-500 to-orange-400';
    return 'bg-gradient-to-r from-gray-500 to-slate-400';
  };

  const normalizeArray = (value) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        return [];
      }
    }
    return [];
  };

  const loadTrackingData = async () => {
    try {
      const [workflowData, requestData] = await Promise.all([getWorkflows(), getRequests()]);
      setWorkflows(Array.isArray(workflowData) ? workflowData : []);
      setRequests(Array.isArray(requestData) ? requestData : []);
    } catch (error) {
      toast.error('Erreur lors du chargement du suivi workflow');
    } finally {
      setLoading(false);
    }
  };

  const workflowByName = useMemo(() => {
    const entries = workflows.map((workflow) => [workflow.name, workflow]);
    return Object.fromEntries(entries);
  }, [workflows]);

  const trackedRequests = useMemo(() => {
    const sorted = [...requests].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    return sorted.map((request) => {
      const workflow = workflowByName[request.workflowType];
      const steps = normalizeArray(workflow?.steps);
      const history = normalizeArray(request.history);
      const validateEntries = history.filter((entry) => entry?.action === 'validate');
      const validatedBy = validateEntries.map((entry) => entry.actorName || `User ${entry.actor}`);

      const stepCount = steps.length;
      const currentIndex = Number.isFinite(Number(request.currentStepIndex))
        ? Number(request.currentStepIndex)
        : 0;

      let progress = 0;
      if (request.status === 'approved') {
        progress = 100;
      } else if (stepCount > 0) {
        progress = Math.min(99, Math.max(0, Math.round((currentIndex / stepCount) * 100)));
      }

      let currentStepName = '-';
      if (request.status === 'approved') {
        currentStepName = 'Terminé';
      } else if (request.status === 'rejected') {
        currentStepName = 'Refusé';
      } else if (request.status === 'draft') {
        currentStepName = 'Brouillon';
      } else if (steps[currentIndex]) {
        currentStepName = steps[currentIndex].name || `Étape ${currentIndex + 1}`;
      }

      let remainingSteps = [];
      if (request.status === 'approved' || request.status === 'rejected') {
        remainingSteps = [];
      } else if (steps.length > 0) {
        remainingSteps = steps.slice(Math.max(currentIndex, 0)).map((step) => step.name || '-');
      }

      const upcomingStep = remainingSteps[0] || null;

      return {
        ...request,
        currentStepName,
        remainingSteps,
        upcomingStep,
        validatedBy,
        progress,
      };
    });
  }, [requests, workflowByName]);

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-emerald-100 text-emerald-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      case 'in_progress':
        return 'bg-blue-100 text-blue-700';
      case 'returned':
        return 'bg-amber-100 text-amber-700';
      case 'pending':
        return 'bg-violet-100 text-violet-700';
      case 'draft':
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  useEffect(() => {
    loadTrackingData();
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        loadTrackingData();
      }, 10000);
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh]);

  const filteredRequests = useMemo(() => {
    return trackedRequests.filter((request) => {
      const matchesSearch = 
        request.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.workflowType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (request.creator?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesFilter = filterStatus === 'all' || request.status === filterStatus;
      return matchesSearch && matchesFilter;
    });
  }, [trackedRequests, searchTerm, filterStatus]);

  const getWorkflowStats = () => {
    const stats = {
      total: trackedRequests.length,
      approved: trackedRequests.filter(r => r.status === 'approved').length,
      rejected: trackedRequests.filter(r => r.status === 'rejected').length,
      in_progress: trackedRequests.filter(r => r.status === 'in_progress').length,
      pending: trackedRequests.filter(r => r.status === 'pending').length,
      returned: trackedRequests.filter(r => r.status === 'returned').length,
      draft: trackedRequests.filter(r => r.status === 'draft').length,
      avgProgress: trackedRequests.length > 0 
        ? Math.round(trackedRequests.reduce((sum, r) => sum + r.progress, 0) / trackedRequests.length)
        : 0
    };
    return stats;
  };

  const stats = getWorkflowStats();

  const statusLabels = {
    approved: 'Approuvé',
    rejected: 'Rejeté',
    in_progress: 'En cours',
    pending: 'En attente',
    returned: 'Retourné',
    draft: 'Brouillon',
  };

  const statTiles = [
    { label: 'Total', value: stats.total, icon: FiActivity, tile: 'ui-tile-brand' },
    { label: 'Approuvés', value: stats.approved, icon: FiCheckCircle, tile: 'ui-tile-green' },
    { label: 'En cours', value: stats.in_progress, icon: FiActivity, tile: 'ui-tile-blue' },
    { label: 'En attente', value: stats.pending, icon: FiClock, tile: 'ui-tile-violet' },
    { label: 'Rejetés', value: stats.rejected, icon: FiXCircle, tile: 'ui-tile-red' },
    { label: 'Retournés', value: stats.returned, icon: FiAlertCircle, tile: 'ui-tile-amber' },
    { label: 'Brouillons', value: stats.draft, icon: FiZap, tile: 'ui-tile-slate' },
    { label: 'Progression moy.', value: `${stats.avgProgress}%`, icon: FiTrendingUp, tile: 'ui-tile-brand' },
  ];

  return (
    <div className="ui-page">
      {/* Header */}
      <div className="ui-page-header">
        <div>
          <span className="ui-eyebrow"><FiTarget /> Administration</span>
          <h1 className="ui-title">Suivi des workflows</h1>
        </div>
        <div className="ui-toolbar">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Référence, type, demandeur..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ui-input ui-input-icon w-64"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="ui-select"
          >
            <option value="all">Tous les statuts</option>
            <option value="pending">En attente</option>
            <option value="in_progress">En cours</option>
            <option value="approved">Approuvé</option>
            <option value="rejected">Rejeté</option>
            <option value="returned">Retourné</option>
            <option value="draft">Brouillon</option>
          </select>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`ui-btn border ${autoRefresh ? 'ui-toggle-on' : 'ui-btn-secondary'}`}
            title="Actualisation automatique"
          >
            <FiRefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin [animation-duration:3s]' : ''}`} />
            Auto
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {!loading && trackedRequests.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {statTiles.map(({ label, value, icon: Icon, tile }, index) => (
            <div key={label} className="ui-stat p-4 animate-fade-up" style={{ animationDelay: `${index * 40}ms` }}>
              <div className="flex items-center gap-3">
                <div className={`ui-icon-tile ${tile}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{value}</div>
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="ui-skeleton h-64 rounded-2xl"></div>)}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredRequests.length === 0 && (
        <div className="ui-card ui-empty">
          <div className="ui-empty-icon">
            <FiActivity className="h-6 w-6" />
          </div>
          <h3 className="ui-empty-title">
            {trackedRequests.length === 0 ? 'Aucun workflow trouvé' : 'Aucun résultat trouvé'}
          </h3>
          <p className="ui-empty-text">
            {trackedRequests.length === 0
              ? 'Les workflows apparaîtront ici une fois créés'
              : 'Essayez de modifier vos filtres de recherche'}
          </p>
        </div>
      )}

      {/* Workflow Cards Grid */}
      {!loading && filteredRequests.length > 0 && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredRequests.map((request, index) => (
            <div
              key={request.id}
              className="ui-card ui-card-hover animate-fade-up"
              style={{ animationDelay: `${Math.min(index, 10) * 40}ms` }}
            >
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {request.reference}
                      </span>
                      <span className={`ui-badge ${getStatusColor(request.status)}`}>
                        {getStatusIcon(request.status)}
                        {statusLabels[request.status] || request.status.replace('_', ' ')}
                      </span>
                    </div>
                    <h3 className="mt-2 truncate text-base font-semibold text-slate-900 dark:text-white">
                      {request.workflowType}
                    </h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FiUser className="h-3.5 w-3.5" />
                        {request.creator?.fullName || request.createdBy || 'N/A'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <FiCalendar className="h-3.5 w-3.5" />
                        {request.createdAt ? new Date(request.createdAt).toLocaleDateString('fr-FR') : '-'}
                      </span>
                    </div>
                  </div>
                  <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center">
                    <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className="stroke-slate-100 dark:stroke-slate-800" />
                      <circle
                        cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round"
                        className={request.progress === 100 ? 'stroke-emerald-500' : 'stroke-brand-500'}
                        strokeDasharray={`${(request.progress / 100) * 97.4} 97.4`}
                      />
                    </svg>
                    <span className="absolute text-xs font-bold text-slate-800 dark:text-slate-100">{request.progress}%</span>
                  </div>
                </div>

                {/* Progress Section */}
                <div className="mt-5">
                  <div className="ui-progress">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(request.progress)}`}
                      style={{ width: `${request.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Étape actuelle : <span className="font-semibold text-slate-800 dark:text-slate-200">{request.currentStepName}</span>
                    </span>
                    {request.upcomingStep && (
                      <span className="text-slate-500 dark:text-slate-400">
                        Prochaine : <span className="font-semibold text-slate-800 dark:text-slate-200">{request.upcomingStep}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="ui-muted-panel p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <FiCheckCircle className="h-4 w-4 text-emerald-500" />
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Validé par</h4>
                    </div>
                    {request.validatedBy.length === 0 ? (
                      <p className="text-sm text-slate-400">Aucune validation pour le moment</p>
                    ) : (
                      <div className="space-y-1">
                        {request.validatedBy.map((name, idx) => (
                          <div key={`${request.id}-v-${idx}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="ui-muted-panel p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <FiTarget className="h-4 w-4 text-brand-500" />
                      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Étapes restantes</h4>
                    </div>
                    {request.remainingSteps.length === 0 ? (
                      <p className="text-sm text-slate-400">Aucune étape restante</p>
                    ) : (
                      <div className="space-y-1">
                        {request.remainingSteps.slice(0, 3).map((stepName, idx) => (
                          <div key={`${request.id}-r-${idx}`} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                            <span className={`h-1.5 w-1.5 rounded-full ${idx === 0 ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                            {stepName}
                          </div>
                        ))}
                        {request.remainingSteps.length > 3 && (
                          <p className="mt-1 text-xs text-slate-400">
                            +{request.remainingSteps.length - 3} autre(s) étape(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WorkflowManagement;
