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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl w-1/3 mb-8"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-sm">
            <div className="flex items-center gap-3">
              <FiMessageSquare className="w-5 h-5" />
              {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="container mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-3">
                <FiMessageSquare className="text-blue-600" />
                Messages
              </h1>
              <p className="text-gray-600 mt-1">
                {chats.length === 0 ? 'Aucune conversation' : `${chats.length} conversation(s)`}
                {totalUnread > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    • {totalUnread} non lu(s)
                  </span>
                )}
              </p>
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
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="all">Tous</option>
                <option value="private">Privées</option>
                <option value="groups">Groupes</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              >
                <option value="recent">Récents</option>
                <option value="name">Nom</option>
              </select>
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                <FiSettings className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8">
        {filteredAndSortedChats.length === 0 ? (
          <div className="text-center py-16">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6">
                <FiMessageSquare className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {chats.length === 0 ? 'Aucune conversation' : 'Aucun résultat'}
              </h3>
              <p className="text-gray-600 mb-6">
                {chats.length === 0 
                  ? 'Commencez une nouvelle conversation pour voir apparaître vos discussions ici.'
                  : 'Essayez de modifier vos filtres de recherche.'}
              </p>
              <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto">
                <FiSend className="w-4 h-4" />
                Nouvelle conversation
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredAndSortedChats.map((chat, index) => {
              const recipientName = getRecipientName(chat);
              const hasUnread = (chat.unreadCount || 0) > 0;
              const online = isOnline(chat);
              
              return (
                <Link
                  key={chat.id}
                  to={`/chats/${chat.id}`}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 animate-fadeIn overflow-hidden"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative">
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-lg"
                            style={{ backgroundColor: getAvatarColor(recipientName) }}
                          >
                            {recipientName.charAt(0).toUpperCase()}
                          </div>
                          {online && !chat.isGroup && (
                            <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                          )}
                          {chat.isGroup && (
                            <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                              <FiUsers className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-900 truncate">
                              {recipientName}
                            </h3>
                            {hasUnread && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                                {chat.unreadCount}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getChatTypeIcon(chat)}
                            <p className="text-sm text-gray-600 truncate max-w-md">
                              {getLastMessage(chat)}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <div className="flex items-center gap-1 text-xs text-gray-500 font-medium mb-1">
                          <FiClock className="w-3 h-3" />
                          {getLastMessageTime(chat)}
                        </div>
                        <button className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                          <FiMoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
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