
import React, { useState, useEffect, useRef } from 'react';
import { createChatSession, sendMessageToChat } from '../services/geminiService';
import { ChatMessage as ChatMessageType } from '../types';
import ChatMessage from './ChatMessage';
import LoadingSpinner from './LoadingSpinner';
import { Chat } from '@google/genai';

interface ChatbotWindowProps {
  onClose: () => void;
  hasApiKey: boolean;
  onSelectApiKey: () => void;
}

const ChatbotWindow: React.FC<ChatbotWindowProps> = ({ onClose, hasApiKey, onSelectApiKey }) => {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat session when chatbot opens or API key becomes available
  useEffect(() => {
    if (hasApiKey && !chatSessionRef.current) {
      try {
        const chat = createChatSession();
        chatSessionRef.current = chat;
        setMessages([
          { id: 'initial-bot', sender: 'bot', text: 'Bonjour! Je suis EcoBot, votre assistant environnemental. Comment puis-je vous aider aujourd\'hui ?', timestamp: new Date() }
        ]);
        setError(null);
      } catch (err: any) {
        console.error("Error initializing chat session:", err);
        setError("Impossible d'initialiser la session de chat. Veuillez réessayer.");
      }
    } else if (!hasApiKey && chatSessionRef.current) {
      // Clear session if API key is no longer available
      chatSessionRef.current = null;
      setMessages([]);
      setError("Veuillez sélectionner une clé API pour utiliser le chatbot.");
    }
  }, [hasApiKey]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputMessage.trim() || loading || !chatSessionRef.current) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      sender: 'user',
      text: inputMessage,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setLoading(true);
    setError(null);

    try {
      let botResponseText = '';
      await sendMessageToChat(chatSessionRef.current, userMessage.text, (chunk) => {
        botResponseText += chunk;
        setMessages((prev) => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage?.sender === 'bot' && lastMessage.id === 'streaming-bot-response') {
            // Update the existing streaming message
            return prev.map((msg, index) =>
              index === prev.length - 1 ? { ...msg, text: botResponseText } : msg
            );
          } else {
            // Add a new message for streaming
            return [...prev, { id: 'streaming-bot-response', sender: 'bot', text: botResponseText, timestamp: new Date() }];
          }
        });
      });

      // After streaming is complete, ensure the final message has a unique ID and correct text
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === 'streaming-bot-response' ? { ...msg, id: Date.now().toString(), text: botResponseText } : msg
        )
      );

    } catch (err: any) {
      console.error("Error sending message to chatbot:", err);
      if (String(err).includes("API_KEY_INVALID") || String(err).includes("Requested entity was not found.")) {
        setError("Votre clé API est invalide ou a expiré. Veuillez en sélectionner une nouvelle.");
        // Prompt for API key selection
        onSelectApiKey();
      } else {
        setError("Désolé, une erreur est survenue lors de la communication avec EcoBot. Veuillez réessayer.");
      }
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString() + '-error', sender: 'bot', text: "Désolé, je n'ai pas pu traiter votre demande. " + (err.message || "Erreur inconnue."), timestamp: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-full max-w-sm bg-white rounded-lg shadow-xl flex flex-col z-40 h-[60vh] max-h-[600px] border border-gray-200">
      <div className="flex justify-between items-center bg-green-600 text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">EcoBot</h2>
        <button
          onClick={onClose}
          className="text-white hover:text-green-200 focus:outline-none focus:ring-2 focus:ring-green-400 rounded-full p-1"
          aria-label="Fermer le chatbot"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {!hasApiKey ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-center">
            <p className="mb-4">Veuillez sélectionner votre clé API Google Gemini pour discuter avec EcoBot.</p>
            <button
              onClick={onSelectApiKey}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              Sélectionner la clé API
            </button>
            <p className="mt-2 text-sm text-gray-600">
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                Informations sur la facturation
              </a>
            </p>
          </div>
        ) : error && !loading ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md text-center">
              <p>{error}</p>
            </div>
        ) : (
          messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
        )}
        {loading && <LoadingSpinner />}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 mr-2"
            disabled={loading || !hasApiKey || !chatSessionRef.current}
            aria-label="Champ de saisie du message du chatbot"
          />
          <button
            type="submit"
            className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading || !inputMessage.trim() || !hasApiKey || !chatSessionRef.current}
            aria-label="Envoyer le message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatbotWindow;
