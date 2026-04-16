import { useState, useEffect, useRef, useCallback } from 'react';

const DANMAKU_COLORS = [
  '#ffffff', '#ff6b6b', '#ffd93d', '#6bcb77',
  '#4d96ff', '#ff6bff', '#ff9f43', '#00d2d3',
];

const DANMAKU_SPEED = 8; // seconds to cross screen
const MAX_TRACKS = 8;   // max vertical positions

/**
 * Danmaku (bullet screen) overlay — messages fly right to left over video.
 */
export default function DanmakuOverlay({ messages, onSendDanmaku, isVisible = true }) {
  const [input, setInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [showInput, setShowInput] = useState(false);
  const [activeItems, setActiveItems] = useState([]);
  const containerRef = useRef(null);
  const processedRef = useRef(new Set());
  const trackRef = useRef(0);

  // Process new messages into active danmaku items
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const latest = messages[messages.length - 1];
    if (processedRef.current.has(latest.id)) return;
    processedRef.current.add(latest.id);

    // Assign a track (vertical position)
    const track = trackRef.current % MAX_TRACKS;
    trackRef.current += 1;

    const item = {
      ...latest,
      track,
      startTime: Date.now(),
    };

    setActiveItems((prev) => [...prev, item]);

    // Remove after animation completes
    setTimeout(() => {
      setActiveItems((prev) => prev.filter((d) => d.id !== latest.id));
    }, DANMAKU_SPEED * 1000 + 500);

    // Prevent memory leak in processedRef
    if (processedRef.current.size > 500) {
      const entries = [...processedRef.current];
      processedRef.current = new Set(entries.slice(-200));
    }
  }, [messages]);

  const handleSend = useCallback((e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    onSendDanmaku(text, selectedColor);
    setInput('');
  }, [input, selectedColor, onSendDanmaku]);

  if (!isVisible) return null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-20">
      {/* Flying danmaku messages */}
      {activeItems.map((item) => (
        <div
          key={item.id}
          className="absolute whitespace-nowrap text-sm font-bold pointer-events-none"
          style={{
            top: `${(item.track * 100) / MAX_TRACKS + 2}%`,
            color: item.color || '#ffffff',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.4)',
            animation: `danmaku-fly ${DANMAKU_SPEED}s linear forwards`,
            fontSize: '16px',
            letterSpacing: '0.5px',
          }}
        >
          <span className="opacity-50 text-xs mr-1">{item.from}:</span>
          {item.content}
        </div>
      ))}

      {/* Danmaku input toggle button */}
      <button
        onClick={() => setShowInput(!showInput)}
        className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors pointer-events-auto z-30"
        title="Send danmaku"
      >
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      </button>

      {/* Danmaku input bar */}
      {showInput && (
        <form
          onSubmit={handleSend}
          className="absolute bottom-14 right-3 flex items-center gap-2 bg-black/70 backdrop-blur-md rounded-xl px-3 py-2 pointer-events-auto animate-fade-in"
        >
          {/* Color picker dots */}
          <div className="flex gap-1">
            {DANMAKU_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setSelectedColor(c)}
                className={`w-4 h-4 rounded-full border-2 transition-transform ${
                  selectedColor === c ? 'border-white scale-125' : 'border-transparent scale-100'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Send danmaku..."
            maxLength={50}
            className="w-40 px-2 py-1 rounded-lg bg-white/10 border border-white/20 text-sm text-white placeholder-white/30 focus:outline-none focus:border-accent/60"
            autoFocus
          />

          <button
            type="submit"
            disabled={!input.trim()}
            className="px-2 py-1 rounded-lg bg-accent/80 text-white text-xs font-medium hover:bg-accent disabled:opacity-30 transition-colors"
          >
            Send
          </button>
        </form>
      )}
    </div>
  );
}
