import { useState, useRef, useCallback, useEffect } from 'react';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Manages multiple RTCPeerConnections for mesh-based multi-user calls.
 * One connection per remote user.
 */
export default function useMultiPeerConnection({ sendSignal, roomId, userId }) {
  const [remoteStreams, setRemoteStreams] = useState({});   // { peerId: MediaStream }
  const [peerStates, setPeerStates] = useState({});        // { peerId: 'connecting'|'connected'|'disconnected' }

  const connectionsRef = useRef({});     // { peerId: RTCPeerConnection }
  const pendingCandidatesRef = useRef({}); // { peerId: RTCIceCandidate[] }
  const localStreamRef = useRef(null);

  const setLocalStream = useCallback((stream) => {
    localStreamRef.current = stream;
  }, []);

  // Create a peer connection for a specific remote user
  const createConnection = useCallback((peerId) => {
    if (connectionsRef.current[peerId]) {
      connectionsRef.current[peerId].close();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    connectionsRef.current[peerId] = pc;
    pendingCandidatesRef.current[peerId] = [];

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Receive remote tracks
    pc.ontrack = (event) => {
      setRemoteStreams((prev) => ({ ...prev, [peerId]: event.streams[0] }));
    };

    // ICE candidates
    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      sendSignal({
        type: 'candidate',
        roomId,
        from: userId,
        to: peerId,
        data: { candidate },
      });
    };

    // Connection state tracking
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setPeerStates((prev) => ({ ...prev, [peerId]: state }));
    };

    return pc;
  }, [sendSignal, roomId, userId]);

  // Initiate call to a specific user (send offer)
  const callUser = useCallback(async (peerId) => {
    const pc = createConnection(peerId);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal({
      type: 'offer',
      roomId,
      from: userId,
      to: peerId,
      data: { sdp: offer },
    });

    setPeerStates((prev) => ({ ...prev, [peerId]: 'connecting' }));
  }, [createConnection, sendSignal, roomId, userId]);

  // Call ALL users in room (used when joining a room with existing users)
  const callAllUsers = useCallback(async (userList) => {
    for (const peerId of userList) {
      await callUser(peerId);
    }
  }, [callUser]);

  // Handle incoming offer
  const handleOffer = useCallback(async (msg) => {
    const peerId = msg.from;
    const pc = createConnection(peerId);

    await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
    await flushCandidates(peerId, pc);

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    sendSignal({
      type: 'answer',
      roomId,
      from: userId,
      to: peerId,
      data: { sdp: answer },
    });

    setPeerStates((prev) => ({ ...prev, [peerId]: 'connecting' }));
  }, [createConnection, sendSignal, roomId, userId]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (msg) => {
    const pc = connectionsRef.current[msg.from];
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
    await flushCandidates(msg.from, pc);
  }, []);

  // Handle incoming ICE candidate
  const handleCandidate = useCallback(async (msg) => {
    const peerId = msg.from;
    const candidate = new RTCIceCandidate(msg.data.candidate);
    const pc = connectionsRef.current[peerId];

    if (!pc || !pc.remoteDescription) {
      if (!pendingCandidatesRef.current[peerId]) {
        pendingCandidatesRef.current[peerId] = [];
      }
      pendingCandidatesRef.current[peerId].push(candidate);
      return;
    }

    await pc.addIceCandidate(candidate);
  }, []);

  // Handle user leaving
  const handleUserLeft = useCallback((peerId) => {
    const pc = connectionsRef.current[peerId];
    if (pc) {
      pc.close();
      delete connectionsRef.current[peerId];
    }
    delete pendingCandidatesRef.current[peerId];

    setRemoteStreams((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
    setPeerStates((prev) => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // Close all connections
  const closeAll = useCallback(() => {
    Object.values(connectionsRef.current).forEach((pc) => pc.close());
    connectionsRef.current = {};
    pendingCandidatesRef.current = {};
    setRemoteStreams({});
    setPeerStates({});
  }, []);

  // Flush buffered ICE candidates
  const flushCandidates = async (peerId, pc) => {
    const pending = pendingCandidatesRef.current[peerId] || [];
    while (pending.length > 0) {
      await pc.addIceCandidate(pending.shift());
    }
  };

  // Get a specific peer connection (for network quality)
  const getConnection = useCallback((peerId) => {
    return connectionsRef.current[peerId] || null;
  }, []);

  // Get all connections
  const getAllConnections = useCallback(() => {
    return { ...connectionsRef.current };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(connectionsRef.current).forEach((pc) => pc.close());
    };
  }, []);

  return {
    remoteStreams,
    peerStates,
    setLocalStream,
    callUser,
    callAllUsers,
    handleOffer,
    handleAnswer,
    handleCandidate,
    handleUserLeft,
    closeAll,
    getConnection,
    getAllConnections,
  };
}
