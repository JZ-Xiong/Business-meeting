import { useRef, useEffect } from 'react';
import AvatarFallback from './AvatarFallback';

/**
 * Full-screen remote video + PiP local video overlay.
 */
export default function VideoStage({
  localStream,
  remoteStream,
  isCameraOn,
  isBlurOn,
  isSpeaking,
  remoteSpeaking,
  userId,
  peerUserId,
  callStatus,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream || null;
    }
  }, [localStream]);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = remoteStream || null;
    }
  }, [remoteStream]);

  const isInCall = callStatus === 'connected' || callStatus === 'calling';

  return (
    <div className="relative w-full h-full bg-surface-900 overflow-hidden">
      {/* Remote video — full screen */}
      {remoteStream ? (
        <div className={`absolute inset-0 transition-shadow duration-500 ${remoteSpeaking ? 'speaking-glow' : ''}`}>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Remote user label */}
          {peerUserId && (
            <div className="absolute bottom-20 left-6 glass rounded-xl px-3 py-1.5 flex items-center gap-2 animate-fade-in">
              {remoteSpeaking && (
                <span className="flex gap-0.5 items-end h-4">
                  <span className="w-0.5 bg-success rounded-full animate-[speaking_0.8s_ease-in-out_infinite]" style={{ height: '40%' }} />
                  <span className="w-0.5 bg-success rounded-full animate-[speaking_0.8s_ease-in-out_infinite_0.1s]" style={{ height: '70%' }} />
                  <span className="w-0.5 bg-success rounded-full animate-[speaking_0.8s_ease-in-out_infinite_0.2s]" style={{ height: '50%' }} />
                </span>
              )}
              <span className="text-sm font-medium text-white text-shadow-sm">{peerUserId}</span>
            </div>
          )}
        </div>
      ) : (
        /* Waiting state */
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="relative mb-6">
            <div className="w-24 h-24 rounded-full bg-surface-700 flex items-center justify-center">
              <svg className="w-12 h-12 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            {isInCall && (
              <div className="absolute inset-0 rounded-full animate-pulse-ring border-2 border-accent/30" />
            )}
          </div>
          <p className="text-white/40 text-lg font-medium">
            {callStatus === 'calling'
              ? 'Connecting...'
              : 'Select a user to start calling'}
          </p>
        </div>
      )}

      {/* Local PiP video — bottom right */}
      <div className={`pip-video ${isSpeaking ? 'speaking-glow' : ''}`}>
        {isCameraOn && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${isBlurOn ? 'blur-sm' : ''}`}
          />
        ) : (
          <AvatarFallback name={userId} size="full" />
        )}

        {/* Local user label */}
        <div className="absolute bottom-2 left-2 glass rounded-lg px-2 py-0.5">
          <span className="text-xs font-medium text-white/80">You</span>
        </div>
      </div>
    </div>
  );
}
