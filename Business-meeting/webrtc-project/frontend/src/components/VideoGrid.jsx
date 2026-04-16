import { useMemo } from 'react';
import VideoTile from './VideoTile';

function getGridLayout(count) {
  if (count <= 1) return { rows: 1, cols: 1 };
  if (count === 2) return { rows: 1, cols: 2 };
  if (count <= 4) return { rows: 2, cols: 2 };
  if (count <= 6) return { rows: 2, cols: 3 };
  if (count <= 9) return { rows: 3, cols: 3 };
  return {
    rows: Math.ceil(Math.sqrt(count)),
    cols: Math.ceil(Math.sqrt(count)),
  };
}

/**
 * Video grid with automatic layout + active speaker (spotlight) mode.
 */
export default function VideoGrid({
  localStream,
  remoteStreams,
  userId,
  isMicOn,
  isCameraOn,
  activeSpeaker,
  speakingUsers,
  roomUsers,
}) {
  // Build participant list: local user + remote users
  const participants = useMemo(() => {
    const list = [];

    // Local user
    list.push({
      id: userId,
      stream: localStream,
      isLocal: true,
      isMuted: !isMicOn,
      isCameraOff: !isCameraOn,
    });

    // Remote users
    roomUsers.forEach((peerId) => {
      list.push({
        id: peerId,
        stream: remoteStreams[peerId] || null,
        isLocal: false,
        isMuted: false,
        isCameraOff: !remoteStreams[peerId],
      });
    });

    return list;
  }, [userId, localStream, remoteStreams, isMicOn, isCameraOn, roomUsers]);

  const count = participants.length;
  const useSpeakerMode = activeSpeaker && count > 2;

  // Speaker mode: one large + rest small
  if (useSpeakerMode) {
    const speaker = participants.find((p) => p.id === activeSpeaker) || participants[0];
    const others = participants.filter((p) => p.id !== speaker.id);

    return (
      <div className="w-full h-full flex flex-col gap-2 p-3 animate-fade-in">
        {/* Main speaker */}
        <div className="flex-1 min-h-0">
          <VideoTile
            stream={speaker.stream}
            userId={speaker.id}
            isMuted={speaker.isMuted}
            isCameraOff={speaker.isCameraOff}
            isSpeaking={speakingUsers.has(speaker.id)}
            isActiveSpeaker={true}
            isLocal={speaker.isLocal}
          />
        </div>

        {/* Thumbnail row */}
        {others.length > 0 && (
          <div className="h-28 flex gap-2 overflow-x-auto pb-1">
            {others.map((p) => (
              <div key={p.id} className="h-full aspect-video flex-shrink-0">
                <VideoTile
                  stream={p.stream}
                  userId={p.id}
                  isMuted={p.isMuted}
                  isCameraOff={p.isCameraOff}
                  isSpeaking={speakingUsers.has(p.id)}
                  isActiveSpeaker={false}
                  isLocal={p.isLocal}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid mode
  const { rows, cols } = getGridLayout(count);

  return (
    <div
      className="w-full h-full p-3 animate-fade-in"
      style={{
        display: 'grid',
        gridTemplateRows: `repeat(${rows}, 1fr)`,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: '0.5rem',
      }}
    >
      {participants.map((p) => (
        <VideoTile
          key={p.id}
          stream={p.stream}
          userId={p.id}
          isMuted={p.isMuted}
          isCameraOff={p.isCameraOff}
          isSpeaking={speakingUsers.has(p.id)}
          isActiveSpeaker={activeSpeaker === p.id}
          isLocal={p.isLocal}
        />
      ))}
    </div>
  );
}
