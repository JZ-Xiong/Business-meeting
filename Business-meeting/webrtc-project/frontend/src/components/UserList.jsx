import { useState } from 'react';

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
 * Left sidebar showing online users in the room.
 */
export default function UserList({ users, currentUserId, callStatus, onCallUser }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const isInCall = callStatus === 'connected' || callStatus === 'calling';

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute top-4 left-4 z-50 glass rounded-xl p-2.5 hover:bg-white/10 transition-all"
        title={isExpanded ? 'Hide participants' : 'Show participants'}
        id="btn-toggle-users"
      >
        <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {users.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full text-[10px] font-bold text-white flex items-center justify-center">
            {users.length}
          </span>
        )}
      </button>

      {/* User list panel */}
      <div
        className={`absolute top-4 left-4 z-40 pt-14 transition-all duration-300 ease-out ${
          isExpanded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
        }`}
      >
        <div className="glass-strong rounded-2xl p-3 w-64 max-h-[60vh] overflow-y-auto">
          <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider px-2 mb-2">
            In this room ({users.length})
          </h3>

          {users.length === 0 ? (
            <p className="text-sm text-white/30 px-2 py-4 text-center">
              No other participants yet
            </p>
          ) : (
            <ul className="space-y-1">
              {users.map((user) => {
                const grad = getGradient(user);
                const initials = getInitials(user);

                return (
                  <li key={user}>
                    <button
                      onClick={() => !isInCall && onCallUser(user)}
                      disabled={isInCall}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                        isInCall
                          ? 'cursor-default opacity-70'
                          : 'hover:bg-white/8 cursor-pointer'
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                        {initials}
                      </div>

                      {/* Name */}
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-white truncate">{user}</p>
                        <p className="text-[11px] text-white/30">
                          {isInCall ? 'In call' : 'Click to call'}
                        </p>
                      </div>

                      {/* Call icon */}
                      {!isInCall && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-4 h-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
