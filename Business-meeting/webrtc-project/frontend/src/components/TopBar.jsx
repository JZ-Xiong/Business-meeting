import { useState, useEffect } from 'react';

/**
 * Top bar — room name, connection status, meeting timer.
 */
export default function TopBar({ roomId, userId, isConnected, participantCount }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="h-14 flex items-center justify-between px-5 glass-strong border-b border-white/5 z-50 animate-fade-in">
      {/* Left: Room info */}
      <div className="flex items-center gap-3">
        <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-success animate-pulse' : 'bg-danger'}`} />
        <div>
          <h1 className="text-sm font-semibold text-white leading-tight">{roomId}</h1>
          <p className="text-[11px] text-white/40">{participantCount} participant{participantCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Center: Timer */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <span className="text-sm font-mono text-white/50 tabular-nums">{formatTime(elapsed)}</span>
      </div>

      {/* Right: User info */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/50">{userId}</span>
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-purple-600 flex items-center justify-center text-[10px] font-bold text-white">
          {userId?.charAt(0)?.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
