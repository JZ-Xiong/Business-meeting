import { useState } from 'react';

const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-fuchsia-600',
];

function getGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function getInitials(name) {
  return name
    .split(/[-_\s]/)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Join screen — enter room ID and user ID, then join.
 */
export default function JoinScreen({ onJoin }) {
  const [roomId, setRoomId] = useState('room-1');
  const [userId, setUserId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const rid = roomId.trim();
    const uid = userId.trim();

    if (!rid || !uid) {
      setError('Please enter both Room ID and your Name.');
      return;
    }

    setError('');
    setIsJoining(true);

    try {
      await onJoin(rid, uid);
    } catch (err) {
      setError(err.message || 'Failed to join.');
      setIsJoining(false);
    }
  };

  const gradient = userId.trim() ? getGradient(userId.trim()) : 'from-gray-500 to-gray-600';
  const initials = userId.trim() ? getInitials(userId.trim()) : '?';

  return (
    <div className="h-full w-full flex items-center justify-center bg-surface-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-accent/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -right-48 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-cyan-500/6 rounded-full blur-3xl" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-strong rounded-3xl p-8 w-full max-w-md mx-4 animate-scale-in relative z-10"
      >
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-purple-600 mb-4 shadow-lg shadow-accent/25">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">WebRTC Meet</h1>
          <p className="text-white/50 text-sm mt-1">Join a room to start video calling</p>
        </div>

        {/* Preview avatar */}
        <div className="flex justify-center mb-6">
          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl font-bold text-white shadow-lg transition-all duration-300`}>
            {initials}
          </div>
        </div>

        {/* Room ID */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-white/60 mb-1.5" htmlFor="join-room">
            Room ID
          </label>
          <input
            id="join-room"
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="room-1"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* User Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white/60 mb-1.5" htmlFor="join-user">
            Your Name
          </label>
          <input
            id="join-user"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter your name"
            autoFocus
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>

        {/* Error */}
        {error && (
          <p className="text-danger text-sm mb-4 text-center animate-fade-in">{error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isJoining}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-accent to-purple-600 text-white font-semibold text-base hover:shadow-lg hover:shadow-accent/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {isJoining ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="currentColor" className="opacity-75" />
              </svg>
              Connecting...
            </span>
          ) : (
            'Join Room'
          )}
        </button>
      </form>
    </div>
  );
}
