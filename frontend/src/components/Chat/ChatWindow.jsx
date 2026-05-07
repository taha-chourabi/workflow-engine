import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend, FiPhone, FiVideo, FiTrash2 } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const ChatWindow = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchChatInfo = async () => {
      try {
        const res = await api.get(`/chats/${chatId}`);
        setChatInfo(res.data);
      } catch (err) {
        console.error('Error fetching chat info:', err);
      }
    };

    const fetchMessages = async () => {
      try {
        const res = await api.get(`/chats/${chatId}/messages`);
        setMessages(res.data);
        setError(null);
      } catch (err) {
        setError('Erreur lors du chargement des messages');
        console.error('Error fetching messages:', err);
      } finally {
        setLoading(false);
      }
    };

    if (chatId) {
      fetchChatInfo();
      fetchMessages();
    }
  }, [chatId]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/chats/${chatId}/messages`, { content: text });
      setMessages((prev) => [...prev, res.data]);
      setText('');
      setError(null);
    } catch (err) {
      setError('Erreur lors de l\'envoi du message');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (messageId) => {
    if (!window.confirm('Voulez-vous vraiment supprimer ce message ?')) return;

    try {
      await api.delete(`/chats/${chatId}/messages/${messageId}`);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
      setError(null);
    } catch (err) {
      setError('Impossible de supprimer le message');
      console.error('Error deleting message:', err);
    }
  };

  const deleteChat = async () => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette conversation ?')) return;

    try {
      await api.delete(`/chats/${chatId}`);
      navigate('/chats');
    } catch (err) {
      setError('Impossible de supprimer la conversation');
      console.error('Error deleting chat:', err);
    }
  };

  const getParticipants = () => chatInfo?.Users || chatInfo?.participants || [];
  const currentUserId = user ? String(user.id) : null;

  const getRecipientName = () => {
    if (chatInfo?.isGroup) return chatInfo.name;
    const recipient = getParticipants().find(p => String(p.id) !== currentUserId);
    if (recipient?.fullName) return recipient.fullName;
    const otherMessage = messages.find(msg => String(msg.senderId) !== currentUserId);
    if (otherMessage?.User?.fullName) return otherMessage.User.fullName;
    return chatInfo?.name || 'Conversation privée';
  };

  const getRecipientEmail = () => {
    if (chatInfo?.isGroup) return null;
    const recipient = getParticipants().find(p => String(p.id) !== currentUserId);
    return recipient?.email || '';
  };

  const getAvatarColor = (name) => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col bg-white">
        <div className="flex items-center justify-center h-full">
          <div className="animate-pulse space-y-4 w-full max-w-2xl px-6">
            <div className="h-16 bg-gray-200 rounded-lg"></div>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`h-12 bg-gray-200 rounded-lg ${i % 2 === 0 ? 'ml-auto w-2/3' : 'w-2/3'}`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/chats')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft size={20} className="text-gray-600" />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: getAvatarColor(getRecipientName()) }}
            >
              {getRecipientName().charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-lg">
                {getRecipientName()}
              </h2>
              {getRecipientEmail() && (
                <p className="text-xs text-gray-500">
                  {getRecipientEmail()}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={deleteChat} className="p-2 hover:bg-red-50 rounded-lg transition-colors">
            <FiTrash2 size={18} className="text-red-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiPhone size={18} className="text-gray-600" />
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <FiVideo size={18} className="text-gray-600" />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 px-4 py-3">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4"
                style={{ backgroundColor: getAvatarColor(getRecipientName()) }}
              >
                {getRecipientName().charAt(0).toUpperCase()}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {getRecipientName()}
              </h3>
              <p className="text-sm text-gray-500">
                C'est le début de votre conversation
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isCurrentUser = currentUserId && String(msg.senderId) === currentUserId;
            const showAvatar = !isCurrentUser && (index === 0 || String(messages[index - 1]?.senderId) !== String(msg.senderId));

            return (
              <div key={msg.id} className={`flex mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex gap-2 max-w-sm lg:max-w-md ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isCurrentUser && (
                    <div className="flex items-end">
                      {showAvatar ? (
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                          style={{ backgroundColor: getAvatarColor(msg.User?.fullName || 'U') }}
                        >
                          {msg.User?.fullName?.charAt(0).toUpperCase()}
                        </div>
                      ) : (
                        <div className="w-8" />
                      )}
                    </div>
                  )}
                  <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-4 py-2 rounded-2xl break-words ${
                          isCurrentUser
                            ? 'bg-blue-500 text-white rounded-br-none'
                            : 'bg-gray-200 text-gray-900 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      {isCurrentUser && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          aria-label="Supprimer le message"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      )}
                    </div>
                    <span className={`text-xs text-gray-500 mt-1 ${isCurrentUser ? 'mr-1' : 'ml-1'}`}>
                      {formatTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 p-4 border-t border-gray-200 bg-white">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Écrivez votre message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          <FiSend size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;