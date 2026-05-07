import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteRequest, getRequests } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const RequestList = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getRequests();
      // "Mes demandes" must only contain requests created by current user.
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
      toast.success('Demande supprimee avec succes');
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mes demandes</h1>
        <Link to="/requests/new" className="btn btn-primary">+ Nouvelle demande</Link>
      </div>
      <div className="card">
        {loading && <p className="text-gray-600">Chargement...</p>}

        {!loading && requests.length === 0 && (
          <p className="text-gray-600">Aucune demande trouvée.</p>
        )}

        {!loading && requests.length > 0 && (
          <div className="overflow-x-auto">
            <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Type</th>
                <th>Créée par</th>
                <th>Assignée à</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => {
                const assignedToMe = req.assignedTo === user?.id || req.assignee?.id === user?.id;
                return (
                  <tr key={req.id}>
                    <td>{req.reference}</td>
                    <td>{req.workflowType}</td>
                    <td>{req.creator?.fullName || '-'}</td>
                    <td>
                      {req.assignee?.fullName || req.assignedTo || '-'}
                      {assignedToMe ? ' (moi)' : ''}
                    </td>
                    <td><span className={`status status-${req.status}`}>{req.status}</span></td>
                    <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <Link to={`/requests/${req.id}`} className="text-blue-600 hover:text-blue-800 font-semibold">Voir</Link>
                        <button
                          type="button"
                          className="text-red-600 hover:text-red-800 disabled:text-gray-400"
                          onClick={() => handleDelete(req.id)}
                          disabled={deletingId === req.id}
                        >
                          {deletingId === req.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestList;
