import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getRequests } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';

const ValidatorDashboard = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const loadRequests = async () => {
      try {
        const data = await getRequests();
        setRequests(data);
      } catch (error) {
        toast.error('Erreur chargement des validations');
      }
    };
    loadRequests();
  }, []);

  const pendingForMe = useMemo(
    () =>
      requests.filter(
        (req) =>
          req.status === 'in_progress' &&
          (Number(req.assignedTo) === Number(user?.id) || Number(req.assignee?.id) === Number(user?.id)) &&
          Number(req.createdBy) !== Number(user?.id)
      ),
    [requests, user]
  );

  const statsCards = [
    { title: 'En attente de vous', value: pendingForMe.length, tone: 'amber' },
    { title: 'Total à traiter chargé', value: requests.filter((r) => r.status === 'in_progress').length, tone: 'blue' },
  ];

  return (
    <div>
      <div className="dashboard-header mb-6">
        <h1 className="text-2xl font-bold">Tableau de bord validateur</h1>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {statsCards.map((card) => (
          <div key={card.title} className={`dash-stat-card dash-stat-${card.tone}`}>
            <h3 className="dash-stat-title">{card.title}</h3>
            <p className="dash-stat-value">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="table-container">
        <div className="table-header">
          <div>
            <h2 className="table-title">Demandes en attente de validation</h2>
          </div>
          <div className="table-stats">
            <div className="table-stats-item">
              <span className="table-stats-icon"></span>
              <span>{pendingForMe.length} demande(s)</span>
            </div>
          </div>
        </div>
        {pendingForMe.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg"> Aucune demande en attente</p>
            <p className="text-gray-400 text-sm mt-2">Toutes vos validations sont à jour</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Type de processus</th>
                  <th>Demandeur</th>
                  <th>Date de création</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingForMe.map((req) => (
                  <tr key={req.id}>
                    <td className="font-mono font-semibold text-blue-700">{req.reference}</td>
                    <td className="font-medium text-gray-900">{req.workflowType}</td>
                    <td className="text-gray-700">{req.creator?.fullName || 'N/A'}</td>
                    <td className="text-gray-600">
                      {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="action-cell">
                      <Link
                        to={`/requests/${req.id}`}
                        className="action-btn action-btn-primary"
                      >
                        🔍 Traiter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ValidatorDashboard;
