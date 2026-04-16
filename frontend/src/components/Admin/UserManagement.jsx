import React, { useEffect, useState } from 'react';
import { getUsers, activateUser, rejectUser } from '../services/adminService';
import { toast } from 'react-toastify';

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

  useEffect(() => {
    loadPendingUsers();
  }, []);

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

  if (loading) return <div className="p-6">Chargement des inscriptions...</div>;

  const activeCount = allUsers.filter((user) => user.isActive).length;
  const inactiveCount = allUsers.length - activeCount;
  const pendingCount = pendingUsers.length;

  return (
    <div>
      <div className="dashboard-header mb-6">
        <h1 className="text-2xl font-bold">Gestion des utilisateurs</h1>
        <p className="dashboard-subtitle">Validation des inscriptions et supervision de tous les comptes</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="dash-stat-card dash-stat-violet">
          <h3 className="dash-stat-title">Inscriptions en attente</h3>
          <p className="dash-stat-value">{pendingCount}</p>
        </div>
        <div className="dash-stat-card dash-stat-green">
          <h3 className="dash-stat-title">Comptes actifs</h3>
          <p className="dash-stat-value">{activeCount}</p>
        </div>
        <div className="dash-stat-card dash-stat-red">
          <h3 className="dash-stat-title">Comptes inactifs</h3>
          <p className="dash-stat-value">{inactiveCount}</p>
        </div>
      </div>

      <div className="card dashboard-card">
        <h2 className="font-bold mb-4">Inscriptions en attente</h2>
        {pendingUsers.length === 0 ? (
          <p className="text-gray-500">Aucune inscription en attente.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Nom</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Département</th>
                  <th className="text-left py-2">Niveau</th>
                  <th className="text-left py-2">Rôle</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <input
                        type="text"
                        value={activationDrafts[user.id]?.department || ''}
                        onChange={(e) => updateDraft(user.id, 'department', e.target.value)}
                        className="border rounded px-2 py-1 w-full"
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={activationDrafts[user.id]?.hierarchyLevel || 1}
                        onChange={(e) => updateDraft(user.id, 'hierarchyLevel', e.target.value)}
                        className="border rounded px-2 py-1 w-20"
                      />
                    </td>
                    <td>
                      <select
                        value={activationDrafts[user.id]?.role || 'EMPLOYEE'}
                        onChange={(e) => updateDraft(user.id, 'role', e.target.value)}
                        className="border rounded px-2 py-1"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        onClick={() => handleActivate(user.id)}
                        className="bg-green-500 text-white px-3 py-1 rounded mr-2 hover:bg-green-600"
                      >
                        Activer
                      </button>
                      <button
                        onClick={() => handleReject(user.id)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                      >
                        Refuser
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card dashboard-card mt-6">
        <h2 className="font-bold mb-4">Tous les utilisateurs</h2>
        {allUsers.length === 0 ? (
          <p className="text-gray-500">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Nom</th>
                  <th className="text-left py-2">Email</th>
                  <th className="text-left py-2">Département</th>
                  <th className="text-left py-2">Rôle</th>
                  <th className="text-left py-2">Statut compte</th>
                  <th className="text-left py-2">Validation</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id} className="border-b">
                    <td className="py-2">{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>{user.department}</td>
                    <td>{user.role}</td>
                    <td>
                      <span className={`status ${user.isActive ? 'status-approved' : 'status-rejected'}`}>
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <span className={`status status-${user.registrationStatus}`}>
                        {user.registrationStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;