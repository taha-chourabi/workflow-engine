import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

const ChatList = () => {
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get('/chats').then((res) => setChats(res.data));
  }, []);

  return (
    <div>
      <h2>Mes conversations</h2>
      {chats.map((chat) => (
        <Link key={chat.id} to={`/chats/${chat.id}`}>
          <div>{chat.isGroup ? chat.name : 'Conversation privée'}</div>
        </Link>
      ))}
    </div>
  );
};

export default ChatList;