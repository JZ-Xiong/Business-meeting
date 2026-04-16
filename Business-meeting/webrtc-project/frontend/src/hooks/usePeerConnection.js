import { useState, useRef, useCallback, useEffect } from 'react';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Manages RTCPeerConnection lifecycle — offer/answer/ICE, remote stream, call status.
 */
export default function usePeerConnection({ sendSignal, roomId, userId }) {
  const [remoteStream, setRemoteStream] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | connected | disconnected
  const [remoteSpeaking, setRemoteSpeaking] = useState(false);

  const pcRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const peerUserIdRef = useRef('');
  const remoteAnalyserRef = useRef(null);
  const remoteAnimFrameRef = useRef(null);

  const createPeerConnection = useCallback((localStream) => {
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    pendingCandidatesRef.current = [];

    // Add local tracks
    if (localStream) {
      localStream.getTracks().forEach((track) => {
        pc.addTrack(track, localStream);
      });
    }

    // Receive remote tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStream(stream);
      startRemoteSpeakingDetection(stream);
    };

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate || !peerUserIdRef.current) return;
      sendSignal({
        type: 'candidate',
        roomId,
        from: userId,
        to: peerUserIdRef.current,
        data: { candidate },
      });
    };

    // Connection state
    pc.onconnectionstatechange = () => {
      if (!pcRef.current) return;
      const state = pcRef.current.connectionState;
      if (state === 'connected') setCallStatus('connected');
      else if (state === 'disconnected' || state === 'failed') setCallStatus('disconnected');
    };

    pc.oniceconnectionstatechange = () => {
      if (!pcRef.current) return;
      const state = pcRef.current.iceConnectionState;
      if (state === 'connected' || state === 'completed') setCallStatus('connected');
    };

    return pc;
  }, [sendSignal, roomId, userId]);

  // Remote speaking detection
  const startRemoteSpeakingDetection = useCallback((stream) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      remoteAnalyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const detect = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setRemoteSpeaking(avg > 18);
        remoteAnimFrameRef.current = requestAnimationFrame(detect);
      };
      detect();
    } catch (err) {
      console.warn('Remote audio analysis not available:', err);
    }
  }, []);

  // Initiate call (send offer)
  const callUser = useCallback(async (targetUserId, localStream) => {
    peerUserIdRef.current = targetUserId;
    setCallStatus('calling');

    const pc = createPeerConnection(localStream);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal({
      type: 'offer',
      roomId,
      from: userId,
      to: targetUserId,
      data: { sdp: offer },
    });
  }, [createPeerConnection, sendSignal, roomId, userId]);

  // Handle incoming offer
  const handleOffer = useCallback(async (msg, localStream) => {
    peerUserIdRef.current = msg.from;
    setCallStatus('calling');

    const pc = createPeerConnection(localStream);
    await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
    await flushPendingCandidates(pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignal({
      type: 'answer',
      roomId,
      from: userId,
      to: msg.from,
      data: { sdp: answer },
    });
  }, [createPeerConnection, sendSignal, roomId, userId]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (msg) => {
    if (!pcRef.current) return;
    await pcRef.current.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
    await flushPendingCandidates(pcRef.current);
  }, []);

  // Handle incoming ICE candidate
  const handleCandidate = useCallback(async (msg) => {
    const candidate = new RTCIceCandidate(msg.data.candidate);

    if (!pcRef.current || !pcRef.current.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }

    await pcRef.current.addIceCandidate(candidate);
  }, []);

  const flushPendingCandidates = async (pc) => {
    while (pendingCandidatesRef.current.length > 0) {
      const c = pendingCandidatesRef.current.shift();
      await pc.addIceCandidate(c);
    }
  };

  // Hang up
  const hangUp = useCallback(() => {
    if (remoteAnimFrameRef.current) cancelAnimationFrame(remoteAnimFrameRef.current);
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    peerUserIdRef.current = '';
    pendingCandidatesRef.current = [];
    setRemoteStream(null);
    setCallStatus('idle');
    setRemoteSpeaking(false);
  }, []);

  // Handle user leaving
  const handleUserLeft = useCallback((leftUserId) => {
    if (peerUserIdRef.current === leftUserId) {
      hangUp();
    }
  }, [hangUp]);

  useEffect(() => {
    return () => {
      if (remoteAnimFrameRef.current) cancelAnimationFrame(remoteAnimFrameRef.current);
      if (pcRef.current) pcRef.current.close();
    };
  }, []);

  return {
    remoteStream,
    callStatus,
    remoteSpeaking,
    peerUserId: peerUserIdRef.current,
    callUser,
    handleOffer,
    handleAnswer,
    handleCandidate,
    handleUserLeft,
    hangUp,
    peerConnection: pcRef.current,
  };
}
