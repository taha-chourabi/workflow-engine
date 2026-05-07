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

      <div className="card dashboard-card">
        <h2 className="font-bold mb-4">Demandes en attente de votre action</h2>
        {pendingForMe.length === 0 ? (
          <p className="text-slate-500">Aucune demande en attente.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Référence</th>
                <th>Type</th>
                <th>Demandeur</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {pendingForMe.map((req) => (
                <tr key={req.id}>
                  <td>{req.reference}</td>
                  <td>{req.workflowType}</td>
                  <td>{req.creator?.fullName || '-'}</td>
                  <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/requests/${req.id}`} className="text-blue-600">Traiter</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default ValidatorDashboard;
