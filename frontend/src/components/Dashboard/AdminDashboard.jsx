import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, deleteUser } from '../services/adminService';
import { getRequests } from '../services/requestService';
import { getUsers } from '../services/adminService';
import { Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { toast } from 'react-toastify';
import { FiUsers, FiFileText, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiTrendingUp, FiActivity, FiCalendar, FiRefreshCw, FiFilter, FiSearch, FiSettings, FiShield, FiZap, FiTarget, FiBarChart2, FiPieChart, FiUserX, FiMoreVertical, FiDownload } from 'react-icons/fi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [recentRequests, setRecentRequests] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('all');

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="w-4 h-4" />;
      case 'rejected': return <FiXCircle className="w-4 h-4" />;
      case 'in_progress': return <FiActivity className="w-4 h-4" />;
      case 'pending': return <FiClock className="w-4 h-4" />;
      case 'returned': return <FiAlertCircle className="w-4 h-4" />;
      default: return <FiFileText className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'pending': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'returned': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  useEffect(() => {
    loadData();
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        loadData();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh]);

  const filteredRequests = recentRequests.filter(req => {
    const matchesSearch = req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.workflowType.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <FiShield className="w-4 h-4" />;
      case 'validator': return <FiCheckCircle className="w-4 h-4" />;
      default: return <FiUsers className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-700 border-red-200';
      case 'validator': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

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
    { title: 'Utilisateurs', value: stats.totalUsers || 0, tone: 'slate', icon: <FiUsers className="w-6 h-6" />, trend: '+12%' },
    { title: 'Total demandes', value: stats.totalRequests || 0, tone: 'blue', icon: <FiFileText className="w-6 h-6" />, trend: '+8%' },
    { title: 'Demandes en attente', value: stats.pendingRequests || 0, tone: 'violet', icon: <FiClock className="w-6 h-6" />, trend: '-3%' },
    { title: 'Demandes en cours', value: stats.inProgressRequests || 0, tone: 'amber', icon: <FiActivity className="w-6 h-6" />, trend: '+5%' },
    { title: 'Demandes approuvées', value: stats.approvedRequests || 0, tone: 'green', icon: <FiCheckCircle className="w-6 h-6" />, trend: '+15%' },
    { title: 'Demandes refusées', value: stats.rejectedRequests || 0, tone: 'red', icon: <FiXCircle className="w-6 h-6" />, trend: '-2%' },
    { title: 'Demandes retournées', value: stats.returnedRequests || 0, tone: 'orange', icon: <FiAlertCircle className="w-6 h-6" />, trend: '+1%' },
    { title: 'Terminées', value: stats.completedRequests || 0, tone: 'indigo', icon: <FiTarget className="w-6 h-6" />, trend: '+10%' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Tableau de Bord Admin
              </h1>
              <p className="text-gray-600 mt-1">Vue d'ensemble complète du système</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                />
              </div>
              <select
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="all">Toutes les périodes</option>
                <option value="today">Aujourd'hui</option>
                <option value="week">Cette semaine</option>
                <option value="month">Ce mois</option>
              </select>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 ${
                  autoRefresh 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <FiRefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2">
                <FiDownload className="w-4 h-4" />
                Exporter
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Enhanced Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, index) => (
            <div
              key={card.title}
              className={`dash-stat-card dash-stat-${card.tone} animate-fadeIn hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2 rounded-lg bg-white/50`}>
                  {card.icon}
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                  card.trend.startsWith('+') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}>
                  {card.trend}
                </span>
              </div>
              <h3 className="dash-stat-title">{card.title}</h3>
              <p className="dash-stat-value">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Enhanced Recent Requests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiFileText className="w-5 h-5 text-blue-600" />
                    Dernières demandes
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Activité récente du système</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiActivity className="w-4 h-4" />
                  <span>{filteredRequests.length} demande(s)</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {filteredRequests.slice(0, 5).map((req, index) => (
                  <div
                    key={req.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono font-semibold">
                        {req.reference}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{req.workflowType}</p>
                        <p className="text-xs text-gray-500">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString('fr-FR') : '-'}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor(req.status)}`}>
                      {getStatusIcon(req.status)}
                      <span className="text-sm font-medium capitalize">
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Enhanced Recent Users */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FiUsers className="w-5 h-5 text-green-600" />
                    Derniers utilisateurs
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">Nouveaux membres inscrits</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiUsers className="w-4 h-4" />
                  <span>{recentUsers.length} utilisateur(s)</span>
                </div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {recentUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                        {user.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{user.fullName}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${getRoleColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        <span className="font-medium capitalize">{user.role}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteUser(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Supprimer l'utilisateur"
                      >
                        <FiUserX className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiBarChart2 className="w-5 h-5 text-blue-600" />
                Évolution des demandes
              </h2>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <FiMoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="h-64">
              <Line 
                data={lineData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                      }
                    },
                    x: {
                      grid: {
                        display: false
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <FiPieChart className="w-5 h-5 text-green-600" />
                Répartition des statuts
              </h2>
              <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <FiMoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="h-64">
              <Doughnut 
                data={doughnutData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Actions Section */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Actions rapides</h3>
              <p className="text-blue-100">Gérez efficacement votre système</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => navigate('/admin/settings')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <FiSettings className="w-4 h-4" />
                Paramètres
              </button>
              <button 
                onClick={() => navigate('/admin/users')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <FiUsers className="w-4 h-4" />
                Gérer les utilisateurs
              </button>
              <button 
                onClick={() => navigate('/admin/requests')}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
              >
                <FiFileText className="w-4 h-4" />
                Voir toutes les demandes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;