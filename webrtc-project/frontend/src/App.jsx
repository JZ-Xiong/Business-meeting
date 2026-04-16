import { useState, useCallback, useRef, useEffect } from 'react';
import JoinScreen from './components/JoinScreen';
import TopBar from './components/TopBar';
import VideoGrid from './components/VideoGrid';
import ControlBar from './components/ControlBar';
import Sidebar from './components/Sidebar';
import StatusToast from './components/StatusToast';
import useLocalStream from './hooks/useLocalStream';
import useWebSocket from './hooks/useWebSocket';
import useMultiPeerConnection from './hooks/useMultiPeerConnection';
import useActiveSpeaker from './hooks/useActiveSpeaker';

export default function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userId, setUserId] = useState('');
  const [sidebarTab, setSidebarTab] = useState(null); // null | 'chat' | 'participants'
  const [unreadChat, setUnreadChat] = useState(0);

  const localStreamHook = useLocalStream();
  const wsHook = useWebSocket();

  const pcHookRef = useRef(null);
  const localStreamRef = useRef(null);

  useEffect(() => {
    localStreamRef.current = localStreamHook.localStream;
  }, [localStreamHook.localStream]);

  const pcHook = useMultiPeerConnection({
    sendSignal: wsHook.sendSignal,
    roomId,
    userId,
  });
  pcHookRef.current = pcHook;

  // Keep multi-peer hook aware of local stream
  useEffect(() => {
    pcHook.setLocalStream(localStreamHook.localStream);
  }, [localStreamHook.localStream, pcHook.setLocalStream]);

  // Active speaker detection
  const { activeSpeaker, speakingUsers } = useActiveSpeaker(
    localStreamHook.localStream,
    pcHook.remoteStreams,
    userId
  );

  // Track unread chat messages when sidebar is not showing chat
  useEffect(() => {
    if (sidebarTab !== 'chat' && wsHook.chatMessages.length > 0) {
      setUnreadChat((prev) => prev + 1);
    }
  }, [wsHook.chatMessages.length]);

  // WebSocket handlers
  const getHandlers = useCallback(() => ({
    onRoomUsers: (users) => {
      // When joining a room with existing users, call them all
      if (users.length > 0) {
        setTimeout(() => {
          pcHookRef.current?.callAllUsers(users);
        }, 500);
      }
    },
    onUserJoined: (uid) => {
      // New user joined — they will send us an offer, we just wait
    },
    onUserLeft: (uid) => {
      pcHookRef.current?.handleUserLeft(uid);
    },
    onOffer: (msg) => {
      pcHookRef.current?.handleOffer(msg, localStreamRef.current);
    },
    onAnswer: (msg) => {
      pcHookRef.current?.handleAnswer(msg);
    },
    onCandidate: (msg) => {
      pcHookRef.current?.handleCandidate(msg);
    },
  }), []);

  // Join
  const handleJoin = useCallback(async (rid, uid) => {
    setRoomId(rid);
    setUserId(uid);
    await localStreamHook.startMedia();
    wsHook.connect(rid, uid, getHandlers());
    setJoined(true);
  }, [localStreamHook, wsHook, getHandlers]);

  // Leave
  const handleLeave = useCallback(() => {
    wsHook.sendLeave();
    pcHook.closeAll();
    localStreamHook.stopMedia();
    wsHook.disconnect();
    setJoined(false);
    setRoomId('');
    setUserId('');
    setSidebarTab(null);
    setUnreadChat(0);
  }, [pcHook, localStreamHook, wsHook]);

  // Screen share needs all peer connections for track replacement
  const handleToggleScreenShare = useCallback(() => {
    localStreamHook.toggleScreenShare(null); // simplified — doesn't replace tracks on existing PCs yet
  }, [localStreamHook]);

  // Sidebar toggles
  const toggleChat = useCallback(() => {
    setSidebarTab((prev) => prev === 'chat' ? null : 'chat');
    if (sidebarTab !== 'chat') setUnreadChat(0);
  }, [sidebarTab]);

  const toggleParticipants = useCallback(() => {
    setSidebarTab((prev) => prev === 'participants' ? null : 'participants');
  }, []);

  // Pre-join screen
  if (!joined) {
    return (
      <>
        <JoinScreen onJoin={handleJoin} />
        <StatusToast toasts={wsHook.toasts} />
      </>
    );
  }

  // Meeting layout: TopBar | VideoGrid + Sidebar | ControlBar
  return (
    <div className="flex flex-col h-full w-full bg-surface-900">
      {/* Top bar */}
      <TopBar
        roomId={roomId}
        userId={userId}
        isConnected={wsHook.isConnected}
        participantCount={wsHook.roomUsers.length + 1}
      />

      {/* Main area: video grid + optional sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Video grid area */}
        <div className="flex-1 min-w-0 relative">
          <VideoGrid
            localStream={localStreamHook.localStream}
            remoteStreams={pcHook.remoteStreams}
            userId={userId}
            isMicOn={localStreamHook.isMicOn}
            isCameraOn={localStreamHook.isCameraOn}
            activeSpeaker={activeSpeaker}
            speakingUsers={speakingUsers}
            roomUsers={wsHook.roomUsers}
          />
        </div>

        {/* Sidebar */}
        <Sidebar
          activeTab={sidebarTab}
          onClose={() => setSidebarTab(null)}
          chatMessages={wsHook.chatMessages}
          userId={userId}
          onSendMessage={wsHook.sendChat}
          roomUsers={wsHook.roomUsers}
          speakingUsers={speakingUsers}
          peerStates={pcHook.peerStates}
          unreadCount={unreadChat}
        />
      </div>

      {/* Control bar */}
      <ControlBar
        isMicOn={localStreamHook.isMicOn}
        isCameraOn={localStreamHook.isCameraOn}
        isScreenSharing={localStreamHook.isScreenSharing}
        isBlurOn={localStreamHook.isBlurOn}
        onToggleMic={localStreamHook.toggleMic}
        onToggleCamera={localStreamHook.toggleCamera}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleBlur={localStreamHook.toggleBlur}
        onHangUp={handleLeave}
        onToggleChat={toggleChat}
        onToggleParticipants={toggleParticipants}
        isChatOpen={sidebarTab === 'chat'}
        isParticipantsOpen={sidebarTab === 'participants'}
        unreadChatCount={unreadChat}
      />

      {/* Toasts */}
      <StatusToast toasts={wsHook.toasts} />
    </div>
  );
}
