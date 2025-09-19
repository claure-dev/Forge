import React, { useState, useRef, useEffect, useCallback } from 'react';

interface ChatInterfaceProps {
  serverConnected: boolean;
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ serverConnected }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('llama3.1:8b');

  // Debug: Log whenever selectedModel changes
  useEffect(() => {
    console.log(`🔍 Current selectedModel state: "${selectedModel}"`);
  }, [selectedModel]);

  const availableModels = [
    { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
    { id: 'qwen2.5-coder:14b', name: 'Qwen2.5-Coder 14B' },
    { id: 'qwen2.5:14b', name: 'Qwen2.5 14B' },
    { id: 'qwen2.5:7b', name: 'Qwen2.5 7B' },
    { id: 'qwen2.5-coder:1.5b', name: 'Qwen2.5-Coder 1.5B' },
    { id: 'deepseek-r1:14b', name: 'DeepSeek-R1 14B' },
    { id: 'deepseek-r1:8b', name: 'DeepSeek-R1 8B' },
    { id: 'deepseek-coder:6.7b', name: 'DeepSeek-Coder 6.7B' },
    { id: 'mistral:7b-instruct', name: 'Mistral 7B Instruct' },
    { id: 'mistral:7b', name: 'Mistral 7B' },
    { id: 'olmo2:13b', name: 'OLMo2 13B' },
  ];

  // Refs for auto-scroll and focus management
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Effect to scroll when messages or loading state changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Effect to focus textarea when component mounts or loading finishes
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || !serverConnected || isLoading) return;

    console.log(`🎯 React sending - Query: "${input.trim()}", Selected Model: "${selectedModel}"`);

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await window.electronAPI.aiQuery(input.trim(), selectedModel);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.response || 'No response received',
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        isUser: false,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [input, serverConnected, isLoading, selectedModel, setMessages, setInput, setIsLoading]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-transparent to-orange-950/5">
      {/* Header */}
      <div className="p-4 border-b border-orange-800/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-orange-400">🤖</span>
            <h2 className="text-lg font-semibold text-orange-200">AI Assistant</h2>
          </div>
          <select
            value={selectedModel}
            onChange={(e) => {
              console.log(`🔄 Model changed from ${selectedModel} to ${e.target.value}`);
              setSelectedModel(e.target.value);
            }}
            className="bg-gray-800 border border-orange-800/30 text-orange-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-orange-600 transition-colors min-w-0"
            title="Select AI model"
            style={{
              backgroundColor: '#1f2937',
              color: '#fbbf24'
            }}
          >
            {availableModels.map((model) => (
              <option
                key={model.id}
                value={model.id}
                className="bg-gray-800 text-orange-200"
                style={{
                  backgroundColor: '#1f2937',
                  color: '#fbbf24'
                }}
              >
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center mt-8">
            <div className="text-4xl mb-3 text-orange-500/70">🔥</div>
            <p className="text-orange-300/70 text-sm">Ask me anything about your knowledge vault!</p>
            <p className="text-orange-400/50 text-xs mt-2">I can help you search, understand, and explore your notes</p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg transition-all duration-200 ${
                  message.isUser
                    ? 'bg-gradient-to-r from-orange-600 to-orange-700 text-white shadow-lg shadow-orange-900/20'
                    : 'bg-gradient-to-r from-gray-800 to-gray-800/80 text-gray-100 border border-orange-800/20'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                <p className="text-xs opacity-60 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gradient-to-r from-gray-800 to-gray-800/80 text-gray-100 p-3 rounded-lg border border-orange-800/20">
              <div className="flex items-center space-x-3">
                {/* Simple animated sparks */}
                <div className="flex items-center space-x-1">
                  <div className="relative">
                    {/* Central spark */}
                    <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                    {/* Radiating sparks */}
                    <div className="absolute -top-1 -left-1 w-1 h-1 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.2s' }}></div>
                    <div className="absolute -top-1 -right-1 w-1 h-1 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.4s' }}></div>
                    <div className="absolute -bottom-1 -left-1 w-1 h-1 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.6s' }}></div>
                    <div className="absolute -bottom-1 -right-1 w-1 h-1 bg-orange-300 rounded-full animate-ping" style={{ animationDelay: '0.8s' }}></div>
                  </div>
                </div>
                <span className="text-sm text-orange-300/90">
                  Forging response...
                </span>
              </div>
            </div>
          </div>
        )}
        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-orange-800/30 bg-gradient-to-r from-orange-950/10 to-transparent">
        <div className="flex space-x-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={serverConnected ? "Ask about your notes..." : "AI server disconnected"}
            disabled={!serverConnected || isLoading}
            className="flex-1 bg-gray-800 border border-orange-800/30 rounded-lg px-3 py-2 text-white placeholder-orange-300/50 resize-none focus:outline-none focus:border-orange-600 focus:ring-1 focus:ring-orange-600/50 transition-colors"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!serverConnected || isLoading || !input.trim()}
            className="px-4 py-2 bg-gradient-to-r from-orange-600 to-orange-700 text-white rounded-lg hover:from-orange-500 hover:to-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-orange-900/20 font-medium"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};