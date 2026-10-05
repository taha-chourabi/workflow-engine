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
    <div className="ui-modal-backdrop">
      <div className="ui-modal max-w-md">
      {/* Header with close button */}
      <div className="ui-modal-header">
        <div className="ui-modal-title">
          <span className="ui-icon-tile ui-tile-green h-9 w-9">
            <FiUserPlus size={18} />
          </span>
          <div>
            <h2>Demandes d'amis</h2>
            <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
              {loading ? 'Chargement…' : `${requests.length} en attente`}
            </p>
          </div>
        </div>
        <button onClick={onClose} className="ui-icon-btn">
          <FiX size={18} />
        </button>
      </div>

      {/* Send Invitation Button */}
      <div className="border-b border-slate-100 p-4 dark:border-slate-800">
        <button
          onClick={() => setShowUserSelection(true)}
          className="ui-btn ui-btn-primary w-full"
        >
          <FiUserPlus size={16} />
          Envoyer une invitation
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 dark:border-slate-800">
                <div className="ui-skeleton h-11 w-11 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="ui-skeleton h-3.5 w-3/4"></div>
                  <div className="ui-skeleton h-3 w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div className="ui-empty py-8">
            <div className="ui-empty-icon">
              <FiUserPlus size={24} />
            </div>
            <h3 className="ui-empty-title">Aucune demande d'ami</h3>
            <p className="ui-empty-text mb-5">Vous n'avez pas de demandes d'ami en attente</p>
            <button
              onClick={() => setShowUserSelection(true)}
              className="ui-btn ui-btn-secondary"
            >
              <FiUserPlus size={16} />
              Envoyer une invitation
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3 transition hover:border-brand-200 hover:shadow-soft dark:border-slate-800 dark:hover:border-brand-500/40">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="ui-avatar h-11 w-11 bg-stone-800 text-base">
                      {request.requester?.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{request.requester?.fullName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{request.requester?.email}</p>
                      <p className="text-[11px] text-slate-400">
                        Envoyé le {new Date(request.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => handleAccept(request.id)}
                      disabled={processing[request.id]}
                      className="ui-btn ui-btn-sm ui-btn-success"
                      title="Accepter"
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
                      className="ui-btn ui-btn-sm ui-btn-danger-soft"
                      title="Refuser"
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
