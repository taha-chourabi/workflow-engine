import React, { useEffect, useState } from 'react';
import { getRequests } from '../services/requestService';
import { Link } from 'react-router-dom';

const EmployeeDashboard = () => {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ draft: 0, in_progress: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const data = await getRequests();
      setRequests(data);
      const statsCalc = {
        draft: data.filter(r => r.status === 'draft').length,
        in_progress: data.filter(r => r.status === 'in_progress').length,
        approved: data.filter(r => r.status === 'approved').length,
        rejected: data.filter(r => r.status === 'rejected').length,
      };
      setStats(statsCalc);
    } catch (error) {
      setRequests([]);
    }
  };

  const statusLabel = (status) => {
    const labels = {
      draft: 'Brouillon',
      pending: 'En attente',
      in_progress: 'En cours',
      approved: 'Approuvée',
      rejected: 'Refusée',
      returned: 'Retournée',
    };
    return labels[status] || status;
  };

  const statsCards = [
    { title: 'Brouillons', value: stats.draft, tone: 'slate' },
    { title: 'En cours', value: stats.in_progress, tone: 'amber' },
    { title: 'Approuvées', value: stats.approved, tone: 'green' },
    { title: 'Refusées', value: stats.rejected, tone: 'red' },
  ];

  return (
    <div>
      <div className="dashboard-header flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mes demandes</h1>
        </div>
        <Link to="/requests/new" className="btn btn-primary">+ Nouvelle demande</Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <h2 className="table-title">Mes demandes</h2>
          </div>
          <div className="table-stats">
            <div className="table-stats-item">
              <span className="table-stats-icon"></span>
              <span>{requests.length} demande(s)</span>
            </div>
          </div>
        </div>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-lg"> Aucune demande trouvée</p>
            <p className="text-gray-400 text-sm mt-2">Créez votre première demande pour commencer</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="professional-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Type de processus</th>
                  <th>Date de création</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map(req => (
                  <tr key={req.id}>
                    <td className="font-mono font-semibold text-blue-700">{req.reference}</td>
                    <td className="font-medium text-gray-900">{req.workflowType}</td>
                    <td className="text-gray-600">
                      {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="status-cell">
                      <span className={`status-badge status-badge-${req.status}`}>
                        {statusLabel(req.status)}
                      </span>
                    </td>
                    <td className="action-cell">
                      <Link
                        to={`/requests/${req.id}`}
                        className="action-btn action-btn-primary"
                      >
                         Voir
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

export default EmployeeDashboard;