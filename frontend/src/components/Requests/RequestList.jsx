import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteRequest, getRequests } from '../services/requestService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import { FiFileText, FiCalendar, FiUser, FiCheckCircle, FiClock, FiXCircle, FiAlertCircle, FiTrash2, FiEye, FiFilter, FiSearch } from 'react-icons/fi';

const RequestList = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

  useEffect(() => {
    loadRequests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FiCheckCircle className="w-5 h-5" />;
      case 'pending': return <FiClock className="w-5 h-5" />;
      case 'rejected': return <FiXCircle className="w-5 h-5" />;
      case 'in_progress': return <FiAlertCircle className="w-5 h-5" />;
      default: return <FiFileText className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch = req.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.workflowType.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || req.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusStats = () => {
    const stats = {
      total: requests.length,
      approved: requests.filter(r => r.status === 'approved').length,
      pending: requests.filter(r => r.status === 'pending').length,
      rejected: requests.filter(r => r.status === 'rejected').length,
      in_progress: requests.filter(r => r.status === 'in_progress').length,
      draft: requests.filter(r => r.status === 'draft').length
    };
    return stats;
  };

  const stats = getStatusStats();

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Suivi de mes demandes
              </h1>
              <p className="text-gray-600 mt-1">Gérez et suivez toutes vos demandes en un seul endroit</p>
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
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Rejeté</option>
                <option value="in_progress">En cours</option>
                <option value="draft">Brouillon</option>
              </select>
              <Link to="/requests/new" className="btn btn-primary flex items-center gap-2">
                <FiFileText className="w-4 h-4" />
                Nouvelle demande
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Statistics Cards */}
        {!loading && requests.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 shadow-sm border border-blue-100 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-blue-600">{stats.pending}</div>
              <div className="text-sm text-blue-600">En attente</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
              <div className="text-sm text-green-600">Approuvé</div>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 shadow-sm border border-amber-100 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-amber-600">{stats.in_progress}</div>
              <div className="text-sm text-amber-600">En cours</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 shadow-sm border border-red-100 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
              <div className="text-sm text-red-600">Rejeté</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
              <div className="text-sm text-gray-600">Brouillon</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-600 border-t-transparent mb-4"></div>
            <p className="text-gray-600 text-lg">Chargement de vos demandes...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredRequests.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-gray-100 rounded-full w-24 h-24 mx-auto mb-6 flex items-center justify-center">
              <FiFileText className="w-12 h-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {requests.length === 0 ? 'Aucune demande trouvée' : 'Aucun résultat trouvé'}
            </h3>
            <p className="text-gray-600 mb-6">
              {requests.length === 0 
                ? 'Vos demandes apparaîtront ici une fois créées' 
                : 'Essayez de modifier vos filtres de recherche'}
            </p>
            {requests.length === 0 && (
              <Link 
                to="/requests/new" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiFileText className="w-4 h-4" />
                Créer votre première demande
              </Link>
            )}
          </div>
        )}

        {/* Requests Grid */}
        {!loading && filteredRequests.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((req, index) => {
              const assignedToMe = req.assignedTo === user?.id || req.assignee?.id === user?.id;
              return (
                <div
                  key={req.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 animate-fadeIn"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-6">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono font-semibold">
                            {req.reference}
                          </div>
                          {assignedToMe && (
                            <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-semibold">
                              À moi
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {req.workflowType}
                        </h3>
                      </div>
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${getStatusColor(req.status)}`}>
                        {getStatusIcon(req.status)}
                        <span className="text-sm font-medium capitalize">
                          {req.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-gray-600">
                        <FiUser className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">Créé par: {req.creator?.fullName || 'N/A'}</span>
                      </div>
                      {req.assignee?.fullName && (
                        <div className="flex items-center gap-3 text-gray-600">
                          <FiUser className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">Assigné à: {req.assignee.fullName}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-3 text-gray-600">
                        <FiCalendar className="w-4 h-4 text-gray-400" />
                        <span className="text-sm">
                          {new Date(req.createdAt).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-gray-100">
                      <Link
                        to={`/requests/${req.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <FiEye className="w-4 h-4" />
                        Voir
                      </Link>
                      <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                        onClick={() => handleDelete(req.id)}
                        disabled={deletingId === req.id}
                      >
                        {deletingId === req.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full" />
                        ) : (
                          <FiTrash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RequestList;
