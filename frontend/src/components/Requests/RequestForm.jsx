import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest, submitRequest, updateDraftRequest, uploadAttachment } from '../services/requestService';
import { getWorkflows, getWorkflowByName } from '../services/workflowService';
import { toast } from 'react-toastify';
import { FiArrowUpRight, FiCheck, FiChevronDown, FiDollarSign, FiFileText, FiInfo, FiPaperclip, FiSave, FiTool, FiTrendingUp, FiUploadCloud, FiUserPlus } from 'react-icons/fi';
import './RequestForm.css';

const PROCESS_FIELD_TEMPLATES = {
  avance_caisse: {
    matchers: ['avance', 'caisse'],
    fields: [
      { name: 'societe', label: 'Societe', type: 'select', options: ['SK', 'SF'], required: true },
      { name: 'montant', label: 'Montant', type: 'number', required: true },
      { name: 'motif', label: 'Motif', type: 'textarea', required: true },
      { name: 'choixCaisse', label: 'Choix de la caisse', type: 'select', options: ['Usine', 'Siege'], required: true },
    ],
  },
  creation_client: {
    matchers: ['creation', 'client'],
    fields: [
      { name: 'typeClient', label: 'Type client (ST01/ST02)', type: 'select', options: ['ST01', 'ST02'], required: true },
      { name: 'statutClient', label: 'Statut', type: 'select', options: ['Local', 'Etranger', 'Suspension'], required: true },
      { name: 'nomClient', label: 'Nom', type: 'text', required: true },
      { name: 'activite', label: 'Activite', type: 'text', required: true },
      { name: 'idRc', label: 'ID RC', type: 'text', required: true },
      { name: 'idTvaPatente', label: 'ID TVA/Patente', type: 'text', required: true },
      { name: 'idRne', label: 'ID RNE', type: 'text', required: true },
      { name: 'numeroAttestation', label: 'Numero attestation', type: 'text', required: false },
      { name: 'dateDebutAttestation', label: 'Date debut attestation', type: 'date', required: false },
      { name: 'dateFinAttestation', label: 'Date fin attestation', type: 'date', required: false },
      { name: 'adresse', label: 'Adresse', type: 'text', required: true },
      { name: 'codePostal', label: 'Code postal', type: 'text', required: true },
      { name: 'gouvernorat', label: 'Gouvernorat', type: 'text', required: true },
      { name: 'pays', label: 'Pays', type: 'text', required: true },
      { name: 'telephoneMobile', label: 'Telephone/Mobile', type: 'text', required: true },
      { name: 'fax', label: 'Fax', type: 'text', required: false },
      { name: 'emailClient', label: 'E-mail', type: 'email', required: true },
      { name: 'modePaiement', label: 'Mode paiement', type: 'text', required: true },
      { name: 'conditionsPaiement', label: 'Conditions de paiement', type: 'text', required: true },
    ],
  },
  demande_investissement: {
    matchers: ['investissement'],
    fields: [
      { name: 'societe', label: 'Societe', type: 'select', options: ['SK', 'SF'], required: true },
      { name: 'categorie', label: 'Categorie', type: 'select', options: ['Industriel SF', 'Industriel SK', 'Moyens Generaux', 'IT', 'Autres'], required: true },
      { name: 'objet', label: 'Objet', type: 'textarea', required: true },
      { name: 'budget', label: 'Budget', type: 'number', required: true },
      { name: 'requestBudget', label: 'Request Budget', type: 'number', required: false },
      { name: 'requestMontant', label: 'Request (EUR)', type: 'number', required: true },
      { name: 'dateFinalisation', label: 'Date de finalisation', type: 'date', required: true },
      { name: 'dureeVie', label: 'Duree de vie', type: 'text', required: false },
      { name: 'planifie', label: 'Planifie', type: 'select', options: ['Yes', 'No'], required: true },
      { name: 'demanderAvisDg', label: 'Demander avis DG', type: 'select', options: ['Yes', 'No'], required: false },
      { name: 'oi', label: 'OI', type: 'text', required: false },
      { name: 'processExterne', label: 'Process Externe', type: 'select', options: ['Yes', 'No'], required: false },
    ],
  },
  avis_technique: {
    matchers: ['avis', 'technique'],
    fields: [
      { name: 'concerne', label: 'Concerne', type: 'text', required: true },
      { name: 'niveauValidation', label: 'Niveau de validation', type: 'text', required: true },
      { name: 'objetAvis', label: 'Objet / description', type: 'textarea', required: true },
      { name: 'avisFinancierRequis', label: 'Avis financier requis', type: 'select', options: ['Yes', 'No'], required: true },
    ],
  },
};

