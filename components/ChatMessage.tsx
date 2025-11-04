
import React from 'react';
import { ChatMessage as ChatMessageType } from '../types';

interface ChatMessageProps {
  message: ChatMessageType;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';
  const messageClasses = isUser
    ? 'bg-blue-100 text-blue-900 self-end rounded-br-none'
    : 'bg-green-50 text-green-900 self-start rounded-bl-none';

  return (
    <div className={`flex flex-col mb-4 max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`p-3 rounded-lg shadow-md ${messageClasses}`}>
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
      <span className={`text-xs text-gray-500 mt-1 ${isUser ? 'mr-1' : 'ml-1'}`}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
};

export default ChatMessage;
