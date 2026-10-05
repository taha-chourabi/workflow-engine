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
          className="ui-icon-btn relative"
          title="Messages"
        >
          <FiMessageSquare size={18} />
          {getUnreadCount() > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white ring-2 ring-white dark:ring-slate-900">
              {getUnreadCount()}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 z-50 mt-3 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15 animate-scale-in dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="border-b border-slate-100 p-4 dark:border-slate-800">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="ui-icon-tile ui-tile-brand">
                    <FiMessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">Messages</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{chats.length} conversation(s)</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="ui-icon-btn"
                >
                  <FiX size={18} />
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Rechercher une conversation..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="ui-input ui-input-icon"
                />
              </div>
            </div>

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="ui-skeleton h-10 w-10 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="ui-skeleton h-3.5 w-1/3"></div>
                        <div className="ui-skeleton h-3 w-2/3"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                    {error}
                  </div>
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="ui-empty py-10">
                  <div className="ui-empty-icon">
                    <FiMessageSquare className="h-6 w-6" />
                  </div>
                  <h4 className="ui-empty-title">
                    {searchTerm ? 'Aucun résultat' : 'Aucune conversation'}
                  </h4>
                  <p className="ui-empty-text">
                    {searchTerm ? 'Essayez une autre recherche' : 'Commencez une nouvelle conversation'}
                  </p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredChats.map((chat, index) => {
                    const label = getChatLabel(chat);
                    const lastMessage = chat.Messages?.[0];
                    const hasUnread = (chat.unreadCount || 0) > 0;

                    return (
                      <a
                        key={chat.id}
                        href={`/chats/${chat.id}`}
                        className="block rounded-xl p-2.5 transition-colors hover:bg-slate-50 animate-fade-up dark:hover:bg-slate-800/60"
                        style={{ animationDelay: `${index * 40}ms` }}
                        onClick={() => setIsOpen(false)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <div
                              className="ui-avatar h-10 w-10 text-sm"
                              style={{ backgroundColor: getAvatarColor(label) }}
                            >
                              {label.charAt(0).toUpperCase()}
                            </div>
                            {hasUnread && (
                              <div className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 ring-2 ring-white dark:ring-slate-900">
                                <span className="text-[0.6rem] font-bold text-white">{chat.unreadCount}</span>
                              </div>
                            )}
                            {chat.isGroup && (
                              <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900">
                                <FiUsers className="h-2 w-2 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`truncate text-sm font-semibold ${hasUnread ? 'text-brand-600 dark:text-brand-300' : 'text-slate-900 dark:text-white'}`}>
                                {label}
                              </p>
                              {lastMessage && (
                                <span className="flex flex-shrink-0 items-center gap-1 text-[11px] text-slate-400">
                                  <FiClock className="h-3 w-3" />
                                  {new Date(lastMessage.createdAt).toLocaleDateString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </div>
                            {lastMessage && (
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
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
            <div className="space-y-2 border-t border-slate-100 p-3 dark:border-slate-800">
              <button
                onClick={() => {
                  setShowUserSelection(true);
                  setIsOpen(false);
                }}
                className="ui-btn ui-btn-primary w-full"
              >
                <FiSend className="h-4 w-4" />
                Nouveau message
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowFriendRequests(true);
                    setIsOpen(false);
                  }}
                  className="ui-btn ui-btn-secondary"
                >
                  <FiUserPlus className="h-4 w-4" />
                  Amis
                </button>
                <button
                  onClick={() => {
                    setShowGroupChat(true);
                    setIsOpen(false);
                  }}
                  className="ui-btn ui-btn-secondary"
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
        <FriendRequests onClose={() => setShowFriendRequests(false)} />
      )}

      {/* Group Chat Modal */}
      {showGroupChat && (
        <GroupChat onClose={() => setShowGroupChat(false)} />
      )}
    </>
  );
};

export default ChatIcon;