const normalize = (value) =>
  (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const getTemplateForWorkflow = (workflowName) => {
  const normalizedName = normalize(workflowName);
  return Object.values(PROCESS_FIELD_TEMPLATES).find((template) =>
    template.matchers.every((matcher) => normalizedName.includes(normalize(matcher)))
  );
};

const RequestForm = () => {
  const navigate = useNavigate();
  const [workflows, setWorkflows] = useState([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [currentWorkflowDef, setCurrentWorkflowDef] = useState(null);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [draftRequestId, setDraftRequestId] = useState(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [hasTouchedForm, setHasTouchedForm] = useState(false);
  const isSavingRef = useRef(false);

  useEffect(() => {
    loadWorkflows();
  }, []);

  useEffect(() => {
    if (selectedWorkflow) {
      loadWorkflowDefinition(selectedWorkflow);
    }
  }, [selectedWorkflow]);

  const loadWorkflows = async () => {
    const data = await getWorkflows();
    setWorkflows(data);
    if (data.length) setSelectedWorkflow(data[0].name);
  };

  const loadWorkflowDefinition = async (name) => {
    try {
      const def = await getWorkflowByName(name);
      setCurrentWorkflowDef(def);
      // Réinitialiser les données du formulaire
      setFormData({});
    } catch (error) {
      console.error('Erreur chargement définition workflow:', error);
    }
  };

  const handleFieldChange = (field, value) => {
    setHasTouchedForm(true);
    setFormData({ ...formData, [field]: value });
  };

  const handleFileChange = (e) => {
    setFiles([...files, ...Array.from(e.target.files)]);
  };

  useEffect(() => {
    if (!selectedWorkflow || !hasTouchedForm) return;

    const hasData = Object.values(formData).some((value) => {
      if (value === null || value === undefined) return false;
      return String(value).trim() !== '';
    });
    if (!hasData) return;

    const timer = setTimeout(async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;
      setIsAutoSaving(true);
      try {
        if (!draftRequestId) {
          const created = await createRequest({
            workflowType: selectedWorkflow,
            data: formData,
          });
          setDraftRequestId(created.id);
        } else {
          await updateDraftRequest(draftRequestId, {
            workflowType: selectedWorkflow,
            data: formData,
          });
        }
      } catch (error) {
        console.error('Erreur sauvegarde automatique brouillon:', error);
      } finally {
        isSavingRef.current = false;
        setIsAutoSaving(false);
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [formData, selectedWorkflow, draftRequestId, hasTouchedForm]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let request = null;
      if (!draftRequestId) {
        request = await createRequest({
          workflowType: selectedWorkflow,
          data: formData,
        });
      } else {
        request = await updateDraftRequest(draftRequestId, {
          workflowType: selectedWorkflow,
          data: formData,
        });
      }
      for (const file of files) {
        await uploadAttachment(request.id, file);
      }
      await submitRequest(request.id);
      toast.success('Demande créée et soumise avec succès');
      navigate('/requests');
    } catch (error) {
      const backendMessage = error.response?.data?.message;
      toast.error(backendMessage || 'Erreur lors de la création ou soumission de la demande');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- Présentation ---------- */

  const workflowMeta = (type) => {
    const map = {
      AvanceCaisse: { label: 'Avance sur caisse', icon: FiDollarSign },
      CreationClient: { label: 'Création client', icon: FiUserPlus },
      Investissement: { label: 'Investissement', icon: FiTrendingUp },
      AvisTechnique: { label: 'Avis technique', icon: FiTool },
    };
    return map[type] || { label: type, icon: FiFileText };
  };

  const humanize = (field) => field.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());

  const fieldBase =
    'w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 text-sm text-[var(--ink)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--ink-2)] focus:ring-4 focus:ring-brand-500/10';

  const FieldLabel = ({ children, required }) => (
    <label className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--muted)]">
      {children}
      {required && <span className="h-1.5 w-1.5 rounded-full bg-brand-500" title="Obligatoire" />}
    </label>
  );

  // Génère les champs dynamiquement à partir des requiredFields de la première étape
  const renderDynamicFields = () => {
    const template = getTemplateForWorkflow(selectedWorkflow);
    const fields = template?.fields || currentWorkflowDef?.steps?.[0]?.requiredFields || [];

    if (fields.length === 0) {
      return <p className="text-sm text-[var(--muted)]">Aucun champ requis pour ce workflow.</p>;
    }

    return (
      <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        {fields.map((fieldDef) => {
          if (typeof fieldDef === 'object') {
            const {
              name,
              label,
              type = 'text',
              options = [],
              required = true,
            } = fieldDef;

            return (
              <div key={name} className={type === 'textarea' ? 'md:col-span-2' : ''}>
                <FieldLabel required={required}>{label}</FieldLabel>
                {type === 'select' ? (
                  <div className="relative">
                    <select
                      value={formData[name] || ''}
                      onChange={(e) => handleFieldChange(name, e.target.value)}
                      required={required}
                      className={`${fieldBase} h-11 appearance-none pr-10`}
                    >
                      <option value="">Sélectionner…</option>
                      {options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                  </div>
                ) : type === 'textarea' ? (
                  <textarea
                    value={formData[name] || ''}
                    onChange={(e) => handleFieldChange(name, e.target.value)}
                    required={required}
                    rows="4"
                    className={`${fieldBase} py-3 leading-relaxed`}
                  />
                ) : (
                  <input
                    type={type}
                    value={formData[name] || ''}
                    onChange={(e) => handleFieldChange(name, e.target.value)}
                    required={required}
                    className={`${fieldBase} h-11`}
                  />
                )}
              </div>
            );
          }

          const field = fieldDef;
          // Détection du type de champ (fallback, basé sur le nom)
          let inputType = 'text';
          if (field.toLowerCase().includes('montant') || field.toLowerCase().includes('budget')) inputType = 'number';
          if (field.toLowerCase().includes('date')) inputType = 'date';

          return (
            <div key={field}>
              <FieldLabel required>{humanize(field)}</FieldLabel>
              <input
                type={inputType}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                required
                className={`${fieldBase} h-11`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const SectionHeader = ({ number, title, aside }) => (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--line-soft)] pb-4">
      <div className="flex items-baseline gap-4">
        <span className="font-['Inter_Tight'] text-sm tabular-nums text-brand-500">{number}</span>
        <h2 className="font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">{title}</h2>
      </div>
      {aside}
    </div>
  );

  const previewEntries = Object.entries(formData).filter(([, value]) => value !== undefined && String(value).trim() !== '');
  const circuitSteps = Array.isArray(currentWorkflowDef?.steps) ? currentWorkflowDef.steps : [];
  const selectedMeta = workflowMeta(selectedWorkflow);
  const SelectedIcon = selectedMeta.icon;

  return (
    <div className="ui-page">
      {/* En-tête */}
      <div className="ui-page-header">
        <div>
          <span className="ui-eyebrow">Nouvelle demande</span>
          <h1 className="ui-title">Créer une demande</h1>
        </div>
        <div className="ui-toolbar">
          <span
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition ${
              isAutoSaving
                ? 'border-brand-500/40 text-brand-500'
                : draftRequestId
                  ? 'border-[var(--line)] text-[var(--ink-2)]'
                  : 'border-[var(--line)] text-[var(--muted)]'
            }`}
          >
            {isAutoSaving ? (
              <>
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Sauvegarde automatique...
              </>
            ) : draftRequestId ? (
              <>
                <FiCheck className="h-3.5 w-3.5 text-emerald-600" />
                Brouillon enregistré
              </>
            ) : (
              <>
                <FiSave className="h-3.5 w-3.5" />
                Sauvegarde automatique activée
              </>
            )}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid items-start gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* 01 — Processus */}
          <section className="ui-card p-6 sm:p-8">
            <SectionHeader number="01" title="Choisir le processus" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {workflows.map((w) => {
                const meta = workflowMeta(w.name);
                const Icon = meta.icon;
                const active = selectedWorkflow === w.name;
                return (
                  <button
                    key={w.name}
                    type="button"
                    onClick={() => setSelectedWorkflow(w.name)}
                    className={`group relative flex items-center gap-4 overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? 'border-[#1b1b1a] bg-[#1b1b1a] text-white shadow-[0_18px_36px_-18px_rgba(27,27,26,0.6)]'
                        : 'border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink-2)]'
                    }`}
                  >
                    {active && (
                      <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.5),transparent_65%)]" />
                    )}
                    <span
                      className={`relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                        active ? 'bg-brand-500 text-white' : 'bg-[var(--surface-2)] text-[var(--ink-2)] group-hover:bg-[var(--ink)] group-hover:text-[var(--app-bg)]'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="relative min-w-0 flex-1">
                      <span className="block font-['Inter_Tight'] text-lg font-light leading-tight tracking-[-0.02em]">{meta.label}</span>
                      <span className={`block truncate text-[11px] uppercase tracking-[0.14em] ${active ? 'text-stone-400' : 'text-[var(--muted)]'}`}>
                        {w.name}
                      </span>
                    </span>
                    <span
                      className={`relative flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition ${
                        active ? 'border-brand-500 bg-brand-500' : 'border-[var(--line)]'
                      }`}
                    >
                      {active && <FiCheck className="h-3 w-3 text-white" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 02 — Informations */}
          <section className="ui-card p-6 sm:p-8">
            <SectionHeader
              number="02"
              title="Informations requises"
              aside={
                <span className="flex items-center gap-1.5 text-[11px] text-[var(--muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> obligatoire
                </span>
              }
            />
            {renderDynamicFields()}
          </section>

          {/* 03 — Pièces jointes */}
          <section className="ui-card p-6 sm:p-8">
            <SectionHeader number="03" title="Pièces jointes" />
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--line)] bg-[var(--app-bg)] px-6 py-10 text-center transition-colors hover:border-brand-500/60 hover:bg-[var(--surface-2)]">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1b1b1a] text-white transition-colors group-hover:bg-brand-500">
                <FiUploadCloud className="h-5 w-5" />
              </span>
              <span className="mt-4 font-['Inter_Tight'] text-lg font-light text-[var(--ink)]">Déposer ou choisir des fichiers</span>
              <span className="mt-1 text-xs text-[var(--muted)]">PDF, images ou documents Word — 5 Mo max. par fichier</span>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {files.length > 0 && (
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {files.map((file, index) => (
                  <li key={index} className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 py-2.5">
                    <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[var(--surface-2)] text-[var(--ink-2)]">
                      <FiPaperclip className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-[var(--ink)]">{file.name}</span>
                      <span className="block text-[11px] text-[var(--muted)]">{(file.size / 1024).toFixed(0)} Ko</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {normalize(selectedWorkflow).includes('client') && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--surface-2)] px-4 py-3 text-xs leading-relaxed text-[var(--ink-2)]">
                <FiInfo className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-500" />
                Documents recommandés : Patente, RC, Attestation, Agrément CEPEX.
              </p>
            )}
          </section>
        </div>

        {/* Récapitulatif */}
        <aside className="space-y-5 xl:sticky xl:top-24">
          <div className="overflow-hidden rounded-[1.25rem] bg-[#1b1b1a] text-white">
            <div className="relative p-6">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.45),transparent_65%)]" />
              <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">Récapitulatif</p>
              <div className="relative mt-4 flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500">
                  <SelectedIcon className="h-5 w-5" />
                </span>
                <p className="font-['Inter_Tight'] text-2xl font-extralight leading-tight tracking-[-0.03em]">{selectedMeta.label || '—'}</p>
              </div>
            </div>

            <div className="border-t border-white/10 px-6 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Aperçu des informations</p>
              {previewEntries.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">Les champs remplis apparaîtront ici.</p>
              ) : (
                <dl className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                  {previewEntries.map(([field, value]) => (
                    <div key={field} className="flex items-start justify-between gap-4 text-sm">
                      <dt className="text-stone-400">{humanize(field)}</dt>
                      <dd className="max-w-[55%] truncate text-right text-white">{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>

            {circuitSteps.length > 0 && (
              <div className="border-t border-white/10 px-6 py-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Circuit de validation</p>
                <ol className="relative mt-4 space-y-3">
                  <span className="absolute bottom-2 left-[11px] top-2 w-px bg-white/10" />
                  {circuitSteps.map((step, index) => (
                    <li key={`${step.name}-${index}`} className="relative flex items-center gap-3 text-sm">
                      <span className={`relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] tabular-nums ${index === 0 ? 'bg-brand-500 text-white' : 'bg-[#2a2a28] text-stone-400 ring-1 ring-white/10'}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={index === 0 ? 'text-white' : 'text-stone-400'}>{step.name}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="border-t border-white/10 p-5">
              <button
                type="submit"
                className="group flex h-12 w-full items-center justify-between rounded-full bg-white pl-6 pr-1.5 text-sm font-medium text-[#1b1b1a] transition-colors hover:bg-brand-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={loading}
              >
                {loading ? 'Envoi en cours...' : 'Créer et soumettre'}
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1b1b1a] text-white transition-transform duration-300 group-hover:rotate-45">
                  {loading ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <FiArrowUpRight className="h-4 w-4" />
                  )}
                </span>
              </button>
              <p className="mt-3 text-center text-[11px] text-stone-500">
                {files.length} pièce(s) jointe(s) · envoi au premier validateur
              </p>
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default RequestForm;
