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
          <p className="dashboard-subtitle">Suivi de vos demandes et de leur état d avancement</p>
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

      <div className="card dashboard-card">
        <table>
          <thead>
            <tr><th>Référence</th><th>Type</th><th>Date</th><th>Statut</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id}>
                <td>{req.reference}</td>
                <td>{req.workflowType}</td>
                <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                <td><span className={`status status-${req.status}`}>{statusLabel(req.status)}</span></td>
                <td><Link to={`/requests/${req.id}`} className="text-blue-600">Voir</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EmployeeDashboard;