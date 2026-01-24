
import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ChatMessage } from '../types.ts';

interface AIAssistantProps {
  currentView: string;
  activeContext?: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ currentView, activeContext }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hi! I’m your AI assistant. I can help you understand what this app does and guide you through any feature. What would you like to do?" }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const apiKey = typeof process !== 'undefined' ? process.env.API_KEY : undefined;
    if (!apiKey) {
      setMessages(prev => [...prev, { role: 'user', text: input.trim() }, { role: 'model', text: "API Key is missing. I can't think right now!" }]);
      setInput('');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey });
      const chat = ai.chats.create({
        model: 'gemini-3-pro-preview',
        config: {
          systemInstruction: `You are a helpful and professional AI assistant for the Auto-Link Platform.
          Auto-Link is a platform for group meetups, automated M-Pesa payments, and SMS confirmations in Kenya.
          
          Features:
          1. Identity Rules: Users register with a unique Hcode and verify via simulated email.
          2. Groups: Users can create groups or join via @username links.
          3. Initiation: Group admins can initiate meetups.
          4. Payments: Members pay via simulated M-Pesa.
          5. Closure: Initiators close meetings, marking absentees and goods.
          6. AI SMS: Generate professional invite texts.

          Current Context:
          - Screen: "${currentView}"
          ${activeContext ? `- Active Context: ${activeContext}` : ''}`,
        }
      });

      const response = await chat.sendMessage({ message: userMessage });
      setMessages(prev => [...prev, { role: 'model', text: response.text || "I'm sorry, I couldn't process that request." }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I encountered an error. Please try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-amber-400 hover:bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center text-3xl z-[300] transition-transform active:scale-95 hover:scale-110"
        title="Help Assistant"
      >
        🥭
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[90vw] max-w-sm h-[500px] bg-white rounded-3xl shadow-2xl z-[301] flex flex-col overflow-hidden border border-slate-200 animate-slideUp">
          <div className="bg-emerald-700 p-4 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xl">🥭</span>
              <div>
                <p className="font-bold text-sm">Auto-Link Assistant</p>
                <p className="text-[10px] text-emerald-100">Always here to help</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 shadow-sm border border-slate-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-4 border-t bg-white">
            <div className="relative">
              <input 
                type="text"
                placeholder="Type your question..."
                className="w-full pl-4 pr-12 py-3 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                value={input}
                onChange={e => setInput(e.target.value)}
              />
              <button 
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1.5 w-8 h-8 bg-emerald-600 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              </button>
            </div>
          </form>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default AIAssistant;
