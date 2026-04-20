import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiX, FiUserPlus, FiUsers, FiMessageCircle } from 'react-icons/fi';
import api from '../services/api';
import UserSelection from './UserSelection';
import FriendRequests from './FriendRequests';
import GroupChat from './GroupChat';

const ChatIcon = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showUserSelection, setShowUserSelection] = useState(false);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          className="relative p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
          title="Chat"
        >
          <FiMessageSquare size={20} />
          {chats.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {chats.length}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Messages</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-pulse space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                </div>
              ) : error ? (
                <div className="p-4 text-center text-red-600">
                  {error}
                </div>
              ) : chats.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <FiMessageSquare className="mx-auto mb-2 text-gray-400" size={32} />
                  <p>Aucune conversation</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {chats.map((chat) => (
                    <a
                      key={chat.id}
                      href={`/chats/${chat.id}`}
                      className="block p-3 hover:bg-gray-50 transition-colors"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full flex-shrink-0 ${chat.isGroup ? 'bg-blue-100' : 'bg-green-100'}`}>
                          <div className={`w-4 h-4 rounded-full ${chat.isGroup ? 'bg-blue-600' : 'bg-green-600'}`}></div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-gray-900 truncate">
                              {chat.isGroup ? chat.name : 'Conversation privée'}
                            </p>
                            {chat.Messages && chat.Messages[0] && (
                              <span className="text-xs text-gray-500">
                                {new Date(chat.Messages[0].createdAt).toLocaleDateString('fr-FR', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                          </div>
                          {chat.Messages && chat.Messages[0] && (
                            <p className="text-sm text-gray-600 truncate">
                              {chat.Messages[0].content}
                            </p>
                          )}
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-3 border-t border-gray-200 space-y-2">
              <button
                onClick={() => {
                  setShowUserSelection(true);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <FiMessageCircle size={14} />
                Nouveau message
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setShowFriendRequests(true);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-1"
                >
                  <FiUserPlus size={12} />
                  Amis
                </button>
                <button
                  onClick={() => {
                    setShowGroupChat(true);
                    setIsOpen(false);
                  }}
                  className="px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-1"
                >
                  <FiUsers size={12} />
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
