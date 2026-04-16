const GRADIENTS = [
  'from-indigo-500 to-purple-600',
  'from-emerald-500 to-teal-600',
  'from-orange-500 to-rose-600',
  'from-cyan-500 to-blue-600',
  'from-pink-500 to-fuchsia-600',
  'from-amber-500 to-orange-600',
];

function getGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

/**
 * Participant list panel showing all users in the room.
 */
export default function ParticipantList({ users, currentUserId, speakingUsers, peerStates }) {
  const allUsers = [currentUserId, ...users];

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-white/5">
        <p className="text-xs font-semibold text-white/40 uppercase tracking-wider">
          Participants ({allUsers.length})
        </p>
      </div>

      <ul className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {allUsers.map((uid) => {
          const isMe = uid === currentUserId;
          const grad = getGradient(uid);
          const initial = uid.charAt(0).toUpperCase();
          const isSpeaking = speakingUsers?.has(uid);
          const state = isMe ? 'connected' : (peerStates?.[uid] || 'waiting');

          return (
            <li key={uid} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
              {/* Avatar */}
              <div className={`relative w-8 h-8 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                {initial}
                {isSpeaking && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-success rounded-full border-2 border-surface-800 animate-pulse" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {uid} {isMe && <span className="text-white/30">(You)</span>}
                </p>
                <p className={`text-[10px] ${
                  state === 'connected' ? 'text-success' :
                  state === 'connecting' ? 'text-warning' :
                  'text-white/30'
                }`}>
                  {state === 'connected' ? 'Connected' :
                   state === 'connecting' ? 'Connecting...' :
                   isMe ? 'Host' : 'In room'}
                </p>
              </div>

              {/* Speaking bars */}
              {isSpeaking && (
                <span className="flex gap-[2px] items-end h-3 flex-shrink-0">
                  <span className="w-[2px] bg-success rounded-full animate-[speaking_0.6s_ease-in-out_infinite]" style={{ height: '40%' }} />
                  <span className="w-[2px] bg-success rounded-full animate-[speaking_0.6s_ease-in-out_infinite_0.1s]" style={{ height: '70%' }} />
                  <span className="w-[2px] bg-success rounded-full animate-[speaking_0.6s_ease-in-out_infinite_0.2s]" style={{ height: '45%' }} />
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
