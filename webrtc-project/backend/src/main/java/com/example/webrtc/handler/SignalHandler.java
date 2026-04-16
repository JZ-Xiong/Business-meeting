package com.example.webrtc.handler;

import com.example.webrtc.model.SignalMessage;
import com.example.webrtc.service.RoomService;
import com.example.webrtc.service.UserService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class SignalHandler extends TextWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(SignalHandler.class);

    private final ObjectMapper objectMapper;
    private final RoomService roomService;
    private final UserService userService;

    public SignalHandler(ObjectMapper objectMapper, RoomService roomService, UserService userService) {
        this.objectMapper = objectMapper;
        this.roomService = roomService;
        this.userService = userService;
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        cleanupSession(session);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        log.warn("Transport error for session {}: {}", session.getId(), exception.getMessage());
        cleanupSession(session);
        if (session.isOpen()) {
            session.close(CloseStatus.SERVER_ERROR);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        final SignalMessage signalMessage;

        try {
            signalMessage = objectMapper.readValue(message.getPayload(), SignalMessage.class);
        } catch (JsonProcessingException exception) {
            sendError(session, "Invalid JSON payload.");
            return;
        }

        if (!hasText(signalMessage.getType())) {
            sendError(session, "Message type is required.");
            return;
        }

        switch (signalMessage.getType()) {
            case "join" -> handleJoin(session, signalMessage);
            case "leave" -> handleLeave(session, signalMessage);
            case "chat" -> handleChat(session, signalMessage);
            case "offer", "answer", "candidate" -> handleRelay(session, signalMessage);
            default -> sendError(session, "Unsupported message type: " + signalMessage.getType());
        }
    }

    private void handleJoin(WebSocketSession session, SignalMessage message) throws IOException {
        if (!hasText(message.getRoomId()) || !hasText(message.getFrom())) {
            sendError(session, "Join requires roomId and from.");
            return;
        }

        String userId = message.getFrom();
        String roomId = message.getRoomId();

        // Clean up previous state for this session if it was registered under a different userId.
        String previousUserId = userService.getUserIdBySession(session);
        if (hasText(previousUserId) && !previousUserId.equals(userId)) {
            roomService.removeUser(previousUserId);
        }

        userService.register(userId, session);
        roomService.joinRoom(roomId, userId);

        // Send current room user list to the joining user.
        Set<String> usersInRoom = roomService.getUsersInRoom(roomId);
        List<String> otherUsers = usersInRoom.stream()
                .filter(u -> !u.equals(userId))
                .toList();

        sendToUser(userId, buildMessage("room-users", roomId, null, null,
                Map.of("users", otherUsers)));

        // Broadcast user-joined to everyone else in the room.
        broadcastToRoom(roomId, userId, buildMessage("user-joined", roomId, null, null,
                Map.of("userId", userId)));

        log.info("User '{}' joined room '{}'  (room size: {})", userId, roomId, usersInRoom.size());
    }

    private void handleLeave(WebSocketSession session, SignalMessage message) throws IOException {
        String userId = message.getFrom();
        if (!hasText(userId)) {
            userId = userService.getUserIdBySession(session);
        }

        if (!hasText(userId)) {
            return;
        }

        String roomId = roomService.getRoomByUser(userId).orElse(null);
        roomService.removeUser(userId);

        if (hasText(roomId)) {
            broadcastToRoom(roomId, userId, buildMessage("user-left", roomId, null, null,
                    Map.of("userId", userId)));
            log.info("User '{}' explicitly left room '{}'", userId, roomId);
        }
    }

    private void handleChat(WebSocketSession session, SignalMessage message) throws IOException {
        if (!hasText(message.getRoomId()) || !hasText(message.getFrom())) {
            sendError(session, "Chat requires roomId and from.");
            return;
        }

        if (message.getData() == null || !message.getData().containsKey("text")) {
            sendError(session, "Chat requires data.text.");
            return;
        }

        if (!roomService.isUserInRoom(message.getRoomId(), message.getFrom())) {
            sendError(session, "Sender has not joined the room.");
            return;
        }

        // Broadcast chat to ALL users in the room (including sender for confirmation).
        SignalMessage chatMsg = buildMessage("chat", message.getRoomId(), message.getFrom(), null,
                Map.of("text", message.getData().get("text"),
                       "timestamp", System.currentTimeMillis()));
        broadcastToRoom(message.getRoomId(), null, chatMsg);
    }

    private void handleRelay(WebSocketSession session, SignalMessage message) throws IOException {
        if (!hasText(message.getRoomId()) || !hasText(message.getFrom()) || !hasText(message.getTo())) {
            sendError(session, message.getType() + " requires roomId, from, and to.");
            return;
        }

        if (message.getData() == null || message.getData().isEmpty()) {
            sendError(session, message.getType() + " requires a data object.");
            return;
        }

        if (!roomService.isUserInRoom(message.getRoomId(), message.getFrom())) {
            sendError(session, "Sender has not joined the room.");
            return;
        }

        if (!roomService.isUserInRoom(message.getRoomId(), message.getTo())) {
            sendError(session, "Target user is not in the room.");
            return;
        }

        WebSocketSession targetSession = userService.getSession(message.getTo()).orElse(null);
        if (targetSession == null || !targetSession.isOpen()) {
            sendError(session, "Target user is not connected.");
            return;
        }

        try {
            targetSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
        } catch (IOException e) {
            log.warn("Failed to relay {} to '{}': {}", message.getType(), message.getTo(), e.getMessage());
            sendError(session, "Failed to deliver message to target user.");
        }
    }

    private void cleanupSession(WebSocketSession session) {
        String userId = userService.removeSession(session);
        if (!hasText(userId)) {
            return;
        }

        // Determine the room before removing the user so we can broadcast.
        String roomId = roomService.getRoomByUser(userId).orElse(null);
        roomService.removeUser(userId);

        if (hasText(roomId)) {
            broadcastToRoom(roomId, null, buildMessage("user-left", roomId, null, null,
                    Map.of("userId", userId)));
            log.info("User '{}' left room '{}'", userId, roomId);
        }
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void broadcastToRoom(String roomId, String excludeUserId, SignalMessage message) {
        Set<String> users = roomService.getUsersInRoom(roomId);

        for (String uid : users) {
            if (uid.equals(excludeUserId)) {
                continue;
            }
            sendToUser(uid, message);
        }
    }

    private void sendToUser(String userId, SignalMessage message) {
        userService.getSession(userId).ifPresent(session -> {
            if (!session.isOpen()) {
                return;
            }

            try {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(message)));
            } catch (IOException e) {
                log.warn("Failed to send message to '{}': {}", userId, e.getMessage());
            }
        });
    }

    private SignalMessage buildMessage(String type, String roomId, String from, String to,
                                       Map<String, Object> data) {
        SignalMessage msg = new SignalMessage();
        msg.setType(type);
        msg.setRoomId(roomId);
        msg.setFrom(from);
        msg.setTo(to);
        msg.setData(data);
        return msg;
    }

    private void sendError(WebSocketSession session, String errorMessage) throws IOException {
        if (!session.isOpen()) {
            return;
        }

        SignalMessage error = new SignalMessage();
        error.setType("error");
        error.setData(Map.of("message", errorMessage));
        session.sendMessage(new TextMessage(objectMapper.writeValueAsString(error)));
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
