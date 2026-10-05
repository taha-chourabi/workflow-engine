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
    
    // Chercher d'abord dans les participants du chat
    const recipient = getParticipants().find(p => String(p.id) !== currentUserId);
    if (recipient?.fullName) return recipient.fullName;
    
    // Chercher dans les messages envoyés par l'autre personne
    const otherMessage = messages.find(msg => String(msg.senderId) !== currentUserId);
    if (otherMessage?.User?.fullName) return otherMessage.User.fullName;
    
    // Utiliser le nom du chat si disponible
    if (chatInfo?.name && chatInfo.name !== 'Conversation privée') return chatInfo.name;
    
    // Extraire le nom de l'email si disponible
    if (recipient?.email) {
      const emailName = recipient.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    if (otherMessage?.User?.email) {
      const emailName = otherMessage.User.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    
    // Dernier recours - utiliser un ID générique
    return 'Utilisateur';
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
      <div className="ui-card mx-auto flex h-[calc(100vh-8rem)] w-full max-w-5xl flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-100 p-4 dark:border-slate-800">
          <div className="ui-skeleton h-10 w-10 rounded-full"></div>
          <div className="space-y-2">
            <div className="ui-skeleton h-4 w-40"></div>
            <div className="ui-skeleton h-3 w-24"></div>
          </div>
        </div>
        <div className="flex-1 space-y-3 p-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`ui-skeleton h-11 rounded-2xl ${i % 2 === 0 ? 'ml-auto w-1/2' : 'w-2/3'}`}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="ui-card mx-auto flex h-[calc(100vh-8rem)] w-full max-w-5xl flex-col overflow-hidden animate-fade-up">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex min-w-0 items-center gap-3">
          <button
            onClick={() => navigate('/chats')}
            className="ui-icon-btn"
            title="Retour"
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="relative">
            <div
              className="ui-avatar h-10 w-10 text-sm"
              style={{ backgroundColor: getAvatarColor(getRecipientName()) }}
            >
              {getRecipientName().charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {getRecipientName()}
            </h2>
            {getRecipientEmail() ? (
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {getRecipientEmail()}
              </p>
            ) : chatInfo?.isGroup ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Groupe · {getParticipants().length} membre(s)
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="ui-icon-btn" title="Appel">
            <FiPhone size={17} />
          </button>
          <button className="ui-icon-btn" title="Visio">
            <FiVideo size={17} />
          </button>
          <span className="mx-1 h-5 w-px bg-slate-200 dark:bg-slate-700" />
          <button onClick={deleteChat} className="ui-icon-btn hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10 dark:hover:text-rose-300" title="Supprimer la conversation">
            <FiTrash2 size={17} />
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Messages Container */}
      <div
        className="flex-1 space-y-1 overflow-y-auto bg-slate-50/70 px-4 py-5 dark:bg-slate-950/40 sm:px-6"
        style={{ backgroundImage: 'radial-gradient(var(--app-grid) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div
                className="ui-avatar mx-auto mb-4 h-16 w-16 text-2xl shadow-lifted"
                style={{ backgroundColor: getAvatarColor(getRecipientName()) }}
              >
                {getRecipientName().charAt(0).toUpperCase()}
              </div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                {getRecipientName()}
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                C'est le début de votre conversation
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isCurrentUser = currentUserId && String(msg.senderId) === currentUserId;
            const showAvatar = !isCurrentUser && (index === 0 || String(messages[index - 1]?.senderId) !== String(msg.senderId));

            return (
              <div key={msg.id} className={`group flex ${showAvatar || isCurrentUser ? 'pt-2' : ''} ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`flex max-w-[80%] gap-2 lg:max-w-md ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  {!isCurrentUser && (
                    <div className="flex items-end">
                      {showAvatar ? (
                        <div
                          className="ui-avatar h-8 w-8 text-xs"
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
                    {showAvatar && chatInfo?.isGroup && msg.User?.fullName && (
                      <span className="mb-1 ml-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{msg.User.fullName}</span>
                    )}
                    <div className={`flex items-center gap-1.5 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                      <div
                        className={`break-words px-4 py-2.5 shadow-sm ${
                          isCurrentUser
                            ? 'rounded-2xl rounded-br-md bg-stone-900 text-white'
                            : 'rounded-2xl rounded-bl-md border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      {isCurrentUser && (
                        <button
                          onClick={() => deleteMessage(msg.id)}
                          className="rounded-lg p-1 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-600 group-hover:opacity-100 dark:hover:bg-rose-500/10"
                          aria-label="Supprimer le message"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      )}
                    </div>
                    <span className={`mt-1 text-[11px] text-slate-400 ${isCurrentUser ? 'mr-1' : 'ml-1'}`}>
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
      <form onSubmit={sendMessage} className="border-t border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-500/10 dark:border-slate-700 dark:bg-slate-800">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 border-0 !bg-transparent px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="ui-btn ui-btn-primary h-10 w-10 rounded-xl px-0"
            title="Envoyer"
          >
            <FiSend size={17} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWindow;
