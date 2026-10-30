'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Headphones, ShieldCheck, CheckCheck, Loader2 } from 'lucide-react';
import { useLocale } from 'next-intl';

interface SupportMessage {
  id: string;
  sender: 'user' | 'support';
  sender_name: string;
  text: string;
  created_at: string;
}

export function SupportChatWidget() {
  const locale = useLocale();
  const isRu = locale === 'ru';

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get or initialize persistent guestId
  const getGuestId = () => {
    if (typeof window === 'undefined') return '';
    let gid = localStorage.getItem('virale_guest_support_id');
    if (!gid) {
      gid = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      localStorage.setItem('virale_guest_support_id', gid);
    }
    return gid;
  };

  // Scroll to latest message
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  // Fetch messages from API
  const fetchMessages = async () => {
    try {
      const gid = getGuestId();
      const res = await fetch(`/api/support/chat?guestId=${encodeURIComponent(gid)}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setMessages(prev => {
          // If new messages arrived while chat was closed, increment unread
          if (!isOpen && data.messages.length > prev.length) {
            const newAdminMsgs = data.messages.slice(prev.length).filter((m: SupportMessage) => m.sender === 'support');
            if (newAdminMsgs.length > 0) {
              setUnreadCount(c => c + newAdminMsgs.length);
            }
          }
          return data.messages;
        });
      }
    } catch (err) {
      console.warn('[SupportChat] Poll error:', err);
    }
  };

  // Listen for global open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setUnreadCount(0);
    };
    window.addEventListener('open-support-chat', handleOpen);
    return () => window.removeEventListener('open-support-chat', handleOpen);
  }, []);

  // Initial load
  useEffect(() => {
    fetchMessages();
  }, []);

  // Polling loop
  useEffect(() => {
    const interval = setInterval(fetchMessages, isOpen ? 3500 : 25000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset unread and scroll when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      scrollToBottom(false);
    }
  }, [isOpen, messages.length]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || isSending) return;

    setIsSending(true);
    const gid = getGuestId();

    // Optimistic UI message
    const tempMsg: SupportMessage = {
      id: `temp_${Date.now()}`,
      sender: 'user',
      sender_name: isRu ? 'Вы' : 'You',
      text: cleanText,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, tempMsg]);
    setInputText('');
    scrollToBottom(true);

    try {
      const res = await fetch('/api/support/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          guestId: gid,
          guestName: isRu ? 'Пользователь веб-приложения' : 'Web App User'
        })
      });

      if (!res.ok) throw new Error('Failed to send');
      const data = await res.json();
      if (data.ok && data.message) {
        // Replace temp message with server response
        setMessages(prev => prev.map(m => (m.id === tempMsg.id ? data.message : m)));
      }
    } catch (err) {
      console.error('[SupportChat] Send error:', err);
    } finally {
      setIsSending(false);
      scrollToBottom(true);
    }
  };

  return (
    <>
      {/* Floating Support Button */}
      <div className="fixed bottom-20 right-5 z-40 md:bottom-6 md:right-6">
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => {
            setIsOpen(prev => !prev);
            setUnreadCount(0);
          }}
          className="relative flex items-center justify-center w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-[#1a1a2e] to-[#252542] border border-cyan-500/30 text-cyan-400 shadow-[0_4px_25px_rgba(0,255,204,0.25)] hover:border-cyan-400 hover:shadow-[0_4px_30px_rgba(0,255,204,0.4)] transition-all group"
          title={isRu ? 'Чат с поддержкой' : 'Support Chat'}
          aria-label={isRu ? 'Открыть поддержку' : 'Open Support'}
        >
          <div className="relative">
            {isOpen ? (
              <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-200" />
            ) : (
              <Headphones className="w-6 h-6 text-cyan-300 group-hover:scale-110 transition-transform" />
            )}
          </div>

          {/* Unread Badge */}
          {unreadCount > 0 && !isOpen && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-[#ff0055] text-white text-[10px] font-black shadow-lg animate-bounce">
              {unreadCount}
            </span>
          )}

          {/* Online green indicator */}
          {!isOpen && unreadCount === 0 && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A0A0A] shadow-sm" />
          )}
        </motion.button>
      </div>

      {/* Support Chat Modal / Dialog Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-4 z-50 w-[calc(100vw-2rem)] max-w-sm sm:max-w-md h-[520px] max-h-[80vh] flex flex-col rounded-3xl bg-[#0c0d14]/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border border-cyan-500/30 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-cyan-400" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-[#0c0d14]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-white tracking-wide">
                      {isRu ? 'Служба поддержки' : 'Viral Support'}
                    </h3>
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {isRu ? 'Онлайн · Ответ в течение пары минут' : 'Online · Replies in a few minutes'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-white/10">
              {/* Default Welcome Message */}
              <div className="flex items-start gap-2.5 max-w-[88%]">
                <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                  <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="p-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-xs text-gray-200 leading-relaxed space-y-1">
                  <div className="font-semibold text-cyan-300 text-[11px]">
                    {isRu ? 'Служба поддержки Viral Studio' : 'Viral Studio Support'}
                  </div>
                  <p>
                    {isRu
                      ? 'Здравствуйте! Если у вас есть вопрос, предложение или возникла ошибка — напишите нам. Администратор ответит прямо в этот чат.'
                      : 'Hello! If you have any question, feedback, or encountered an issue, feel free to write. The admin will reply directly in this dialog.'}
                  </p>
                </div>
              </div>

              {/* Message List */}
              {messages.map(msg => {
                const isUser = msg.sender === 'user';
                const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <div
                    key={msg.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-7 h-7 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0 mt-0.5">
                        <Headphones className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed space-y-1 ${
                        isUser
                          ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-tr-sm shadow-md'
                          : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm'
                      }`}
                    >
                      {!isUser && (
                        <div className="font-semibold text-cyan-300 text-[10px]">
                          {msg.sender_name || (isRu ? 'Служба поддержки' : 'Viral Support')}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                      <div
                        className={`text-[9px] flex items-center gap-1 ${
                          isUser ? 'text-purple-200/70 justify-end' : 'text-gray-400'
                        }`}
                      >
                        <span>{timeStr}</span>
                        {isUser && <CheckCheck className="w-3 h-3 text-purple-200" />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-white/10 bg-[#08080e]/90">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  placeholder={isRu ? 'Напишите сообщение...' : 'Type your message...'}
                  disabled={isSending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400/50 transition-colors"
                />

                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="w-10 h-10 rounded-2xl bg-cyan-500 hover:bg-cyan-400 disabled:opacity-30 disabled:hover:bg-cyan-500 text-black flex items-center justify-center transition-all shadow-md active:scale-95"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <Send className="w-4 h-4 text-black" />
                  )}
                </button>
              </div>
              <div className="mt-1.5 px-1 flex items-center justify-between text-[10px] text-gray-500">
                <span>{isRu ? 'Анонимный защищенный диалог' : 'Encrypted direct support'}</span>
                <span>{isRu ? 'Viral Studio Bot' : 'Viral Studio Bot'}</span>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
