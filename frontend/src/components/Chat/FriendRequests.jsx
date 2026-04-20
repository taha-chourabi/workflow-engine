import React, { useState, useEffect } from 'react';
import { FiUserPlus, FiCheck, FiX, FiLoader, FiSearch } from 'react-icons/fi';
import api from '../services/api';
import UserSelection from './UserSelection';

const FriendRequests = ({ onClose }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [showUserSelection, setShowUserSelection] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/friendship/requests');
      setRequests(res.data);
    } catch (error) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (requestId) => {
    setProcessing(prev => ({ ...prev, [requestId]: 'accepting' }));
    try {
      await api.put(`/friendship/requests/${requestId}/accept`);
      setRequests(requests.filter(req => req.id !== requestId));
    } catch (error) {
      alert('Erreur lors de l\'acceptation de la demande');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: null }));
    }
  };

  const handleDecline = async (requestId) => {
    setProcessing(prev => ({ ...prev, [requestId]: 'declining' }));
    try {
      await api.put(`/friendship/requests/${requestId}/decline`);
      setRequests(requests.filter(req => req.id !== requestId));
    } catch (error) {
      alert('Erreur lors du refus de la demande');
    } finally {
      setProcessing(prev => ({ ...prev, [requestId]: null }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col m-auto">
      {/* Header with close button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FiUserPlus className="text-green-600" size={20} />
          <h2 className="text-lg font-semibold text-gray-900">Demandes d'amis</h2>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Send Invitation Button */}
      <div className="p-4 border-b border-gray-200">
        <button
          onClick={() => setShowUserSelection(true)}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
        >
          <FiUserPlus size={16} />
          Envoyer une invitation
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 p-4 rounded-lg border">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8">
            <FiUserPlus className="mx-auto text-gray-400 mb-3" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune demande d'ami</h3>
            <p className="text-gray-500 mb-4">Vous n'avez pas de demandes d'ami en attente</p>
            <button
              onClick={() => setShowUserSelection(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <FiUserPlus size={16} />
              Envoyer une invitation
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <div key={request.id} className="bg-gray-50 p-4 rounded-lg border hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium text-lg">
                        {request.requester?.fullName?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{request.requester?.fullName}</p>
                      <p className="text-sm text-gray-500">{request.requester?.email}</p>
                      <p className="text-xs text-gray-400">
                        Envoyé le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={processing[request.id]}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      {processing[request.id] === 'accepting' ? (
                        <FiLoader className="animate-spin" size={14} />
                      ) : (
                        <FiCheck size={14} />
                      )}
                      Accepter
                    </button>
                    <button
                      onClick={() => handleDecline(request.id)}
                      disabled={processing[request.id]}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                    >
                      {processing[request.id] === 'declining' ? (
                        <FiLoader className="animate-spin" size={14} />
                      ) : (
                        <FiX size={14} />
                      )}
                      Refuser
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Selection Modal */}
      {showUserSelection && (
        <UserSelection
          onClose={() => setShowUserSelection(false)}
          mode="friend"
        />
      )}
      </div>
    </div>
  );
};

export default FriendRequests;
