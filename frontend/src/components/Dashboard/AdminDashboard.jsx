import React, { useEffect, useState } from 'react';
import { getStats, deleteUser } from '../services/adminService';
import { getRequests } from '../services/requestService';
import { getUsers } from '../services/adminService';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const AdminDashboard = () => {
  const [stats, setStats] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [allRequests, setAllRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const statsData = await getStats();
      setStats(statsData);
      const requests = await getRequests();
      const sortedRequests = [...requests].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      );
      setAllRequests(sortedRequests);
      setRecentRequests(sortedRequests.slice(0, 5));
      const users = await getUsers();
      setRecentUsers(users.slice(0, 5));
    } catch (error) {
      toast.error('Erreur chargement dashboard admin');
    }
  };

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(`Supprimer l utilisateur ${user.fullName} ?`);
    if (!confirmed) return;

    try {
      await deleteUser(user.id);
      toast.success('Utilisateur supprimé');
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
    }
  };

  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const requestsByMonth = new Array(12).fill(0);
  allRequests.forEach((request) => {
    if (!request.createdAt) return;
    const monthIndex = new Date(request.createdAt).getMonth();
    if (monthIndex >= 0 && monthIndex < 12) {
      requestsByMonth[monthIndex] += 1;
    }
  });

  const lineData = {
    labels: monthLabels,
    datasets: [
      {
        label: 'Demandes créées',
        data: requestsByMonth,
        borderColor: 'rgb(59,130,246)',
        backgroundColor: 'rgba(59,130,246,0.2)',
        tension: 0.2,
      },
    ],
  };

  const approvedCount = allRequests.filter((request) => request.status === 'approved').length;
  const rejectedCount = allRequests.filter((request) => request.status === 'rejected').length;
  const inProgressCount = allRequests.filter((request) =>
    ['pending', 'in_progress', 'returned'].includes(request.status)
  ).length;

  const doughnutData = {
    labels: ['Approuvées', 'Rejetées', 'En cours'],
    datasets: [{ data: [approvedCount, rejectedCount, inProgressCount], backgroundColor: ['#10b981', '#ef4444', '#f59e0b'] }],
  };

  const getStatusLabel = (status) => {
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

  const statCards = [
    { title: 'Utilisateurs', value: stats.totalUsers || 0, tone: 'slate' },
    { title: 'Total demandes', value: stats.totalRequests || 0, tone: 'blue' },
    { title: 'Demandes en attente', value: stats.pendingRequests || 0, tone: 'violet' },
    { title: 'Demandes en cours', value: stats.inProgressRequests || 0, tone: 'amber' },
    { title: 'Demandes approuvées', value: stats.approvedRequests || 0, tone: 'green' },
    { title: 'Demandes refusées', value: stats.rejectedRequests || 0, tone: 'red' },
    { title: 'Demandes retournées', value: stats.returnedRequests || 0, tone: 'orange' },
    { title: 'Terminées', value: stats.completedRequests || 0, tone: 'indigo' },
  ];

  return (
    <div>
      <div className="dashboard-header mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Tableau de bord Admin</h1>
        <p className="dashboard-subtitle">Pilotage des utilisateurs, demandes et flux de validation</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {statCards.map((card) => (
          <div key={card.title} className={`dash-stat-card dash-stat-${card.tone}`}>
            <h3 className="dash-stat-title">{card.title}</h3>
            <p className="dash-stat-value">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card dashboard-card">
          <h2 className="font-bold mb-4">Dernières demandes</h2>
          <table>
            <thead>
              <tr><th>Réf.</th><th>Type</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {recentRequests.map(req => (
                <tr key={req.id}>
                  <td>{req.reference}</td>
                  <td>{req.workflowType}</td>
                  <td><span className={`status status-${req.status}`}>{getStatusLabel(req.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card dashboard-card">
          <h2 className="font-bold mb-4">Derniers utilisateurs</h2>
          <table>
            <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Action</th></tr></thead>
            <tbody>
              {recentUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.fullName}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      onClick={() => handleDeleteUser(user)}
                      className="btn btn-danger text-xs"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="card dashboard-card">
          <h2 className="font-bold mb-4">Évolution des demandes</h2>
          <Line data={lineData} />
        </div>
        <div className="card dashboard-card">
          <h2 className="font-bold mb-4">Répartition des statuts</h2>
          <Doughnut data={doughnutData} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;