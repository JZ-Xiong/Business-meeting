package com.example.webrtc.service;

import org.springframework.stereotype.Service;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class UserService {

    private final Map<String, WebSocketSession> sessionsByUserId = new ConcurrentHashMap<>();
    private final Map<String, String> userIdsBySessionId = new ConcurrentHashMap<>();

    public synchronized String register(String userId, WebSocketSession session) {
        String existingUserId = userIdsBySessionId.get(session.getId());
        if (existingUserId != null && !existingUserId.equals(userId)) {
            sessionsByUserId.remove(existingUserId);
        }

        WebSocketSession previousSession = sessionsByUserId.put(userId, session);
        userIdsBySessionId.put(session.getId(), userId);

        if (previousSession != null && !previousSession.getId().equals(session.getId())) {
            userIdsBySessionId.remove(previousSession.getId());
            closeQuietly(previousSession);
        }

        return existingUserId;
    }

    public Optional<WebSocketSession> getSession(String userId) {
        return Optional.ofNullable(sessionsByUserId.get(userId));
    }

    public String getUserIdBySession(WebSocketSession session) {
        return userIdsBySessionId.get(session.getId());
    }

    public synchronized String removeSession(WebSocketSession session) {
        return removeSession(session.getId());
    }

    public synchronized String removeSession(String sessionId) {
        String userId = userIdsBySessionId.remove(sessionId);
        if (userId != null) {
            sessionsByUserId.computeIfPresent(userId, (key, existingSession) ->
                    existingSession.getId().equals(sessionId) ? null : existingSession);
        }
        return userId;
    }

    private void closeQuietly(WebSocketSession session) {
        if (!session.isOpen()) {
            return;
        }

        try {
            session.close(CloseStatus.NORMAL);
        } catch (IOException ignored) {
            // Ignore cleanup failures while replacing duplicate user sessions.
        }
    }
}
