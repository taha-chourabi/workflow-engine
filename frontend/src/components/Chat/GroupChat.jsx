import React, { useState, useEffect } from 'react';
import { FiUsers, FiSearch, FiX, FiPlus, FiCheck, FiLoader } from 'react-icons/fi';
import api from '../services/api';

const GroupChat = ({ onClose }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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
      const res = await api.get('/friendship/users');
      setUsers(res.data);
      setFilteredUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === user.id);
      if (isSelected) {
        return prev.filter(u => u.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  };

  const createGroupChat = async (e) => {
    e.preventDefault();

    if (!groupName.trim()) {
      alert('Veuillez entrer un nom pour le groupe');
      return;
    }

    if (selectedUsers.length === 0) {
      alert('Veuillez sélectionner au moins un membre');
      return;
    }

    try {
      setCreating(true);
      const participantIds = selectedUsers.map(user => user.id);
      const res = await api.post('/chats', {
        participantIds,
        name: groupName,
        isGroup: true
      });

      window.location.href = `/chats/${res.data.id}`;
    } catch (error) {
      alert(error.response?.data?.message || 'Erreur lors de la création du groupe');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="ui-modal-backdrop">
      <div className="ui-modal max-w-2xl">
        {/* Header */}
        <div className="ui-modal-header">
          <div className="ui-modal-title">
            <span className="ui-icon-tile ui-tile-violet h-9 w-9">
              <FiUsers size={18} />
            </span>
            <div>
              <h2>Créer un groupe</h2>
              <p className="text-xs font-normal text-slate-500 dark:text-slate-400">Réunissez plusieurs collègues dans une même conversation</p>
            </div>
          </div>
          <button onClick={onClose} className="ui-icon-btn">
            <FiX size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={createGroupChat} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto p-5">
            {/* Group Name */}
            <div>
              <label className="ui-label">Nom du groupe</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Entrez le nom du groupe..."
                className="ui-input"
                required
              />
            </div>

            {/* Search */}
            <div>
              <label className="ui-label">Ajouter des membres</label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Rechercher des utilisateurs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ui-input ui-input-icon"
                />
              </div>
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div>
                <label className="ui-label">Membres sélectionnés ({selectedUsers.length})</label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div
                      key={user.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-2 text-sm font-medium text-brand-700 ring-1 ring-inset ring-brand-200 dark:bg-brand-500/10 dark:text-brand-200 dark:ring-brand-500/30"
                    >
                      <span className="ui-avatar h-6 w-6 bg-brand-500 text-[10px] ring-0">{user.fullName.charAt(0).toUpperCase()}</span>
                      <span>{user.fullName}</span>
                      <button
                        type="button"
                        onClick={() => toggleUserSelection(user)}
                        className="rounded-full p-0.5 text-brand-500 hover:bg-brand-100 hover:text-brand-700 dark:hover:bg-brand-500/20"
                      >
                        <FiX size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Users List */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
              {loading ? (
                <div className="space-y-1 p-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5">
                      <div className="ui-skeleton h-8 w-8 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="ui-skeleton h-3.5 w-3/4"></div>
                        <div className="ui-skeleton h-3 w-1/2"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {searchTerm ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur disponible'}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.some(u => u.id === user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => toggleUserSelection(user)}
                        className={`flex cursor-pointer items-center justify-between px-3 py-2.5 transition-colors ${
                          isSelected ? 'bg-brand-50/70 dark:bg-brand-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`ui-avatar h-8 w-8 text-sm ${
                            isSelected ? 'bg-brand-600' : 'bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                          }`}>
                            {user.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{user.fullName}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
                          </div>
                        </div>
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded-md border transition ${
                            isSelected ? 'border-brand-600 bg-brand-600' : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <FiCheck size={12} className="text-white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/30">
            <button
              type="button"
              onClick={onClose}
              className="ui-btn ui-btn-secondary"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating || !groupName.trim() || selectedUsers.length === 0}
              className="ui-btn ui-btn-primary"
            >
              {creating ? (
                <>
                  <FiLoader className="animate-spin" size={16} />
                  Création...
                </>
              ) : (
                <>
                  <FiPlus size={16} />
                  Créer le groupe
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupChat;
