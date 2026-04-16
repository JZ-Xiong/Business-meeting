import { useRef, useEffect } from 'react';
import AvatarFallback from './AvatarFallback';

/**
 * Single video tile for one participant.
 */
export default function VideoTile({ stream, userId, isMuted, isCameraOff, isSpeaking, isActiveSpeaker, isLocal, size = 'md' }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream || null;
    }
  }, [stream]);

  const borderClass = isActiveSpeaker
    ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-surface-900'
    : isSpeaking
    ? 'ring-1 ring-green-400/40'
    : 'ring-1 ring-white/5';

  return (
    <div className={`relative rounded-2xl overflow-hidden bg-surface-700 transition-all duration-300 ${borderClass} ${size === 'sm' ? 'min-w-[140px]' : ''}`}>
      {/* Video or Avatar */}
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface-700 to-surface-800">
          <AvatarFallback name={userId} size={size === 'sm' ? 'md' : 'lg'} />
        </div>
      )}

      {/* Bottom label bar */}
      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Speaking indicator */}
            {isSpeaking && (
              <span className="flex gap-[2px] items-end h-3">
                <span className="w-[3px] bg-green-400 rounded-full animate-[speaking_0.7s_ease-in-out_infinite]" style={{ height: '40%' }} />
                <span className="w-[3px] bg-green-400 rounded-full animate-[speaking_0.7s_ease-in-out_infinite_0.15s]" style={{ height: '70%' }} />
                <span className="w-[3px] bg-green-400 rounded-full animate-[speaking_0.7s_ease-in-out_infinite_0.3s]" style={{ height: '50%' }} />
              </span>
            )}
            <span className="text-xs font-medium text-white text-shadow-sm truncate max-w-[120px]">
              {isLocal ? `${userId} (You)` : userId}
            </span>
          </div>

          {/* Muted indicator */}
          {isMuted && (
            <span className="w-5 h-5 rounded-full bg-danger/80 flex items-center justify-center flex-shrink-0">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
