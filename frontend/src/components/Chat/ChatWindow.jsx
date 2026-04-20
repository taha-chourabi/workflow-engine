import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const ChatWindow = () => {
  const { chatId } = useParams();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  useEffect(() => {
    api.get(`/chats/${chatId}/messages`).then((res) => setMessages(res.data));
  }, [chatId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const res = await api.post(`/chats/${chatId}/messages`, { content: text });
    setMessages((prev) => [...prev, res.data]);
    setText('');
  };

  return (
    <div>
      <div>
        {messages.map((msg) => (  
          <div key={msg.id}>{msg.content}</div>
        ))}
      </div>
      <input value={text} onChange={(e) => setText(e.target.value)} />
      <button onClick={sendMessage}>Envoyer</button>
    </div>
  );
};

export default ChatWindow;