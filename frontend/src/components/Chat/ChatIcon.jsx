import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiX, FiUserPlus, FiUsers, FiMessageCircle, FiSearch, FiSettings, FiBell, FiSend, FiClock, FiMoreVertical, FiVideo, FiPhone, FiPaperclip, FiSmile, FiMic, FiActivity, FiTrendingUp, FiFilter } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import UserSelection from './UserSelection';
import FriendRequests from './FriendRequests';
import GroupChat from './GroupChat';

const ChatIcon = () => {
  const { user } = useAuth();
  const currentUserId = user ? String(user.id) : null;
  const [isOpen, setIsOpen] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  const getAvatarColor = (name) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const isOnline = () => {
    // Simulate online status
    return Math.random() > 0.3;
  };

  const getUnreadCount = () => {
    return chats.reduce((count, chat) => count + (chat.unreadCount || 0), 0);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getParticipants = (chat) => chat.Users || chat.participants || [];

  const getChatLabel = (chat) => {
    if (chat.isGroup) return chat.name;
    const recipient = getParticipants(chat).find(p => String(p.id) !== currentUserId);
    if (recipient?.fullName) return recipient.fullName;
    const lastMessage = chat.Messages?.[0];
    if (lastMessage?.User?.fullName) return lastMessage.User.fullName;
    if (recipient?.email) {
      const emailName = recipient.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return chat.name || 'Utilisateur';
  };

  const filteredChats = chats.filter(chat => {
    const label = getChatLabel(chat);
    const lastMessage = chat.Messages?.[0]?.content || '';
    return label.toLowerCase().includes(searchTerm.toLowerCase()) ||
           lastMessage.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const fetchChats = async () => {
    if (chats.length > 0) return; // Don't refetch if we already have data
    
    setLoading(true);
    try {
      const res = await api.get('/chats');
      setChats(res.data);
      setError(null);
    } catch (err) {
      setError('Erreur lors du chargement');
      console.error('Error fetching chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && chats.length === 0) {
      fetchChats();
    }
  };

  return (
    <>
      {/* Main Chat Icon */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={toggleDropdown}
          className="relative p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-sm hover:shadow-md"
          title="Chat"
        >
          <FiMessageSquare size={22} />
          {getUnreadCount() > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
              {getUnreadCount()}
            </span>
          )}
          {isOnline() && (
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-3 w-96 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-100 z-50 animate-fadeIn overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <FiMessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Messages</h3>
                    <p className="text-blue-100 text-sm">{chats.length} conversation(s)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <FiX size={18} />
                </button>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-200 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white/20 border border-white/30 rounded-lg placeholder-blue-200 text-white focus:outline-none focus:bg-white/30 transition-all"
                />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto bg-gray-50">
              {loading ? (
                <div className="p-4">
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="bg-white rounded-xl p-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="flex-1">
                            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                            <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                    {error}
                  </div>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
                    <FiMessageSquare className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {searchTerm ? 'Aucun résultat' : 'Aucune conversation'}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {searchTerm ? 'Essayez une autre recherche' : 'Commencez une nouvelle conversation'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredChats.map((chat, index) => {
                    const label = getChatLabel(chat);
                    const lastMessage = chat.Messages?.[0];
                    const hasUnread = (chat.unreadCount || 0) > 0;
                    
                    return (
                      <a
                        key={chat.id}
                        href={`/chats/${chat.id}`}
                        className="block p-3 hover:bg-white transition-all duration-200 animate-fadeIn"
                        style={{ animationDelay: `${index * 50}ms` }}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex-shrink-0">
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                              style={{ backgroundColor: getAvatarColor(label) }}
                            >
                              {label.charAt(0).toUpperCase()}
                            </div>
                            {hasUnread && (
                              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{chat.unreadCount}</span>
                              </div>
                            )}
                            {chat.isGroup && (
                              <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                                <FiUsers className="w-2 h-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className={`font-semibold text-gray-900 truncate ${hasUnread ? 'text-blue-600' : ''}`}>
                                {label}
                              </p>
                              {lastMessage && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <FiClock className="w-3 h-3" />
                                  {new Date(lastMessage.createdAt).toLocaleDateString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </div>
                            {lastMessage && (
                              <p className="text-sm text-gray-600 truncate">
                                {lastMessage.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 bg-white border-t border-gray-100 space-y-3">
              <button
                onClick={() => {
                  setShowUserSelection(true);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 font-semibold shadow-lg"
              >
                <FiSend className="w-4 h-4" />
                Nouveau message
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setShowFriendRequests(true);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 font-medium shadow"
                >
                  <FiUserPlus className="w-4 h-4" />
                  Amis
                </button>
                <button
                  onClick={() => {
                    setShowGroupChat(true);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 font-medium shadow"
                >
                  <FiUsers className="w-4 h-4" />
                  Groupe
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* User Selection Modal */}
      {showUserSelection && (
        <UserSelection
          onClose={() => setShowUserSelection(false)}
          mode="message"
        />
      )}

      {/* Friend Requests Modal */}
      {showFriendRequests && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <FriendRequests onClose={() => setShowFriendRequests(false)} />
        </div>
      )}

      {/* Group Chat Modal */}
      {showGroupChat && (
        <GroupChat onClose={() => setShowGroupChat(false)} />
      )}
    </>
  );
};

export default ChatIcon;
