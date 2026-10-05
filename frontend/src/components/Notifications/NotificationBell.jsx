import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiX, FiLoader, FiSettings, FiTrash2, FiArchive, FiFilter } from 'react-icons/fi';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification } from '../services/notificationService';
import api from '../services/api';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [processing, setProcessing] = useState({});
  const [filter, setFilter] = useState('all'); // all, unread, requests, system
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 15000); // More frequent refresh
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      setNotifications(prev => 
        prev.map(notif => notif.id === id ? { ...notif, read: true } : notif)
      );
      toast.success('Notification marquée comme lue');
    } catch (error) {
      toast.error('Erreur lors du marquage comme lu');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      toast.success('Toutes les notifications marquées comme lues');
    } catch (error) {
      toast.error('Erreur lors du marquage de toutes comme lues');
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(notif => notif.id !== id));
      toast.success('Notification supprimée');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleFriendRequestAction = async (notificationId, action) => {
    if (!notificationId) return;
    
    setProcessing(prev => ({ ...prev, [notificationId]: action }));
    try {
      const friendshipId = notifications.find(n => n.id === notificationId)?.relatedId;
      if (!friendshipId) return;

      if (action === 'accept') {
        await api.put(`/friendship/requests/${friendshipId}/accept`);
        toast.success('Demande d\'ami acceptée');
      } else if (action === 'decline') {
        await api.put(`/friendship/requests/${friendshipId}/decline`);
        toast.success('Demande d\'ami refusée');
      }
      
      // Mark notification as read and refresh
      await handleMarkAsRead(notificationId);
    } catch (error) {
      toast.error('Erreur lors du traitement de la demande d\'ami');
    } finally {
      setProcessing(prev => ({ ...prev, [notificationId]: null }));
    }
  };

  const filteredNotifications = notifications.filter(notif => {
    const matchesSearch = notif.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notif.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;
    
    switch (filter) {
      case 'unread':
        return !notif.read;
      case 'requests':
        return notif.type === 'FRIEND_REQUEST';
      case 'system':
        return notif.type !== 'FRIEND_REQUEST';
      default:
        return true;
    }
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'FRIEND_REQUEST':
        return <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">FR</div>;
      case 'REQUEST_APPROVED':
        return <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white">✓</div>;
      case 'REQUEST_REJECTED':
        return <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center text-white">✗</div>;
      case 'REQUEST_ASSIGNED':
        return <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-600 rounded-full flex items-center justify-center text-white">→</div>;
      default:
        return <div className="w-8 h-8 bg-gradient-to-br from-gray-500 to-slate-600 rounded-full flex items-center justify-center text-white">!</div>;
    }
  };

  const getNotificationColor = (type, read) => {
    if (read) return 'bg-gray-50 hover:bg-gray-100';
    
    switch (type) {
      case 'FRIEND_REQUEST':
        return 'bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500';
      case 'REQUEST_APPROVED':
        return 'bg-green-50 hover:bg-green-100 border-l-4 border-l-green-500';
      case 'REQUEST_REJECTED':
        return 'bg-red-50 hover:bg-red-100 border-l-4 border-l-red-500';
      case 'REQUEST_ASSIGNED':
        return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-l-orange-500';
      default:
        return 'bg-gray-50 hover:bg-gray-100';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="ui-icon-btn relative"
        title="Notifications"
      >
        <FiBell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.6rem] font-bold text-white ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-3 w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-900/15 z-50 overflow-hidden animate-scale-in dark:border-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-stone-900 text-white">
            <div>
              <p className="font-bold text-sm uppercase tracking-[0.1em]">Notifications</p>
              <p className="text-xs text-blue-100">
                {unreadCount} non lue{unreadCount !== 1 ? 's' : ''} • {notifications.length} totale
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/30 hover:bg-white/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Tout lire
              </button>
              <button className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20 transition">
                <FiSettings size={14} />
              </button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Rechercher une notification..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <FiFilter className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400" size={14} />
              </div>
            </div>
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'Toutes', count: notifications.length },
                { value: 'unread', label: 'Non lues', count: unreadCount },
                { value: 'requests', label: 'Demandes', count: notifications.filter(n => n.type === 'FRIEND_REQUEST').length },
                { value: 'system', label: 'Système', count: notifications.filter(n => n.type !== 'FRIEND_REQUEST').length }
              ].map(({ value, label, count }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    filter === value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FiBell className="text-gray-400" size={24} />
                </div>
                <p className="text-gray-500 font-medium">
                  {searchTerm ? 'Aucune notification trouvée' : 'Aucune notification'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {filter !== 'all' && 'Essayez de changer le filtre'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`group relative ${getNotificationColor(notif.type, notif.read)} transition-all duration-200`}
                >
                  <div className="flex items-start gap-4 p-4">
                    {/* Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notif.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-gray-900 ${!notif.read ? 'text-blue-900' : ''}`}>
                            {notif.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                            {notif.message}
                          </p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {!notif.read && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Nouveau
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkAsRead(notif.id)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                              title="Marquer comme lu"
                            >
                              <FiCheck size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteNotification(notif.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Supprimer"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>

                      {/* Friend Request Actions */}
                      {notif.type === 'FRIEND_REQUEST' && (
                        <div className="flex items-center gap-2 mt-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFriendRequestAction(notif.id, 'accept');
                            }}
                            disabled={processing[notif.id]}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {processing[notif.id] === 'accept' ? (
                              <FiLoader className="animate-spin" size={12} />
                            ) : (
                              <FiCheck size={12} />
                            )}
                            Accepter
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleFriendRequestAction(notif.id, 'decline');
                            }}
                            disabled={processing[notif.id]}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {processing[notif.id] === 'decline' ? (
                              <FiLoader className="animate-spin" size={12} />
                            ) : (
                              <FiX size={12} />
                            )}
                            Refuser
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-center">
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                Voir toutes les notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;