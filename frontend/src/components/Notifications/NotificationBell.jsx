import React, { useState, useEffect } from 'react';
import { FiBell, FiCheck, FiX, FiLoader } from 'react-icons/fi';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService';
import api from '../services/api';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error) {}
  };

  const handleMarkAsRead = async (id) => {
    await markAsRead(id);
    loadNotifications();
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
    loadNotifications();
  };

  const handleFriendRequestAction = async (notificationId, action) => {
    if (!notificationId) return;
    
    setProcessing(prev => ({ ...prev, [notificationId]: action }));
    try {
      const friendshipId = notifications.find(n => n.id === notificationId)?.relatedId;
      if (!friendshipId) return;

      if (action === 'accept') {
        await api.put(`/friendship/requests/${friendshipId}/accept`);
      } else if (action === 'decline') {
        await api.put(`/friendship/requests/${friendshipId}/decline`);
      }
      
      // Mark notification as read and refresh
      await handleMarkAsRead(notificationId);
    } catch (error) {
      alert('Erreur lors du traitement de la demande d\'ami');
    } finally {
      setProcessing(prev => ({ ...prev, [notificationId]: null }));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative rounded-full border border-white/20 bg-white/10 p-3 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <FiBell size={22} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 text-[0.65rem] font-bold text-white px-1.5">
            {unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-3 w-96 max-w-md rounded-[1.25rem] bg-slate-50 border border-slate-200 shadow-2xl shadow-slate-900/10 z-50 overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-slate-900 to-blue-900 text-white">
            <div>
              <p className="font-semibold text-sm uppercase tracking-[0.2em]">Notifications</p>
              <p className="text-xs text-slate-200">{unreadCount} non lue(s)</p>
            </div>
            <button
              onClick={handleMarkAllAsRead}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 hover:bg-white/20 transition"
            >
              Tout marquer lu
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-500">Aucune notification</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 px-5 py-4 border-b last:border-b-0 transition ${!notif.read ? 'bg-blue-50' : 'bg-white hover:bg-slate-100'}`}
                >
                  <div className={`mt-1 h-3.5 w-3.5 rounded-full ${!notif.read ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
                  <div className="flex-1" onClick={() => notif.type !== 'FRIEND_REQUEST' && handleMarkAsRead(notif.id)}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-900">{notif.title}</p>
                      <span className="text-[0.7rem] uppercase tracking-[0.2em] text-slate-500">{new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{notif.message}</p>
                    <p className="mt-2 text-xs text-slate-400">{new Date(notif.createdAt).toLocaleDateString()}</p>
                  </div>

                  {notif.type === 'FRIEND_REQUEST' && (
                    <div className="flex flex-col items-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendRequestAction(notif.id, 'accept');
                        }}
                        disabled={processing[notif.id]}
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-[0.7rem] font-semibold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                      >
                        {processing[notif.id] === 'accept' ? <FiLoader className="animate-spin" size={12} /> : <FiCheck size={12} />}
                        Accepter
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendRequestAction(notif.id, 'decline');
                        }}
                        disabled={processing[notif.id]}
                        className="inline-flex items-center gap-1 rounded-full bg-red-600 px-3 py-1.5 text-[0.7rem] font-semibold text-white transition hover:bg-red-700 disabled:bg-slate-300"
                      >
                        {processing[notif.id] === 'decline' ? <FiLoader className="animate-spin" size={12} /> : <FiX size={12} />}
                        Refuser
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;