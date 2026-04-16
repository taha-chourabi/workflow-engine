import React, { useEffect, useMemo, useState } from 'react';
import { getWorkflows } from '../services/workflowService';
import { getRequests } from '../services/requestService';
import { toast } from 'react-toastify';

const WorkflowManagement = () => {
  const [workflows, setWorkflows] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
    const intervalId = setInterval(() => {
      loadTrackingData();
    }, 10000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Suivi  des demandes </h1>
      <p className="text-slate-500 mb-6">
      </p>
      <div className="card">
        {loading ? (
          <p>Chargement...</p>
        ) : trackedRequests.length === 0 ? (
          <p className="text-gray-500">Aucune demande trouvée.</p>
        ) : (
          <div className="space-y-4">
            {trackedRequests.map((request) => (
              <div
                key={request.id}
                className="rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="space-y-1">
                    <h2 className="font-bold text-lg text-slate-800">{request.reference} - {request.workflowType}</h2>
                    <p className="text-sm text-slate-600">
                      Demandeur: <span className="font-medium">{request.creator?.fullName || request.createdBy}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusBadgeClass(request.status)}`}>
                      {request.status}
                    </span>
                    <p className="text-xs text-slate-500">
                      {request.createdAt ? new Date(request.createdAt).toLocaleString() : '-'}
                    </p>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                      style={{ width: `${request.progress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-between text-sm">
                    <p>
                      Étape actuelle: <strong className="text-slate-800">{request.currentStepName}</strong>
                    </p>
                    <p className="text-slate-600 font-semibold">{request.progress}%</p>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Prochaine étape: {request.upcomingStep || 'Aucune'}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                    <h3 className="font-semibold mb-1 text-emerald-800">Validé par</h3>
                    {request.validatedBy.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucune validation pour le moment.</p>
                    ) : (
                      <ul className="text-sm list-disc pl-5 text-slate-700">
                        {request.validatedBy.map((name, idx) => (
                          <li key={`${request.id}-v-${idx}`}>{name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3">
                    <h3 className="font-semibold mb-1 text-blue-800">Reste à faire</h3>
                    {request.remainingSteps.length === 0 ? (
                      <p className="text-sm text-slate-500">Aucune étape restante.</p>
                    ) : (
                      <ul className="text-sm list-disc pl-5 text-slate-700">
                        {request.remainingSteps.map((stepName, idx) => (
                          <li key={`${request.id}-r-${idx}`}>{stepName}</li>
                        ))}
                      </ul>
                    )}
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
