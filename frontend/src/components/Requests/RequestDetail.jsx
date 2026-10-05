import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequestById, takeAction, uploadAttachment, downloadRequestPdf } from '../services/requestService';
import { actionLabel, downloadBlob, downloadCsv, fieldLabel, fieldValue, formatDateTime as exportDateTime, statusLabel as exportStatusLabel, workflowLabel } from '../../utils/exportFiles';
import { exportRequestExcel } from '../../utils/excelExport';
import { getWorkflowByName } from '../services/workflowService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiArrowLeft, FiCalendar, FiCheck, FiCircle, FiClock, FiCornerUpLeft, FiDollarSign, FiDownload, FiEdit3, FiFileText, FiInfo, FiPaperclip, FiTool, FiTrendingUp, FiUser, FiUserCheck, FiUserPlus, FiX } from 'react-icons/fi';
import './RequestDetailInfo.css';

const RequestDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [workflow, setWorkflow] = useState(null);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState(null);
  const [stepFormData, setStepFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState('');

  const normalizeObject = (value) => {
    if (typeof value !== 'string') return value || {};
    try {
      return JSON.parse(value);
    } catch (error) {
      return {};
    }
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

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    const data = await getRequestById(id);
    const workflowData = await getWorkflowByName(data.workflowType);
    const normalizedData = normalizeObject(data?.data);
    setRequest({
      ...data,
      data: normalizedData,
      history: normalizeArray(data?.history),
      attachments: normalizeArray(data?.attachments),
    });
    setWorkflow(workflowData);
    setStepFormData(normalizedData || {});
  };

  const handleAction = async (action) => {
    if ((action === 'validate' || action === 'reject') && !comment.trim()) {
      toast.error('Veuillez saisir une note avant de valider ou refuser');
      return;
    }

    const currentStep = workflow?.steps?.[request?.currentStepIndex];
    const requiredFields = Array.isArray(currentStep?.requiredFields) ? currentStep.requiredFields : [];
    const missingFields = requiredFields.filter((fieldName) => {
      const value = stepFormData?.[fieldName];
      return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
    });
    if (action === 'validate' && missingFields.length > 0) {
      toast.error(`Champs obligatoires: ${missingFields.join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const result = await takeAction(request.id, action, comment, stepFormData, file);
      if (result.success) {
        toast.success(result.message || 'Action effectuée avec succès');
        if (action === 'validate') {
          navigate('/requests');
        } else {
          loadRequest();
        }
      } else {
        toast.error(result.message || 'Erreur lors de l\'action');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'action');
    } finally {
      setLoading(false);
    }
  };

  // PDF récapitulatif généré par le serveur, disponible à tout moment du circuit
  const handleDownloadPdf = async () => {
    setExporting('pdf');
    try {
      const blob = await downloadRequestPdf(request.id);
      downloadBlob(blob, `${request.reference}_recapitulatif.pdf`);
      toast.success('PDF récapitulatif téléchargé');
    } catch (error) {
      toast.error('Impossible de générer le PDF');
    } finally {
      setExporting('');
    }
  };

  // Classeur Excel mis en forme (circuit, données, historique)
  const handleDownloadExcel = async () => {
    setExporting('excel');
    try {
      await exportRequestExcel(request, workflow);
      toast.success('Fichier Excel téléchargé');
    } catch (error) {
      toast.error("Impossible de générer le fichier Excel");
    } finally {
      setExporting('');
    }
  };

  // CSV brut (séparateur « ; », compatible Excel français)
  const handleDownloadCsv = () => {
    const history = Array.isArray(request.history) ? request.history : [];
    const rows = [
      ['Référence', request.reference],
      ['Processus', workflowLabel(request.workflowType)],
      ['Statut', exportStatusLabel(request.status)],
      ['Demandeur', request.creator?.fullName || ''],
      ['Département', request.creator?.department || ''],
      ['Étape actuelle', workflow?.steps?.[request.currentStepIndex]?.name || ''],
      ['Date de création', exportDateTime(request.createdAt)],
      [],
      ['Champ', 'Valeur'],
      ...Object.entries(request.data || {}).map(([key, value]) => [fieldLabel(key), fieldValue(value)]),
      [],
      ['Date', 'Étape', 'Décision', 'Par', 'Commentaire'],
      ...history.map((h) => [exportDateTime(h.timestamp), h.stepName || '', actionLabel(h.action), h.actorName || '', h.comment || '']),
    ];
    downloadCsv(rows, `${request.reference}_export.csv`);
    toast.success('CSV téléchargé');
  };

  const isAssignedToMe =
    Number(request?.assignedTo) === Number(user?.id) ||
    Number(request?.assignee?.id) === Number(user?.id);
  const currentStep = workflow?.steps?.[request?.currentStepIndex];
  const requiredFields = Array.isArray(currentStep?.requiredFields) ? currentStep.requiredFields : [];

  const fieldLabelMap = {
    recouvrementPlafond: 'Plafond recouvrement',
    compteCollectif: 'Compte collectif',
    groupeTresorerie: 'Groupe trésorerie',
    codeClient: 'Code client',
  };

  const getFieldLabel = (fieldName) => fieldLabelMap[fieldName] || fieldName;

  const statusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Approuvée';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejetée';
      case 'in_progress': return 'En cours';
      case 'draft': return 'Brouillon';
      default: return status;
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'approved': return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white';
      case 'pending': return 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white';
      case 'rejected': return 'bg-gradient-to-r from-rose-500 to-red-600 text-white';
      case 'in_progress': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950';
      case 'draft': return 'bg-gradient-to-r from-slate-400 to-slate-600 text-white';
      default: return 'bg-slate-200 text-slate-900';
    }
  };

  const formatDate = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderFieldValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-500">-</span>;
    }
    if (Array.isArray(value)) {
      return (
        <div className="space-y-2">
          {value.length === 0 ? (
            <span className="text-gray-500">Aucun élément</span>
          ) : (
            value.map((item, index) => (
              <div key={index} className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                {typeof item === 'object' ? JSON.stringify(item, null, 2) : String(item)}
              </div>
            ))
          )}
        </div>
      );
    }
    if (typeof value === 'object') {
      return (
        <div className="space-y-2 text-sm text-slate-700">
          {Object.entries(value).map(([key, nestedValue]) => (
            <div key={key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500 uppercase tracking-[0.12em]">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}</p>
              <p>{String(nestedValue)}</p>
            </div>
          ))}
        </div>
      );
    }
    return <span className="text-slate-800 font-medium">{String(value)}</span>;
  };

  const dataEntries = Object.entries(request?.data || {});

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
      draft: { color: '#a8a195', light: '#d8d3c9' },
      pending: { color: '#3b82c4', light: '#93c5fd' },
      in_progress: { color: '#e8591a', light: '#fdba8c' },
      returned: { color: '#8a6bd1', light: '#c4b5fd' },
      approved: { color: '#2f9e6b', light: '#86efac' },
      rejected: { color: '#d64545', light: '#fca5a5' },
    };
    return map[status] || map.draft;
  };

  const actionMeta = (action) => {
    switch (action) {
      case 'validate': return { label: 'Validée', color: '#2f9e6b', icon: FiCheck };
      case 'reject': return { label: 'Refusée', color: '#d64545', icon: FiX };
      case 'return': return { label: 'Retournée', color: '#8a6bd1', icon: FiCornerUpLeft };
      case 'modify': return { label: 'Modifiée', color: '#e0a019', icon: FiEdit3 };
      default: return { label: action || 'Action', color: '#a8a195', icon: FiCircle };
    }
  };

  const displayLabel = (key) =>
    fieldLabelMap[key] || String(key).replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase());

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!request) {
    return (
      <div className="ui-page">
        <div className="ui-skeleton h-56 rounded-[1.25rem]" />
        <div className="ui-skeleton h-24 rounded-[1.1rem]" />
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="ui-skeleton h-80 rounded-[1.1rem] lg:col-span-2" />
          <div className="ui-skeleton h-80 rounded-[1.1rem]" />
        </div>
      </div>
    );
  }

  const meta = workflowMeta(request.workflowType);
  const tone = statusTone(request.status);
  const WorkflowIcon = meta.icon;
  const steps = Array.isArray(workflow?.steps) ? workflow.steps : [];
  const currentIndex = Number(request.currentStepIndex) || 0;
  const isFinished = request.status === 'approved';

  const stepState = (index) => {
    if (isFinished || index < currentIndex) return 'done';
    if (index === currentIndex) return request.status === 'rejected' ? 'rejected' : request.status === 'draft' ? 'upcoming' : 'current';
    return 'upcoming';
  };

  const doneCount = isFinished ? steps.length : Math.min(currentIndex, steps.length);
  const progress = steps.length ? Math.round((doneCount / steps.length) * 100) : 0;

  const metaItems = [
    { label: 'Créée le', value: formatDate(request.createdAt), icon: FiCalendar },
    { label: 'Créateur', value: request.creator?.fullName || '-', icon: FiUser },
    { label: 'Chez', value: request.assignee?.fullName || request.assignedTo || '-', icon: FiUserCheck },
    { label: 'Mise à jour', value: formatDate(request.updatedAt || request.createdAt), icon: FiClock },
  ];

  return (
    <div className="ui-page">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#1b1b1a] px-6 py-7 text-white sm:px-10 sm:py-9">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full opacity-70 blur-3xl"
          style={{ background: `radial-gradient(circle, ${tone.color}, transparent 65%)` }}
        />
        <span className="pointer-events-none absolute -bottom-10 right-6 select-none font-['Inter_Tight'] text-[9rem] font-extralight leading-none tracking-[-0.06em] text-white/[0.05]">
          {String(request.id).padStart(2, '0')}
        </span>

        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/requests')}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-medium text-stone-200 transition hover:bg-white/15"
          >
            <FiArrowLeft className="h-3.5 w-3.5" />
            Retour aux demandes
          </button>
          <span
            className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium"
            style={{ backgroundColor: `${tone.color}2e`, color: tone.light }}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tone.light }} />
            {statusLabel(request.status)}
          </span>
        </div>

        <div className="relative mt-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-end gap-5">
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-[0_12px_30px_-10px_rgba(232,89,26,0.8)]">
              <WorkflowIcon className="h-7 w-7" />
            </span>
            <div>
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                <span className="h-px w-6 bg-brand-500" />
                {request.reference}
              </p>
              <h1 className="mt-2 font-['Inter_Tight'] text-4xl font-extralight leading-none tracking-[-0.04em] sm:text-5xl">
                {meta.label}
              </h1>
            </div>
          </div>
          {steps.length > 0 && (
            <div className="min-w-[220px]">
              <div className="flex items-baseline justify-between text-xs text-stone-400">
                <span className="uppercase tracking-[0.16em]">Avancement</span>
                <span className="font-['Inter_Tight'] text-2xl font-light text-white">{progress}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, backgroundColor: tone.color }} />
              </div>
            </div>
          )}
        </div>

        <div className="relative mt-9 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
          {metaItems.map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#1b1b1a]/95 px-4 py-3.5">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-500">
                <Icon className="h-3 w-3" /> {label}
              </p>
              <p className="mt-1 truncate text-sm text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Frise des étapes */}
      {steps.length > 0 && (
        <div className="ui-card px-6 py-6">
          <div className="mb-6 flex items-center justify-between">
            <p className="ui-stat-label">Circuit de validation</p>
            <p className="text-xs text-[var(--muted)]">
              Étape <span className="font-medium text-[var(--ink)]">{Math.min(currentIndex + 1, steps.length)}</span> / {steps.length}
            </p>
          </div>
          <div className="overflow-x-auto pb-2">
            <ol className="flex min-w-max items-start">
              {steps.map((step, index) => {
                const state = stepState(index);
                const isLast = index === steps.length - 1;
                return (
                  <li key={`${step.name}-${index}`} className="flex items-start">
                    <div className="flex w-32 flex-col items-center text-center">
                      <span
                        className={`relative flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold transition ${
                          state === 'done'
                            ? 'bg-[var(--ink)] text-[var(--app-bg)]'
                            : state === 'current'
                              ? 'bg-brand-500 text-white shadow-[0_0_0_5px_rgba(232,89,26,0.18)]'
                              : state === 'rejected'
                                ? 'bg-red-600 text-white shadow-[0_0_0_5px_rgba(214,69,69,0.18)]'
                                : 'border border-[var(--line)] bg-[var(--surface)] text-[var(--muted)]'
                        }`}
                      >
                        {state === 'done' ? <FiCheck className="h-4 w-4" /> : state === 'rejected' ? <FiX className="h-4 w-4" /> : String(index + 1).padStart(2, '0')}
                      </span>
                      <p className={`mt-3 px-2 text-xs leading-snug ${state === 'upcoming' ? 'text-[var(--muted)]' : 'font-medium text-[var(--ink)]'}`}>
                        {step.name}
                      </p>
                      {state === 'current' && <span className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-500">En cours</span>}
                    </div>
                    {!isLast && (
                      <div className="mt-[18px] h-px w-10 flex-shrink-0 sm:w-16" style={{ backgroundColor: state === 'done' ? 'var(--ink)' : 'var(--line)' }} />
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}

      <div className="grid items-start gap-5 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="space-y-5 lg:col-span-2">
          {/* Données saisies */}
          <div className="ui-card">
            <div className="ui-card-header">
              <h2 className="ui-card-title"><FiFileText /> Données saisies</h2>
              <span className="text-xs text-[var(--muted)]">{dataEntries.length} champ(s)</span>
            </div>
            {dataEntries.length === 0 ? (
              <div className="ui-empty py-10">
                <p className="ui-empty-text">Aucune donnée saisie.</p>
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2">
                {dataEntries.map(([key, value], index) => (
                  <div
                    key={key}
                    className={`border-[var(--line-soft)] px-6 py-4 ${index % 2 === 0 ? 'sm:border-r' : ''} ${index < dataEntries.length - (dataEntries.length % 2 === 0 ? 2 : 1) ? 'border-b' : ''}`}
                  >
                    <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">{displayLabel(key)}</dt>
                    <dd className="mt-1.5 text-sm text-[var(--ink)]">{renderFieldValue(value)}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Historique */}
          <div className="ui-card">
            <div className="ui-card-header">
              <h2 className="ui-card-title"><FiClock /> Historique</h2>
              <span className="text-xs text-[var(--muted)]">{request.history?.length || 0} action(s)</span>
            </div>
            {(!request.history || request.history.length === 0) ? (
              <div className="ui-empty py-10">
                <p className="ui-empty-text">Aucune action pour le moment.</p>
              </div>
            ) : (
              <ol className="relative px-6 py-6">
                <span className="absolute bottom-8 left-[2.4rem] top-8 w-px bg-[var(--line)]" />
                {request.history.map((entry, idx) => {
                  const act = actionMeta(entry.action);
                  const ActIcon = act.icon;
                  return (
                    <li key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                      <span
                        className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white ring-4 ring-[var(--surface)]"
                        style={{ backgroundColor: act.color }}
                      >
                        <ActIcon className="h-3.5 w-3.5" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                          <p className="text-sm text-[var(--ink)]">
                            <span className="font-medium">{act.label}</span>
                            <span className="text-[var(--muted)]"> par </span>
                            {entry.actorName || entry.actor?.fullName || entry.actor || 'Système'}
                          </p>
                          <span className="text-xs tabular-nums text-[var(--muted)]">{formatDateTime(entry.timestamp)}</span>
                        </div>
                        {entry.stepName && (
                          <p className="mt-0.5 text-[11px] uppercase tracking-[0.12em] text-[var(--muted)]">{entry.stepName}</p>
                        )}
                        {entry.comment && (
                          <p className="mt-2 rounded-xl bg-[var(--surface-2)] px-3.5 py-2.5 text-sm leading-relaxed text-[var(--ink-2)]">
                            {entry.comment}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-5 lg:sticky lg:top-24">
          {isAssignedToMe && request.status === 'in_progress' && (
            <div className="overflow-hidden rounded-[1.1rem] border-2 border-brand-500/60 bg-[var(--surface)]">
              <div className="flex items-center gap-3 bg-brand-500 px-5 py-3.5 text-white">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                <div>
                  <p className="text-sm font-medium">Action requise</p>
                  <p className="text-[11px] text-white/80">{currentStep?.name}</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div>
                  <label className="ui-label">Commentaire</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows="4"
                    placeholder="Votre note pour cette étape..."
                    className="w-full rounded-2xl border border-[var(--line)] bg-[var(--app-bg)] p-3.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink-2)] focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
                <div>
                  <label className="ui-label">Pièce jointe (optionnel)</label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--line)] px-4 py-3 text-sm text-[var(--muted)] transition hover:border-[var(--ink-2)] hover:text-[var(--ink)]">
                    <FiPaperclip className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{file ? file.name : 'Choisir un fichier…'}</span>
                    <input
                      type="file"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="hidden"
                    />
                  </label>
                </div>
                {requiredFields.length > 0 && (
                  <div className="space-y-3 rounded-2xl bg-[var(--surface-2)] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Champs obligatoires</p>
                    {requiredFields.map((fieldName) => (
                      <div key={fieldName}>
                        <label className="mb-1 block text-xs font-medium text-[var(--ink-2)]">{getFieldLabel(fieldName)}</label>
                        <input
                          type="text"
                          value={stepFormData?.[fieldName] || ''}
                          onChange={(e) =>
                            setStepFormData((prev) => ({
                              ...prev,
                              [fieldName]: e.target.value,
                            }))
                          }
                          placeholder={`Saisir ${getFieldLabel(fieldName).toLowerCase()}`}
                          className="ui-input"
                        />
                      </div>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button onClick={() => handleAction('validate')} className="ui-btn ui-btn-primary col-span-2 h-11" disabled={loading}>
                    <FiCheck className="h-4 w-4" /> Valider l’étape
                  </button>
                  <button onClick={() => handleAction('return')} className="ui-btn ui-btn-secondary" disabled={loading}>
                    <FiCornerUpLeft className="h-4 w-4" /> Retourner
                  </button>
                  <button onClick={() => handleAction('reject')} className="ui-btn ui-btn-danger-soft" disabled={loading}>
                    <FiX className="h-4 w-4" /> Refuser
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="ui-card">
            <div className="ui-card-header">
              <h2 className="ui-card-title"><FiInfo /> Informations clés</h2>
            </div>
            <dl className="divide-y divide-[var(--line-soft)] px-5">
              {[
                ['Référence', <span className="font-mono text-xs">{request.reference}</span>],
                ['Type', request.workflowType],
                ['Statut', <span className={`ui-badge ${
                  request.status === 'approved' ? 'ui-badge-green' : request.status === 'rejected' ? 'ui-badge-red' : request.status === 'in_progress' ? 'ui-badge-amber' : request.status === 'pending' ? 'ui-badge-blue' : 'ui-badge-slate'
                }`}>{statusLabel(request.status)}</span>],
                ['Étape courante', workflow?.steps?.[request?.currentStepIndex]?.name || 'N/A'],
                ['Pièces jointes', `${request.attachments?.length || 0}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <dt className="text-[var(--muted)]">{label}</dt>
                  <dd className="text-right text-[var(--ink)]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative overflow-hidden rounded-[1.1rem] bg-[#1b1b1a] p-5 text-white">
            <div
              className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full ${
                request.status === 'approved'
                  ? 'bg-[radial-gradient(circle,rgba(47,158,107,0.55),transparent_65%)]'
                  : 'bg-[radial-gradient(circle,rgba(232,89,26,0.5),transparent_65%)]'
              }`}
            />
            <p className="relative text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-400">Récapitulatif et export</p>
            <p className="relative mt-2 font-['Inter_Tight'] text-xl font-light leading-snug">
              {request.status === 'approved' ? 'Demande clôturée — documents disponibles.' : "Exportez l'état actuel de la demande."}
            </p>
            <div className="relative mt-5 grid gap-2">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={Boolean(exporting)}
                className="inline-flex h-10 items-center justify-between rounded-full bg-white pl-4 pr-1.5 text-sm font-medium text-[#1b1b1a] transition hover:bg-brand-500 hover:text-white disabled:opacity-60"
              >
                {exporting === 'pdf' ? 'Génération du PDF…' : 'Récapitulatif PDF'}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#1b1b1a] text-white"><FiDownload className="h-3.5 w-3.5" /></span>
              </button>
              <button
                type="button"
                onClick={handleDownloadExcel}
                disabled={Boolean(exporting)}
                className="inline-flex h-10 items-center justify-between rounded-full border border-white/15 pl-4 pr-1.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                {exporting === 'excel' ? 'Préparation du fichier…' : 'Classeur Excel mis en forme'}
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10"><FiDownload className="h-3.5 w-3.5" /></span>
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={Boolean(exporting)}
                className="mt-1 justify-self-start text-xs text-stone-400 underline-offset-4 transition hover:text-white hover:underline disabled:opacity-60"
              >
                Données brutes (CSV)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
