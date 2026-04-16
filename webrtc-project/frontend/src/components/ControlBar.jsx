/**
 * Bottom control bar — glassmorphism, centered, with all meeting controls.
 */
export default function ControlBar({
  isMicOn,
  isCameraOn,
  isScreenSharing,
  isBlurOn,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleBlur,
  onHangUp,
  onToggleChat,
  onToggleParticipants,
  isChatOpen,
  isParticipantsOpen,
  unreadChatCount,
}) {
  return (
    <div className="h-20 flex items-center justify-center glass-strong border-t border-white/5 z-40">
      <div className="flex items-center gap-2">
        {/* Mic */}
        <button onClick={onToggleMic} className={`ctrl-btn ${isMicOn ? 'on' : 'off'}`} title={isMicOn ? 'Mute' : 'Unmute'} id="btn-mic">
          {isMicOn ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </svg>
          )}
          {!isMicOn && <span className="absolute inset-0 rounded-full border-2 border-danger/50" />}
        </button>

        {/* Camera */}
        <button onClick={onToggleCamera} className={`ctrl-btn ${isCameraOn ? 'on' : 'off'}`} title={isCameraOn ? 'Turn off camera' : 'Turn on camera'} id="btn-camera">
          {isCameraOn ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          )}
          {!isCameraOn && <span className="absolute inset-0 rounded-full border-2 border-danger/50" />}
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Screen Share */}
        <button onClick={onToggleScreenShare} className={`ctrl-btn ${isScreenSharing ? 'on' : 'off'}`} title="Share screen" id="btn-screen">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {isScreenSharing && <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full border-2 border-surface-800 animate-pulse" />}
        </button>

        {/* Blur */}
        <button onClick={onToggleBlur} className={`ctrl-btn ${isBlurOn ? 'on' : 'off'}`} title="Blur background" id="btn-blur">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {isBlurOn && <span className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-surface-800" />}
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Chat */}
        <button onClick={onToggleChat} className={`ctrl-btn ${isChatOpen ? 'on' : 'off'}`} title="Chat" id="btn-chat">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          {unreadChatCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-danger rounded-full text-[9px] font-bold text-white flex items-center justify-center px-1 border-2 border-surface-800">
              {unreadChatCount > 9 ? '9+' : unreadChatCount}
            </span>
          )}
        </button>

        {/* Participants */}
        <button onClick={onToggleParticipants} className={`ctrl-btn ${isParticipantsOpen ? 'on' : 'off'}`} title="Participants" id="btn-participants">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>

        <div className="w-px h-8 bg-white/10 mx-1" />

        {/* Leave */}
        <button onClick={onHangUp} className="ctrl-btn danger w-14" title="Leave meeting" id="btn-hangup">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
