import { useState, useRef, useEffect } from 'react';

/**
 * Real-time chat panel with message history.
 */
export default function ChatPanel({ messages, userId, onSendMessage }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setText('');
  };

  const formatTime = (ts) => {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-white/25 text-sm py-8">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isMe = msg.from === userId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              {!isMe && (
                <span className="text-[10px] font-medium text-white/40 mb-0.5 px-1">{msg.from}</span>
              )}
              <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm break-words ${
                isMe
                  ? 'bg-accent/30 text-white rounded-br-md'
                  : 'bg-white/8 text-white/90 rounded-bl-md'
              }`}>
                {msg.text}
              </div>
              <span className="text-[9px] text-white/25 mt-0.5 px-1">{formatTime(msg.timestamp)}</span>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 border-t border-white/5">
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/8 text-sm text-white placeholder-white/25 focus:outline-none focus:border-accent/40 transition-colors"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="px-3 py-2 rounded-xl bg-accent/80 text-white text-sm font-medium hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
