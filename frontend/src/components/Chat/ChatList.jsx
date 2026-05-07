import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMessageSquare, FiUsers } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ChatList = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const currentUserId = user ? String(user.id) : null;

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

  const getAvatarColor = (name) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getLastMessage = (chat) => {
    if (!chat.Messages || chat.Messages.length === 0) return 'Aucun message';
    return chat.Messages[0].content;
  };

  const getLastMessageTime = (chat) => {
    if (!chat.Messages || chat.Messages.length === 0) return '';
    const date = new Date(chat.Messages[0].createdAt);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('fr-FR', { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FiMessageSquare className="text-blue-600" />
          Mes conversations
        </h1>
        <p className="text-gray-600 mt-1">
          {chats.length === 0 ? 'Aucune conversation' : `${chats.length} conversation(s)`}
        </p>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <FiMessageSquare className="mx-auto text-gray-400 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Aucune conversation</h3>
          <p className="text-gray-500">Commencez une nouvelle conversation pour voir apparaître vos discussions ici.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => {
            const recipientName = getRecipientName(chat);
            return (
              <Link
                key={chat.id}
                to={`/chats/${chat.id}`}
                className="block bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                      style={{ backgroundColor: getAvatarColor(recipientName) }}
                    >
                      {recipientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {recipientName}
                      </h3>
                      <p className="text-sm text-gray-600 truncate max-w-md">
                        {getLastMessage(chat)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                      {getLastMessageTime(chat)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChatList;