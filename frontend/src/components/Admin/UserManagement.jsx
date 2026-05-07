import React, { useEffect, useState } from 'react';
import { getUsers, activateUser, rejectUser } from '../services/adminService';
import { toast } from 'react-toastify';
import { FiUsers, FiUserCheck, FiUserX, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiSearch, FiFilter, FiRefreshCw, FiSettings, FiShield, FiEdit, FiTrash2, FiMail, FiBuilding, FiLayers, FiMoreVertical, FiDownload, FiCalendar, FiTrendingUp, FiActivity, FiUserPlus, FiUserMinus } from 'react-icons/fi';

const ROLE_OPTIONS = [
  'EMPLOYEE',
  'ADMIN',
  'DG',
  'DCF',
  'DCC',
  'DCRH',
  'DSI',
  'CFO_GROUPE',
  'DIRECTEUR_INVESTISSEMENT',
  'DIRECTEUR_CG',
  'DCU_SF',
  'DCU_SK',
  'HOF_MARKETING',
  'HOF_PRODUCTION',
  'HOF_IT',
  'SERVICE_RECOUVREMENT',
  'SERVICE_FISCAL',
  'CAISSIER',
];

const UserManagement = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [activationDrafts, setActivationDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole, setFilterRole] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="w-4 h-4" />;
      case 'rejected': return <FiXCircle className="w-4 h-4" />;
      case 'pending': return <FiClock className="w-4 h-4" />;
      default: return <FiAlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-50 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-200';
      case 'pending': return 'bg-violet-50 text-violet-700 border-violet-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <FiShield className="w-4 h-4" />;
      case 'DG': return <FiSettings className="w-4 h-4" />;
      case 'DSI': return <FiActivity className="w-4 h-4" />;
      default: return <FiUsers className="w-4 h-4" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-50 text-red-700 border-red-200';
      case 'DG': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DSI': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  useEffect(() => {
    loadPendingUsers();
    if (autoRefresh) {
      const intervalId = setInterval(() => {
        loadPendingUsers();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(intervalId);
    }
  }, [autoRefresh]);

  const filteredPendingUsers = pendingUsers.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const filteredAllUsers = allUsers.filter(user => {
    const matchesSearch = user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && user.isActive) ||
                          (filterStatus === 'inactive' && !user.isActive) ||
                          (filterStatus === 'pending' && user.registrationStatus === 'pending');
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesStatus && matchesRole;
  });

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const selectAllUsers = () => {
    if (selectedUsers.length === filteredAllUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredAllUsers.map(user => user.id));
    }
  };

  const bulkActivate = async () => {
    // Implementation for bulk activation
    toast.info('Activation en masse bientôt disponible');
  };

  const bulkReject = async () => {
    // Implementation for bulk rejection
    toast.info('Rejet en masse bientôt disponible');
  };

  const loadPendingUsers = async () => {
    try {
      // Récupère tous les utilisateurs avec registrationStatus = 'pending'
      const users = await getUsers({ registrationStatus: 'pending' });
      setPendingUsers(users);

      // Récupère toute la base utilisateurs pour affichage global.
      const all = await getUsers();
      setAllUsers(all);

      const drafts = {};
      users.forEach((user) => {
        drafts[user.id] = {
          role: user.role || 'EMPLOYEE',
          department: user.department || '',
          hierarchyLevel: Number(user.hierarchyLevel || 1),
        };
      });
      setActivationDrafts(drafts);
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = (userId, field, value) => {
    setActivationDrafts((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: field === 'hierarchyLevel' ? Number(value) : value,
      },
    }));
  };

  const handleActivate = async (userId) => {
    try {
      const payload = activationDrafts[userId] || {};
      await activateUser(userId, payload);
      toast.success('Utilisateur activé avec succès');
      loadPendingUsers(); // rafraîchit la liste
    } catch (error) {
      toast.error('Erreur lors de l’activation');
    }
  };

  const handleReject = async (userId) => {
    const reason = prompt('Motif du refus :');
    if (!reason) return;
    try {
      await rejectUser(userId, reason);
      toast.success('Utilisateur refusé');
      loadPendingUsers();
    } catch (error) {
      toast.error('Erreur lors du refus');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 text-lg">Chargement des utilisateurs...</p>
        </div>
      </div>
    );
  }

  const activeCount = allUsers.filter((user) => user.isActive).length;
  const inactiveCount = allUsers.length - activeCount;
  const pendingCount = pendingUsers.length;
  const approvedCount = allUsers.filter(user => user.registrationStatus === 'approved').length;

  const statCards = [
    { title: 'Inscriptions en attente', value: pendingCount, icon: <FiClock className="w-6 h-6" />, color: 'violet', trend: '+2' },
    { title: 'Comptes actifs', value: activeCount, icon: <FiUserCheck className="w-6 h-6" />, color: 'green', trend: '+5' },
    { title: 'Comptes inactifs', value: inactiveCount, icon: <FiUserX className="w-6 h-6" />, color: 'red', trend: '-1' },
    { title: 'Total utilisateurs', value: allUsers.length, icon: <FiUsers className="w-6 h-6" />, color: 'blue', trend: '+3' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Gestion des Utilisateurs
              </h1>
              <p className="text-gray-600 mt-1">Administration complète des comptes utilisateurs</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
              <div className="relative flex-shrink-0">
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all flex-shrink-0"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actifs</option>
                <option value="inactive">Inactifs</option>
                <option value="pending">En attente</option>
              </select>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all flex-shrink-0"
              >
                <option value="all">Tous les rôles</option>
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role}>{role}</option>
                ))}
              </select>
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`px-4 py-2 rounded-lg border transition-all flex items-center gap-2 flex-shrink-0 ${
                  autoRefresh 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                <FiRefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                Auto
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((card, index) => (
            <div
              key={card.title}
              className={`dash-stat-card dash-stat-${card.color} animate-fadeIn hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}
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

        {/* Pending Users Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow mb-8">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiUserPlus className="w-5 h-5 text-violet-600" />
                  Inscriptions en attente de validation
                </h2>
                <p className="text-sm text-gray-600 mt-1">Nouveaux utilisateurs à approuver</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FiClock className="w-4 h-4" />
                <span>{filteredPendingUsers.length} en attente</span>
              </div>
            </div>
          </div>
          <div className="p-6">
            {filteredPendingUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FiUserCheck className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune inscription en attente</h3>
                <p className="text-gray-600">Tous les utilisateurs ont été traités</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredPendingUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:bg-gray-100 transition-colors animate-fadeIn"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {user.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                          <div className="bg-violet-100 text-violet-700 px-2 py-1 rounded-full text-xs font-semibold">
                            En attente
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3 flex items-center gap-2">
                          <FiMail className="w-4 h-4" />
                          {user.email}
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Département</label>
                            <input
                              type="text"
                              value={activationDrafts[user.id]?.department || ''}
                              onChange={(e) => updateDraft(user.id, 'department', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              placeholder="Ex: IT, RH..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Niveau hiérarchique</label>
                            <input
                              type="number"
                              min="1"
                              value={activationDrafts[user.id]?.hierarchyLevel || 1}
                              onChange={(e) => updateDraft(user.id, 'hierarchyLevel', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Rôle</label>
                            <select
                              value={activationDrafts[user.id]?.role || 'EMPLOYEE'}
                              onChange={(e) => updateDraft(user.id, 'role', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            >
                              {ROLE_OPTIONS.map((role) => (
                                <option key={role} value={role}>{role}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex items-end gap-2">
                            <button
                              onClick={() => handleActivate(user.id)}
                              className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                              <FiCheckCircle className="w-4 h-4" />
                              Activer
                            </button>
                            <button
                              onClick={() => handleReject(user.id)}
                              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-1 text-sm"
                            >
                              <FiXCircle className="w-4 h-4" />
                              Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Users Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <FiUsers className="w-5 h-5 text-blue-600" />
                  Tous les utilisateurs
                </h2>
                <p className="text-sm text-gray-600 mt-1">Liste complète des comptes utilisateurs</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
                >
                  <FiSettings className="w-4 h-4" />
                  Actions
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FiUsers className="w-4 h-4" />
                  <span>{filteredAllUsers.length} utilisateur(s)</span>
                </div>
              </div>
            </div>
            {showBulkActions && selectedUsers.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700">{selectedUsers.length} utilisateur(s) sélectionné(s)</span>
                  <div className="flex gap-2">
                    <button
                      onClick={bulkActivate}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                    >
                      Activer tout
                    </button>
                    <button
                      onClick={bulkReject}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                    >
                      Refuser tout
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="p-6">
            {filteredAllUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FiUsers className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
                <p className="text-gray-600">Les utilisateurs apparaîtront ici une fois inscrits</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAllUsers.map((user, index) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors animate-fadeIn"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      {showBulkActions && (
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      )}
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                        {user.fullName?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{user.department || '-'}</p>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="font-medium">{user.role}</span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${
                          user.isActive ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {user.isActive ? <FiUserCheck className="w-3 h-3" /> : <FiUserX className="w-3 h-3" />}
                          <span className="font-medium">{user.isActive ? 'Actif' : 'Inactif'}</span>
                        </div>
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${getStatusColor(user.registrationStatus)}`}>
                          {getStatusIcon(user.registrationStatus)}
                          <span className="font-medium capitalize">
                            {user.registrationStatus === 'approved' ? 'Approuvé' :
                             user.registrationStatus === 'pending' ? 'En attente' : 'Rejeté'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;