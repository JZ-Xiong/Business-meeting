import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Manages local media — camera, mic, screen sharing, and blur background.
 */
export default function useLocalStream() {
  const [localStream, setLocalStream] = useState(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBlurOn, setIsBlurOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const cameraStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);

  // Acquire camera + mic
  const startMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      cameraStreamRef.current = stream;
      setLocalStream(stream);
      startSpeakingDetection(stream);
      return stream;
    } catch (err) {
      console.error('Failed to get user media:', err);
      throw err;
    }
  }, []);

  // Speaking detection via AudioContext
  const startSpeakingDetection = useCallback((stream) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const detect = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setIsSpeaking(avg > 18);
        animFrameRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      console.warn('Audio analysis not available:', err);
    }
  }, []);

  // Toggle mic
  const toggleMic = useCallback(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsMicOn((prev) => !prev);
  }, [localStream]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled;
    });
    setIsCameraOn((prev) => !prev);
  }, [localStream]);

  // Screen sharing
  const toggleScreenShare = useCallback(async (peerConnection) => {
    if (isScreenSharing) {
      // Stop screen share, restore camera
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (peerConnection && cameraStreamRef.current) {
        const camTrack = cameraStreamRef.current.getVideoTracks()[0];
        if (camTrack) {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(camTrack);
        }
      }
      setIsScreenSharing(false);
      setLocalStream(cameraStreamRef.current);
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        });
        screenStreamRef.current = screenStream;

        const screenTrack = screenStream.getVideoTracks()[0];
        screenTrack.onended = () => toggleScreenShare(peerConnection);

        if (peerConnection) {
          const sender = peerConnection.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(screenTrack);
        }

        // Create mixed stream for local preview
        const mixed = new MediaStream([
          screenTrack,
          ...(cameraStreamRef.current?.getAudioTracks() || []),
        ]);
        setLocalStream(mixed);
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Screen share cancelled or failed:', err);
      }
    }
  }, [isScreenSharing]);

  // Blur background (simple CSS filter — real ML blur would need TensorFlow.js)
  const toggleBlur = useCallback(() => {
    setIsBlurOn((prev) => !prev);
  }, []);

  // Cleanup
  const stopMedia = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setLocalStream(null);
    setIsMicOn(true);
    setIsCameraOn(true);
    setIsScreenSharing(false);
    setIsBlurOn(false);
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return {
    localStream,
    isMicOn,
    isCameraOn,
    isScreenSharing,
    isBlurOn,
    isSpeaking,
    startMedia,
    stopMedia,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    toggleBlur,
  };
}
