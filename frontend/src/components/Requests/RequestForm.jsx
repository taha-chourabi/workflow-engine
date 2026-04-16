import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createRequest, submitRequest, updateDraftRequest, uploadAttachment } from '../services/requestService';
import { getWorkflows, getWorkflowByName } from '../services/workflowService';
import { toast } from 'react-toastify';

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
      { name: 'niveauValidation', label: 'Niveau de validation', type: 'select', options: ['N', 'N+1', 'N+2'], required: true },
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

  // Génère les champs dynamiquement à partir des requiredFields de la première étape
  const renderDynamicFields = () => {
    const template = getTemplateForWorkflow(selectedWorkflow);
    const fields = template?.fields || currentWorkflowDef?.steps?.[0]?.requiredFields || [];

    if (fields.length === 0) {
      return <p>Aucun champ requis pour ce workflow.</p>;
    }

    return fields.map((fieldDef) => {
      if (typeof fieldDef === 'object') {
        const {
          name,
          label,
          type = 'text',
          options = [],
          required = true,
        } = fieldDef;

        return (
          <div key={name} className="form-group">
            <label>{label}</label>
            {type === 'select' ? (
              <select
                value={formData[name] || ''}
                onChange={(e) => handleFieldChange(name, e.target.value)}
                required={required}
              >
                <option value="">-- Selectionner --</option>
                {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : type === 'textarea' ? (
              <textarea
                value={formData[name] || ''}
                onChange={(e) => handleFieldChange(name, e.target.value)}
                required={required}
                rows="3"
              />
            ) : (
              <input
                type={type}
                value={formData[name] || ''}
                onChange={(e) => handleFieldChange(name, e.target.value)}
                required={required}
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
        <div key={field} className="form-group">
          <label>{field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</label>
          <input
            type={inputType}
            onChange={(e) => handleFieldChange(field, e.target.value)}
            required
          />
        </div>
      );
    });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Nouvelle demande</h1>
      <form onSubmit={handleSubmit} className="card">
        <div className="form-group">
          <label>Type de workflow</label>
          <select
            value={selectedWorkflow}
            onChange={(e) => setSelectedWorkflow(e.target.value)}
          >
            {workflows.map(w => (
              <option key={w.name} value={w.name}>{w.name}</option>
            ))}
          </select>
        </div>

        {renderDynamicFields()}

        <div className="form-group">
          <label>Pièces jointes</label>
          <input type="file" multiple onChange={handleFileChange} />
          {normalize(selectedWorkflow).includes('client') && (
            <p className="text-sm text-gray-500 mt-1">Documents recommandes: Patente, RC, Attestation, Agrement CEPEX.</p>
          )}
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Envoi...' : 'Créer et soumettre'}
        </button>
        {isAutoSaving && <p className="text-sm text-gray-500 mt-2">Enregistrement brouillon...</p>}
      </form>
    </div>
  );
};

export default RequestForm;