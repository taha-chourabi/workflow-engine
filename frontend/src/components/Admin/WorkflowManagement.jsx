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
      case 'approved': return <FiCheckCircle className="w-5 h-5" />;
      case 'rejected': return <FiXCircle className="w-5 h-5" />;
      case 'in_progress': return <FiActivity className="w-5 h-5" />;
      case 'pending': return <FiClock className="w-5 h-5" />;
      case 'returned': return <FiAlertCircle className="w-5 h-5" />;
      default: return <FiZap className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'returned': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Suivi des Workflows
              </h1>
              <p className="text-gray-600 mt-1">Surveillance et gestion de tous les workflows en temps réel</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  autoRefresh 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <FiRefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        {!loading && trackedRequests.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
                  <div className="text-sm text-gray-600">Total Workflows</div>
                </div>
                <FiActivity className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
                  <div className="text-sm text-green-600">Approuvés</div>
                </div>
                <FiCheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{stats.in_progress}</div>
                  <div className="text-sm text-blue-600">En cours</div>
                </div>
                <FiActivity className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-violet-50 rounded-xl p-4 shadow-sm border border-violet-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-violet-600">{stats.pending}</div>
                  <div className="text-sm text-violet-600">En attente</div>
                </div>
                <FiClock className="w-8 h-8 text-violet-500" />
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                  <div className="text-sm text-red-600">Rejetés</div>
                </div>
                <FiXCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-amber-600">{stats.returned}</div>
                  <div className="text-sm text-amber-600">Retournés</div>
                </div>
                <FiAlertCircle className="w-8 h-8 text-amber-500" />
              </div>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-slate-600">{stats.draft}</div>
                  <div className="text-sm text-slate-600">Brouillons</div>
                </div>
                <FiZap className="w-8 h-8 text-slate-500" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-indigo-600">{stats.avgProgress}%</div>
                  <div className="text-sm text-indigo-600">Progression Moy.</div>
                </div>
                <FiTrendingUp className="w-8 h-8 text-indigo-500" />
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-lg">Chargement des workflows...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FiActivity className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {trackedRequests.length === 0 ? 'Aucun workflow trouvé' : 'Aucun résultat trouvé'}
            </h3>
            <p className="text-gray-600 mb-6">
              {trackedRequests.length === 0 
                ? 'Les workflows apparaîtront ici une fois créés' 
                : 'Essayez de modifier vos filtres de recherche'}
            </p>
          </div>
        )}

        {/* Workflow Cards Grid */}
        {!loading && filteredRequests.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRequests.map((request, index) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 animate-fadeIn"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono font-semibold">
                          {request.reference}
                        </div>
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor(request.status)}`}>
                          {getStatusIcon(request.status)}
                          <span className="text-sm font-medium capitalize">
                            {request.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {request.workflowType}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                        <div className="flex items-center gap-1">
                          <FiUser className="w-4 h-4 text-gray-400" />
                          {request.creator?.fullName || request.createdBy || 'N/A'}
                        </div>
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-4 h-4 text-gray-400" />
                          {request.createdAt ? new Date(request.createdAt).toLocaleDateString('fr-FR') : '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress Section */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progression du workflow</span>
                      <span className="text-sm font-bold text-gray-900">{request.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(request.progress)}`}
                        style={{ width: `${request.progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        <strong>Étape actuelle:</strong> {request.currentStepName}
                      </span>
                      {request.upcomingStep && (
                        <span className="text-gray-600">
                          <strong>Prochaine:</strong> {request.upcomingStep}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FiCheckCircle className="w-4 h-4 text-green-600" />
                        <h3 className="font-semibold text-green-800 text-sm">Validé par</h3>
                      </div>
                      {request.validatedBy.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune validation pour le moment</p>
                      ) : (
                        <div className="space-y-1">
                          {request.validatedBy.map((name, idx) => (
                            <div key={`${request.id}-v-${idx}`} className="text-sm text-gray-700 flex items-center gap-2">
                              <FiUser className="w-3 h-3 text-gray-400" />
                              {name}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <FiTarget className="w-4 h-4 text-blue-600" />
                        <h3 className="font-semibold text-blue-800 text-sm">Étapes restantes</h3>
                      </div>
                      {request.remainingSteps.length === 0 ? (
                        <p className="text-sm text-gray-500">Aucune étape restante</p>
                      ) : (
                        <div className="space-y-1">
                          {request.remainingSteps.slice(0, 3).map((stepName, idx) => (
                            <div key={`${request.id}-r-${idx}`} className="text-sm text-gray-700 flex items-center gap-2">
                              <FiZap className="w-3 h-3 text-gray-400" />
                              {stepName}
                            </div>
                          ))}
                          {request.remainingSteps.length > 3 && (
                            <p className="text-xs text-gray-500 mt-1">
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
    </div>
  );
};

export default WorkflowManagement;
