import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getRequestById, takeAction, uploadAttachment } from '../services/requestService';
import { getWorkflowByName } from '../services/workflowService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

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
      await takeAction(id, action, comment, stepFormData);
      if (file) {
        await uploadAttachment(id, file);
      }
      toast.success(`Action "${action}" effectuée`);
      loadRequest();
      setComment('');
      setFile(null);
    } catch (error) {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
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
  const getPdfDownloadUrl = (finalPdfUrl) => {
    if (!finalPdfUrl) return null;
    if (String(finalPdfUrl).startsWith('/uploads/')) {
      return `${process.env.REACT_APP_UPLOADS_URL}${finalPdfUrl.replace('/uploads', '')}`;
    }
    const normalized = String(finalPdfUrl).replace(/\\/g, '/');
    const filename = normalized.split('/').pop();
    return `${process.env.REACT_APP_UPLOADS_URL}/pdfs/${filename}`;
  };

  return (
    <div className="max-w-4xl mx-auto">
      {request && (
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Demande {request.reference}</h1>
            <span className={`status status-${request.status}`}>{request.status}</span>
          </div>

          <div className="card mb-6">
            <h2 className="font-bold mb-4">Informations</h2>
            <p><strong>Type:</strong> {request.workflowType}</p>
            <p><strong>Créée par:</strong> {request.creator?.fullName}</p>
            <p><strong>Date:</strong> {new Date(request.createdAt).toLocaleString()}</p>
            <hr className="my-4" />
            <h3 className="font-semibold mb-2">Données saisies</h3>
            <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(request.data, null, 2)}</pre>
          </div>

          <div className="card mb-6">
            <h2 className="font-bold mb-4">Historique</h2>
            <div className="space-y-2">
              {request.history?.map((entry, idx) => (
                <div key={idx} className="border-l-4 border-blue-300 pl-3 py-1">
                  <p><strong>{entry.action}</strong> par {entry.actorName || entry.actor?.fullName || entry.actor || 'Système'} - {new Date(entry.timestamp).toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{entry.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {isAssignedToMe && request.status === 'in_progress' && (
            <div className="card">
              <h2 className="font-bold mb-4">Action requise</h2>
              <div className="form-group">
                <label>Commentaire</label>
                <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows="3" />
              </div>
              <div className="form-group">
                <label>Pièce jointe (optionnel)</label>
                <input type="file" onChange={(e) => setFile(e.target.files[0])} />
              </div>
              {requiredFields.length > 0 && (
                <div className="form-group">
                  <label className="font-semibold">Champs obligatoires de cette étape</label>
                  <div className="space-y-3">
                    {requiredFields.map((fieldName) => (
                      <div key={fieldName}>
                        <label>{getFieldLabel(fieldName)}</label>
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
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex space-x-3">
                <button onClick={() => handleAction('validate')} className="btn btn-primary" disabled={loading}>Valider</button>
                <button onClick={() => handleAction('reject')} className="btn btn-danger" disabled={loading}>Refuser</button>
                <button onClick={() => handleAction('return')} className="btn btn-secondary" disabled={loading}>Retourner</button>
              </div>
            </div>
          )}

          {request.finalPdfUrl && (
            <div className="card mt-6">
              <h2 className="font-bold mb-2">Récapitulatif PDF</h2>
              <a href={getPdfDownloadUrl(request.finalPdfUrl)} target="_blank" rel="noreferrer" className="text-blue-600">Télécharger le PDF</a>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RequestDetail;