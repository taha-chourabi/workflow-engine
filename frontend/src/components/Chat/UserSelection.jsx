import React, { useState, useEffect } from 'react';
import { FiSearch, FiUserPlus, FiX, FiMessageSquare } from 'react-icons/fi';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col m-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'message' ? 'Nouveau message' : 'Ajouter un ami'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder={mode === 'message' ? 'Rechercher un ami...' : 'Rechercher un utilisateur...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center space-x-3 p-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'Aucun ami trouvé' : mode === 'message' ? 'Aucun ami disponible' : 'Aucun utilisateur disponible'}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-medium">
                        {user.fullName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.fullName}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400">{user.department}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectUser(user)}
                    disabled={sending || user.requestSent}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                  >
                    {user.requestSent ? (
                      'Envoyé'
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
