import { useState, useRef, useCallback, useEffect } from 'react';

const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 16000;

/**
 * WebSocket connection with auto-reconnect, room events, chat, and signaling.
 */
export default function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [danmakuMessages, setDanmakuMessages] = useState([]);
  const [toasts, setToasts] = useState([]);

  const socketRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const handlersRef = useRef({});
  const roomInfoRef = useRef({ roomId: '', userId: '' });

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const connect = useCallback((roomId, userId, handlers = {}) => {
    roomInfoRef.current = { roomId, userId };
    handlersRef.current = handlers;

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      sendJoin(socketRef.current, roomId, userId);
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.hostname || 'localhost';
    const ws = new WebSocket(`${protocol}://${host}:8080/ws`);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      sendJoin(ws, roomId, userId);
      addToast('Connected to server', 'success');
    };

    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      handleMessage(msg);
    };

    ws.onclose = () => {
      setIsConnected(false);
      scheduleReconnect();
    };

    ws.onerror = () => {};
  }, []);

  const handleMessage = useCallback((msg) => {
    const handlers = handlersRef.current;

    switch (msg.type) {
      case 'room-users':
        setRoomUsers(msg.data?.users || []);
        if (handlers.onRoomUsers) handlers.onRoomUsers(msg.data.users);
        break;

      case 'user-joined': {
        const uid = msg.data?.userId;
        setRoomUsers((prev) => {
          if (!uid || prev.includes(uid)) return prev;
          return [...prev, uid];
        });
        addToast(`${uid} joined the meeting`, 'info');
        if (handlers.onUserJoined) handlers.onUserJoined(uid);
        break;
      }

      case 'user-left': {
        const leftId = msg.data?.userId;
        setRoomUsers((prev) => prev.filter((u) => u !== leftId));
        addToast(`${leftId} left the meeting`, 'warning');
        if (handlers.onUserLeft) handlers.onUserLeft(leftId);
        break;
      }

      case 'chat':
        setChatMessages((prev) => [...prev, {
          id: Date.now() + Math.random(),
          from: msg.from,
          text: msg.data?.text || '',
          timestamp: msg.data?.timestamp || Date.now(),
        }]);
        if (handlers.onChat) handlers.onChat(msg);
        break;

      case 'danmaku':
        setDanmakuMessages((prev) => [...prev.slice(-100), {
          id: Date.now() + Math.random(),
          from: msg.from,
          content: msg.data?.content || '',
          color: msg.data?.color || '#ffffff',
          timestamp: msg.data?.timestamp || Date.now(),
        }]);
        if (handlers.onDanmaku) handlers.onDanmaku(msg);
        break;

      case 'offer':
        if (handlers.onOffer) handlers.onOffer(msg);
        break;

      case 'answer':
        if (handlers.onAnswer) handlers.onAnswer(msg);
        break;

      case 'candidate':
        if (handlers.onCandidate) handlers.onCandidate(msg);
        break;

      case 'error':
        addToast(msg.data?.message || 'Server error', 'error');
        break;

      default:
        break;
    }
  }, [addToast]);

  const scheduleReconnect = useCallback(() => {
    const attempt = reconnectAttemptRef.current;
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, attempt), RECONNECT_MAX_DELAY);
    reconnectAttemptRef.current += 1;
    addToast(`Reconnecting in ${Math.round(delay / 1000)}s...`, 'warning');
    reconnectTimerRef.current = setTimeout(() => {
      const { roomId, userId } = roomInfoRef.current;
      if (roomId && userId) connect(roomId, userId, handlersRef.current);
    }, delay);
  }, [connect, addToast]);

  const sendJoin = (ws, roomId, userId) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify({ type: 'join', roomId, from: userId }));
  };

  const sendSignal = useCallback((message) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(JSON.stringify(message));
  }, []);

  const sendChat = useCallback((text) => {
    const { roomId, userId } = roomInfoRef.current;
    sendSignal({ type: 'chat', roomId, from: userId, data: { text } });
  }, [sendSignal]);

  const sendDanmaku = useCallback((content, color = '#ffffff') => {
    const { roomId, userId } = roomInfoRef.current;
    sendSignal({ type: 'danmaku', roomId, from: userId, data: { content, color } });
  }, [sendSignal]);

  const sendLeave = useCallback(() => {
    const { roomId, userId } = roomInfoRef.current;
    sendSignal({ type: 'leave', roomId, from: userId });
  }, [sendSignal]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
      socketRef.current = null;
    }
    setIsConnected(false);
    setRoomUsers([]);
    setChatMessages([]);
    setDanmakuMessages([]);
    reconnectAttemptRef.current = 0;
  }, []);

  useEffect(() => {
    return () => {
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    roomUsers,
    chatMessages,
    danmakuMessages,
    toasts,
    connect,
    disconnect,
    sendSignal,
    sendChat,
    sendDanmaku,
    sendLeave,
    addToast,
  };
}
