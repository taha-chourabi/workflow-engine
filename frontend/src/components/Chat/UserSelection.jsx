import React, { useState, useEffect } from 'react';
import { FiSearch, FiUserPlus, FiX, FiMessageSquare, FiCheck } from 'react-icons/fi';
import api from '../services/api';

const UserSelection = ({ onClose, onSelectUser, mode = 'message' }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const filtered = users.filter(user =>
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredUsers(filtered);
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      let res;
      if (mode === 'message') {
        // Fetch only friends for messaging
        res = await api.get('/friendship/friends');
      } else {
        // Fetch all users for friend requests
        res = await api.get('/friendship/users');
      }
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = async (user) => {
    if (mode === 'message') {
      // Create a new chat with this user
      try {
        setSending(true);
        const res = await api.post('/chats', {
          participantIds: [user.id],
          isGroup: false
        });
        window.location.href = `/chats/${res.data.id}`;
      } catch (error) {
        console.error('Error creating chat:', error);
      } finally {
        setSending(false);
      }
    } else if (mode === 'friend') {
      // Send friend request
      try {
        setSending(true);
        await api.post('/friendship/request', {
          addresseeId: user.id
        });
        alert('Demande d\'ami envoyée!');
        // Update user list to show they've been sent a request
        setUsers(users.map(u =>
          u.id === user.id ? { ...u, requestSent: true } : u
        ));
      } catch (error) {
        alert(error.response?.data?.message || 'Erreur lors de l\'envoi de la demande');
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <div className="ui-modal-backdrop">
      <div className="ui-modal max-w-md">
        {/* Header */}
        <div className="ui-modal-header">
          <div className="ui-modal-title">
            <span className={`ui-icon-tile h-9 w-9 ${mode === 'message' ? 'ui-tile-brand' : 'ui-tile-green'}`}>
              {mode === 'message' ? <FiMessageSquare size={18} /> : <FiUserPlus size={18} />}
            </span>
            <h2>{mode === 'message' ? 'Nouveau message' : 'Ajouter un ami'}</h2>
          </div>
          <button onClick={onClose} className="ui-icon-btn">
            <FiX size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder={mode === 'message' ? 'Rechercher un ami...' : 'Rechercher un utilisateur...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ui-input ui-input-icon"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="space-y-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <div className="ui-skeleton h-10 w-10 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="ui-skeleton h-3.5 w-3/4"></div>
                    <div className="ui-skeleton h-3 w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="ui-empty py-10">
              <div className="ui-empty-icon">
                <FiSearch size={22} />
              </div>
              <p className="ui-empty-text">
                {searchTerm ? 'Aucun ami trouvé' : mode === 'message' ? 'Aucun ami disponible' : 'Aucun utilisateur disponible'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map((user) => (
                <div key={user.id} className="ui-row px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="ui-avatar h-10 w-10 bg-stone-800 text-sm">
                      {user.fullName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user.fullName}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                      {user.department && (
                        <span className="ui-badge ui-badge-slate mt-1 text-[10px]">{user.department}</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectUser(user)}
                    disabled={sending || user.requestSent}
                    className={`ui-btn ui-btn-sm ${user.requestSent ? 'ui-btn-secondary' : 'ui-btn-primary'}`}
                  >
                    {user.requestSent ? (
                      <>
                        <FiCheck size={14} />
                        Envoyé
                      </>
                    ) : mode === 'message' ? (
                      <>
                        <FiMessageSquare size={14} />
                        Envoyer
                      </>
                    ) : (
                      <>
                        <FiUserPlus size={14} />
                        Ajouter
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSelection;
