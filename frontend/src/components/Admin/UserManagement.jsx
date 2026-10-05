import React, { useEffect, useState } from 'react';
import { getUsers, activateUser, rejectUser } from '../services/adminService';
import { toast } from 'react-toastify';
import { FiUsers, FiUserCheck, FiUserX, FiClock, FiCheckCircle, FiXCircle, FiAlertCircle, FiSearch, FiFilter, FiRefreshCw, FiSettings, FiShield, FiEdit, FiTrash2, FiMail, FiBuilding, FiLayers, FiMoreVertical, FiDownload, FiCalendar, FiTrendingUp, FiActivity, FiUserPlus, FiUserMinus, FiChevronDown } from 'react-icons/fi';

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
      case 'approved': return <FiCheckCircle className="w-3 h-3" />;
      case 'rejected': return <FiXCircle className="w-3 h-3" />;
      case 'pending': return <FiClock className="w-3 h-3" />;
      default: return <FiAlertCircle className="w-3 h-3" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'ui-badge-green';
      case 'rejected': return 'ui-badge-red';
      case 'pending': return 'ui-badge-violet';
      default: return 'ui-badge-slate';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'ADMIN': return <FiShield className="w-3 h-3" />;
      case 'DG': return <FiSettings className="w-3 h-3" />;
      case 'DSI': return <FiActivity className="w-3 h-3" />;
      default: return <FiUsers className="w-3 h-3" />;
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'ADMIN': return 'ui-badge-red';
      case 'DG': return 'ui-badge-violet';
      case 'DSI': return 'ui-badge-blue';
      default: return 'ui-badge-slate';
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
      <div className="ui-page">
        <div className="space-y-2">
          <div className="ui-skeleton h-4 w-28"></div>
          <div className="ui-skeleton h-8 w-72"></div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="ui-skeleton h-28 rounded-2xl"></div>)}
        </div>
        <div className="ui-skeleton h-64 rounded-2xl"></div>
      </div>
    );
  }

  const activeCount = allUsers.filter((user) => user.isActive).length;
  const inactiveCount = allUsers.length - activeCount;
  const pendingCount = pendingUsers.length;
  const approvedCount = allUsers.filter(user => user.registrationStatus === 'approved').length;

  const statCards = [
    { title: 'Inscriptions en attente', value: pendingCount, icon: <FiClock className="w-5 h-5" />, color: 'violet', trend: '+2' },
    { title: 'Comptes actifs', value: activeCount, icon: <FiUserCheck className="w-5 h-5" />, color: 'green', trend: '+5' },
    { title: 'Comptes inactifs', value: inactiveCount, icon: <FiUserX className="w-5 h-5" />, color: 'red', trend: '-1' },
    { title: 'Total utilisateurs', value: allUsers.length, icon: <FiUsers className="w-5 h-5" />, color: 'blue', trend: '+3' },
  ];

  const darkField =
    '!h-10 rounded-full border border-white/15 !bg-white/[0.06] !text-white outline-none transition placeholder:text-stone-400 hover:!bg-white/10 focus:border-white/40';
  const lightField =
    'h-10 w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--ink-2)] focus:ring-4 focus:ring-brand-500/10';

  const registrationLabel = (status) =>
    status === 'approved' ? 'Approuvé' : status === 'pending' ? 'En attente' : 'Rejeté';

  return (
    <div className="ui-page">
      {/* Bandeau */}
      <div className="relative overflow-hidden rounded-[1.5rem] bg-[#1b1b1a] px-6 py-8 text-white sm:px-10 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '40px 40px' }}
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-[radial-gradient(circle,rgba(232,89,26,0.45),transparent_65%)] blur-2xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-400">
              <span className="h-px w-6 bg-brand-500" />
              Administration
            </p>
            <h1 className="mt-5 font-['Inter_Tight'] text-5xl font-extralight leading-none tracking-[-0.045em] sm:text-6xl">
              Utilisateurs
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <FiSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Nom ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`${darkField} w-56 pl-10 pr-4 text-sm`}
              />
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${darkField} appearance-none pl-4 pr-9 text-sm`}>
                <option value="all" className="text-[#1b1b1a]">Tous les statuts</option>
                <option value="active" className="text-[#1b1b1a]">Actifs</option>
                <option value="inactive" className="text-[#1b1b1a]">Inactifs</option>
                <option value="pending" className="text-[#1b1b1a]">En attente</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
            <div className="relative">
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className={`${darkField} appearance-none pl-4 pr-9 text-sm`}>
                <option value="all" className="text-[#1b1b1a]">Tous les rôles</option>
                {ROLE_OPTIONS.map(role => (
                  <option key={role} value={role} className="text-[#1b1b1a]">{role}</option>
                ))}
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 text-sm text-stone-200 transition hover:bg-white/15"
              title="Actualisation automatique"
            >
              <span className={`h-2 w-2 rounded-full ${autoRefresh ? 'animate-pulse bg-emerald-400' : 'bg-stone-500'}`} />
              Auto
            </button>
          </div>
        </div>

        <div className="relative mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 lg:grid-cols-4">
          {statCards.map((card, index) => (
            <div key={card.title} className="bg-[#1b1b1a]/95 px-5 py-5">
              <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-stone-500 [&>svg]:h-3 [&>svg]:w-3">
                {card.icon} {card.title}
              </p>
              <p className={`mt-3 font-['Inter_Tight'] text-4xl font-extralight tabular-nums tracking-[-0.04em] sm:text-5xl ${index === 0 && card.value > 0 ? 'text-brand-400' : ''}`}>
                {card.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Inscriptions en attente */}
      <section>
        <div className="mb-4 flex items-end justify-between border-b border-[var(--line)] pb-3">
          <div>
            <span className="ui-eyebrow">Validation</span>
            <h2 className="mt-2 font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">Inscriptions en attente</h2>
          </div>
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${filteredPendingUsers.length ? 'bg-brand-500 text-white' : 'border border-[var(--line)] text-[var(--muted)]'}`}>
            <FiClock className="h-3 w-3" /> {filteredPendingUsers.length} en attente
          </span>
        </div>

        {filteredPendingUsers.length === 0 ? (
          <div className="flex items-center gap-4 rounded-[1.1rem] border border-dashed border-[var(--line)] px-6 py-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] text-emerald-600">
              <FiUserCheck className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm text-[var(--ink)]">Aucune inscription en attente</p>
              <p className="text-xs text-[var(--muted)]">Tous les utilisateurs ont été traités</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
            {filteredPendingUsers.map((user, index) => (
              <div
                key={user.id}
                className="relative overflow-hidden rounded-[1.1rem] border border-[var(--line)] bg-[var(--surface)] animate-fade-up"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <span className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
                <div className="flex items-center gap-4 border-b border-[var(--line-soft)] px-6 py-4">
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-[#1b1b1a] text-sm font-medium text-white">
                    {user.fullName?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-['Inter_Tight'] text-lg font-light tracking-[-0.02em] text-[var(--ink)]">{user.fullName}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-[var(--muted)]">
                      <FiMail className="h-3 w-3 flex-shrink-0" /> {user.email}
                    </p>
                  </div>
                  <span className="ui-badge ui-badge-brand">Nouveau</span>
                </div>
                <div className="grid grid-cols-1 gap-3 px-6 py-4 sm:grid-cols-3">
                  <div>
                    <label className="ui-label">Département</label>
                    <input
                      type="text"
                      value={activationDrafts[user.id]?.department || ''}
                      onChange={(e) => updateDraft(user.id, 'department', e.target.value)}
                      className={lightField}
                      placeholder="Ex: IT, RH..."
                    />
                  </div>
                  <div>
                    <label className="ui-label">Niveau hiérarchique</label>
                    <input
                      type="number"
                      min="1"
                      value={activationDrafts[user.id]?.hierarchyLevel || 1}
                      onChange={(e) => updateDraft(user.id, 'hierarchyLevel', e.target.value)}
                      className={lightField}
                    />
                  </div>
                  <div>
                    <label className="ui-label">Rôle</label>
                    <div className="relative">
                      <select
                        value={activationDrafts[user.id]?.role || 'EMPLOYEE'}
                        onChange={(e) => updateDraft(user.id, 'role', e.target.value)}
                        className={`${lightField} appearance-none pr-9`}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>{role}</option>
                        ))}
                      </select>
                      <FiChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 px-6 pb-5">
                  <button
                    onClick={() => handleReject(user.id)}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-sm text-[var(--ink-2)] transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                  >
                    <FiXCircle className="h-4 w-4" />
                    Refuser
                  </button>
                  <button
                    onClick={() => handleActivate(user.id)}
                    className="group inline-flex h-10 items-center gap-3 rounded-full bg-[var(--ink)] pl-5 pr-1.5 text-sm font-medium text-[var(--app-bg)] transition-colors hover:bg-brand-500 hover:text-white"
                  >
                    Activer le compte
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--app-bg)] text-[var(--ink)]">
                      <FiCheckCircle className="h-4 w-4" />
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tous les utilisateurs */}
      <section className="ui-card overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--line-soft)] px-6 py-5">
          <div>
            <p className="ui-stat-label">Annuaire</p>
            <h2 className="mt-1 font-['Inter_Tight'] text-2xl font-light tracking-[-0.03em] text-[var(--ink)]">Tous les utilisateurs</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--muted)]">{filteredAllUsers.length} utilisateur(s)</span>
            <button
              onClick={() => setShowBulkActions(!showBulkActions)}
              className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition ${
                showBulkActions ? 'bg-[var(--ink)] text-[var(--app-bg)]' : 'border border-[var(--line)] text-[var(--ink-2)] hover:border-[var(--ink-2)]'
              }`}
            >
              <FiSettings className="h-3.5 w-3.5" />
              Actions groupées
            </button>
          </div>
        </div>

        {showBulkActions && selectedUsers.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line-soft)] bg-[var(--surface-2)] px-6 py-3">
            <span className="text-sm text-[var(--ink)]">{selectedUsers.length} utilisateur(s) sélectionné(s)</span>
            <div className="flex gap-2">
              <button onClick={bulkActivate} className="ui-btn ui-btn-sm ui-btn-primary">Activer tout</button>
              <button onClick={bulkReject} className="ui-btn ui-btn-sm ui-btn-danger-soft">Refuser tout</button>
            </div>
          </div>
        )}

        {filteredAllUsers.length === 0 ? (
          <div className="ui-empty">
            <div className="ui-empty-icon"><FiUsers className="h-6 w-6" /></div>
            <h3 className="ui-empty-title">Aucun utilisateur trouvé</h3>
            <p className="ui-empty-text">Les utilisateurs apparaîtront ici une fois inscrits</p>
          </div>
        ) : (
          <>
            <div className="hidden grid-cols-[2.2fr_1fr_1.2fr_0.8fr_0.9fr] gap-4 border-b border-[var(--line-soft)] px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)] lg:grid">
              <span>Utilisateur</span>
              <span>Département</span>
              <span>Rôle</span>
              <span>Compte</span>
              <span>Inscription</span>
            </div>
            <ul className="divide-y divide-[var(--line-soft)]">
              {filteredAllUsers.map((user, index) => (
                <li
                  key={user.id}
                  className="grid grid-cols-1 items-center gap-3 px-6 py-4 transition-colors hover:bg-[var(--surface-2)] lg:grid-cols-[2.2fr_1fr_1.2fr_0.8fr_0.9fr] lg:gap-4 animate-fade-up"
                  style={{ animationDelay: `${Math.min(index, 12) * 25}ms` }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {showBulkActions && (
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="h-4 w-4 rounded border-[var(--line)] accent-[#e8591a]"
                      />
                    )}
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#1b1b1a] text-sm font-medium text-white">
                      {user.fullName?.charAt(0).toUpperCase() || 'U'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[var(--ink)]">{user.fullName}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
                    </div>
                  </div>
                  <span className="truncate text-sm text-[var(--ink-2)]">{user.department || '-'}</span>
                  <span>
                    <span className={`ui-badge ${getRoleColor(user.role)}`}>{user.role}</span>
                  </span>
                  <span className="flex items-center gap-2 text-sm text-[var(--ink-2)]">
                    <span className={`h-2 w-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.isActive ? 'Actif' : 'Inactif'}
                  </span>
                  <span>
                    <span className={`ui-badge ${getStatusColor(user.registrationStatus)}`}>{registrationLabel(user.registrationStatus)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
};

export default UserManagement;
