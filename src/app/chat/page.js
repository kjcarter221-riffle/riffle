'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { Fish, Send, Trash2, MapPin, Loader2 } from 'lucide-react';

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Check auth
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user) router.push('/login');
      });

    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => {}
      );
    }

    // Welcome message
    setMessages([{
      role: 'assistant',
      content: `Hey! I'm Riffle, your AI fly fishing guide. Ask me anything about:

- **Fly selection** - "What flies should I use today?"
- **Techniques** - "How do I Euro nymph?"
- **Reading water** - "Where do trout hold in pocket water?"
- **Hatches** - "What's hatching in October?"

I'll consider current conditions when making recommendations. What can I help with?`
    }]);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, location }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Sorry, something went wrong. Please try again.'
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Network error. Please check your connection.'
      }]);
    }

    setLoading(false);
  };

  const clearChat = async () => {
    if (!confirm('Clear chat history?')) return;
    await fetch('/api/chat', { method: 'DELETE' });
    setMessages([{
      role: 'assistant',
      content: "Chat cleared! What would you like to know about fly fishing?"
    }]);
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="safe-top sticky top-0 z-40 glass border-b border-white/20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-river-500 to-forest-500 rounded-full flex items-center justify-center">
              <Fish className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-stone-900">AI Fly Guide</h1>
              <p className="text-xs text-stone-500 flex items-center gap-1">
                {location ? (
                  <><MapPin className="w-3 h-3" /> Using your location</>
                ) : (
                  'Location not shared'
                )}
              </p>
            </div>
          </div>
          <button onClick={clearChat} className="p-2 text-stone-400 hover:text-red-500">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}
          >
            <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0">
              {msg.content.split('\n').map((line, j) => {
                if (line.startsWith('**') && line.endsWith('**')) {
                  return <p key={j} className="font-semibold">{line.replace(/\*\*/g, '')}</p>;
                }
                if (line.startsWith('- ')) {
                  return <p key={j} className="ml-2">• {line.slice(2)}</p>;
                }
                if (line.trim() === '') return <br key={j} />;
                return <p key={j}>{line}</p>;
              })}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-bubble-bot">
            <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="sticky bottom-20 px-4 py-3 glass border-t border-white/20">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about flies, techniques, conditions..."
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary px-4 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      <Navigation />
    </div>
  );
}
