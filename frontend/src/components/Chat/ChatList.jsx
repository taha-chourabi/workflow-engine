import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMessageSquare, FiUsers, FiSearch, FiFilter, FiMoreVertical, FiCircle, FiSend, FiClock, FiUser, FiActivity, FiTrendingUp, FiBell, FiSettings, FiVideo, FiPhone, FiPaperclip, FiSmile, FiMic } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ChatList = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const currentUserId = user ? String(user.id) : null;

  const getStatusColor = (hasUnread) => {
    return hasUnread ? 'bg-blue-500' : 'bg-gray-300';
  };

  const getChatTypeIcon = (chat) => {
    if (chat.isGroup) return <FiUsers className="w-4 h-4" />;
    return <FiUser className="w-4 h-4" />;
  };

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const res = await api.get('/chats');
        setChats(res.data);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des conversations');
        console.error('Error fetching chats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChats();
  }, []);

  const getParticipants = (chat) => chat.Users || chat.participants || [];

  const getRecipientName = (chat) => {
    if (chat.isGroup) return chat.name;
    const recipient = getParticipants(chat).find(p => String(p.id) !== currentUserId);
    if (recipient?.fullName) return recipient.fullName;
    const otherMessage = chat.Messages?.find(msg => String(msg.senderId) !== currentUserId);
    return otherMessage?.User?.fullName || chat.name || 'Conversation privée';
  };

  const filteredAndSortedChats = chats
    .filter(chat => {
      const recipientName = getRecipientName(chat);
      const matchesSearch = recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            getLastMessage(chat).toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || 
                          (filterType === 'groups' && chat.isGroup) ||
                          (filterType === 'private' && !chat.isGroup);
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        const dateA = new Date(a.Messages?.[0]?.createdAt || 0);
        const dateB = new Date(b.Messages?.[0]?.createdAt || 0);
        return dateB - dateA;
      }
      if (sortBy === 'name') {
        return getRecipientName(a).localeCompare(getRecipientName(b));
      }
      return 0;
    });

  const totalUnread = chats.reduce((count, chat) => {
    return count + (chat.unreadCount || 0);
  }, 0);

  const getAvatarColor = (name) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getLastMessage = (chat) => {
    if (!chat.Messages || chat.Messages.length === 0) return 'Aucun message';
    return chat.Messages[0].content;
  };

  const isOnline = (chat) => {
    // Simulate online status - in real app, this would come from WebSocket or API
    return Math.random() > 0.5;
  };

  const getLastMessageTime = (chat) => {
    if (!chat.Messages || chat.Messages.length === 0) return '';
    const date = new Date(chat.Messages[0].createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="ui-page">
        <div className="space-y-2">
          <div className="ui-skeleton h-4 w-24"></div>
          <div className="ui-skeleton h-8 w-56"></div>
        </div>
        <div className="ui-card divide-y divide-slate-100 dark:divide-slate-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="ui-skeleton h-12 w-12 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="ui-skeleton h-4 w-1/3"></div>
                <div className="ui-skeleton h-3 w-2/3"></div>
              </div>
              <div className="ui-skeleton h-3 w-12"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ui-page">
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          <FiMessageSquare className="h-5 w-5" />
          {error}
        </div>
      </div>
    );
  }

  const filterTabs = [
    { value: 'all', label: 'Tous' },
    { value: 'private', label: 'Privées' },
    { value: 'groups', label: 'Groupes' },
  ];

  return (
    <div className="ui-page">
      {/* Header */}
      <div className="ui-page-header">
        <div>
          <span className="ui-eyebrow">
            <FiMessageSquare /> Messagerie
          </span>
          <h1 className="ui-title">Messages</h1>
        </div>
        <div className="ui-toolbar">
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="ui-input ui-input-icon w-60"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="ui-select"
          >
            <option value="recent">Récents</option>
            <option value="name">Nom</option>
          </select>
        </div>
      </div>

      <div className="ui-card overflow-hidden">
        {/* Filter tabs */}
        <div className="flex items-center gap-1 border-b border-slate-100 px-4 pt-3 dark:border-slate-800">
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterType(tab.value)}
              className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                filterType === tab.value
                  ? 'text-brand-600 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {tab.label}
              {filterType === tab.value && (
                <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-600 dark:bg-brand-400" />
              )}
            </button>
          ))}
        </div>

        {filteredAndSortedChats.length === 0 ? (
          <div className="ui-empty">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-800 text-white shadow-glow">
              <FiMessageSquare className="h-7 w-7" />
            </div>
            <h3 className="ui-empty-title">
              {chats.length === 0 ? 'Aucune conversation' : 'Aucun résultat'}
            </h3>
            <p className="ui-empty-text">
              {chats.length === 0
                ? 'Commencez une nouvelle conversation pour voir apparaître vos discussions ici.'
                : 'Essayez de modifier vos filtres de recherche.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredAndSortedChats.map((chat, index) => {
              const recipientName = getRecipientName(chat);
              const hasUnread = (chat.unreadCount || 0) > 0;

              return (
                <Link
                  key={chat.id}
                  to={`/chats/${chat.id}`}
                  className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50 animate-fade-up dark:hover:bg-slate-800/40"
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="relative">
                    <div
                      className="ui-avatar h-12 w-12 text-base shadow-sm"
                      style={{ backgroundColor: getAvatarColor(recipientName) }}
                    >
                      {recipientName.charAt(0).toUpperCase()}
                    </div>
                    {chat.isGroup && (
                      <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900">
                        <FiUsers className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className={`truncate text-sm ${hasUnread ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-100'}`}>
                        {recipientName}
                      </h3>
                      {chat.isGroup && <span className="ui-badge ui-badge-brand">Groupe</span>}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-slate-400">
                      {getChatTypeIcon(chat)}
                      <p className={`truncate text-sm ${hasUnread ? 'font-medium text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                        {getLastMessage(chat)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-shrink-0 flex-col items-end gap-1.5">
                    <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                      <FiClock className="h-3 w-3" />
                      {getLastMessageTime(chat)}
                    </span>
                    {hasUnread && (
                      <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatList;
