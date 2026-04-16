import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Detects which user is currently speaking the loudest.
 * Monitors audio levels for all streams (local + remote).
 */
export default function useActiveSpeaker(localStream, remoteStreams, userId) {
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());

  const analysersRef = useRef({});
  const animFrameRef = useRef(null);

  const setupAnalyser = useCallback((id, stream) => {
    if (analysersRef.current[id]) return;
    if (!stream) return;

    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);

      analysersRef.current[id] = {
        analyser,
        dataArray: new Uint8Array(analyser.frequencyBinCount),
        audioCtx,
      };
    } catch (err) {
      // Audio analysis not available
    }
  }, []);

  // Monitor all streams
  useEffect(() => {
    // Setup local stream analyser
    if (localStream && userId) {
      setupAnalyser(userId, localStream);
    }

    // Setup remote stream analysers
    Object.entries(remoteStreams).forEach(([peerId, stream]) => {
      setupAnalyser(peerId, stream);
    });

    // Cleanup old analysers for removed streams
    const currentIds = new Set([userId, ...Object.keys(remoteStreams)]);
    Object.keys(analysersRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        analysersRef.current[id]?.audioCtx?.close();
        delete analysersRef.current[id];
      }
    });
  }, [localStream, remoteStreams, userId, setupAnalyser]);

  // Detection loop
  useEffect(() => {
    const detect = () => {
      let maxLevel = 0;
      let maxId = null;
      const speaking = new Set();

      Object.entries(analysersRef.current).forEach(([id, { analyser, dataArray }]) => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

        if (avg > 15) {
          speaking.add(id);
          if (avg > maxLevel) {
            maxLevel = avg;
            maxId = id;
          }
        }
      });

      setActiveSpeaker(maxId);
      setSpeakingUsers(speaking);
      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(analysersRef.current).forEach(({ audioCtx }) => {
        audioCtx?.close();
      });
      analysersRef.current = {};
    };
  }, []);

  return { activeSpeaker, speakingUsers };
}
