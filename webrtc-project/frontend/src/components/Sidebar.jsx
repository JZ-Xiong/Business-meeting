import ChatPanel from './ChatPanel';
import ParticipantList from './ParticipantList';

/**
 * Right sidebar with tabs: Chat and Participants.
 */
export default function Sidebar({
  activeTab,
  onClose,
  chatMessages,
  userId,
  onSendMessage,
  roomUsers,
  speakingUsers,
  peerStates,
  unreadCount,
}) {
  if (!activeTab) return null;

  return (
    <div className="w-80 h-full glass-strong border-l border-white/5 flex flex-col animate-fade-in">
      {/* Tab header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex gap-1">
          {/* We just show the active panel title */}
          <h2 className="text-sm font-semibold text-white">
            {activeTab === 'chat' ? 'Chat' : 'Participants'}
          </h2>
          {activeTab === 'chat' && unreadCount > 0 && (
            <span className="w-5 h-5 bg-accent rounded-full text-[10px] font-bold text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
        >
          <svg className="w-4 h-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Panel content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          <ChatPanel
            messages={chatMessages}
            userId={userId}
            onSendMessage={onSendMessage}
          />
        ) : (
          <ParticipantList
            users={roomUsers}
            currentUserId={userId}
            speakingUsers={speakingUsers}
            peerStates={peerStates}
          />
        )}
      </div>
    </div>
  );
}
