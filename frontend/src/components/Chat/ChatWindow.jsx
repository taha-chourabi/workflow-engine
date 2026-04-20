import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import api from '../services/api';

const ChatWindow = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
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

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`h-12 bg-gray-200 rounded ${i % 2 === 0 ? 'ml-20' : 'mr-20'}`}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b bg-white">
        <button
          onClick={() => navigate('/chats')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">
            {chatInfo?.isGroup ? chatInfo.name : 
             chatInfo?.participants?.find(p => p.id !== JSON.parse(localStorage.getItem('user'))?.id)?.User?.fullName || 'Conversation Privée'}
          </h1>
          {!chatInfo?.isGroup && (
            <p className="text-sm text-gray-500">
              {chatInfo?.participants?.find(p => p.id !== JSON.parse(localStorage.getItem('user'))?.id)?.User?.email}
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-2">Aucun message dans cette conversation</div>
            <div className="text-gray-500 text-sm">Soyez le premier à envoyer un message !</div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex mb-3 ${msg.senderId === JSON.parse(localStorage.getItem('user'))?.id ? 'justify-end' : 'justify-start'}`}
            >
              {msg.senderId !== JSON.parse(localStorage.getItem('user'))?.id && (
                <div className="flex items-end mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {msg.User?.fullName?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">
                      {msg.User?.fullName || 'Utilisateur inconnu'}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex flex-col max-w-xs lg:max-w-md">
                <div
                  className={`relative px-4 py-3 rounded-2xl shadow-md ${
                    msg.senderId === JSON.parse(localStorage.getItem('user'))?.id
                      ? 'bg-blue-600 text-white rounded-br-lg rounded-bl-lg'
                      : 'bg-gray-100 text-gray-900 rounded-bl-lg rounded-br-lg'
                  }`}
                >
                  <div className="break-words text-sm leading-relaxed">{msg.content}</div>
                </div>
                <div className={`text-xs text-gray-400 mt-2 px-2 ${
                  msg.senderId === JSON.parse(localStorage.getItem('user'))?.id
                    ? 'text-right mr-2'
                    : 'text-left ml-2'
                }`}>
                  {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tapez votre message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <FiSend size={16} />
          {sending ? 'Envoi...' : 'Envoyer'}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;