package com.example.webrtc.service;

import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class RoomService {

    private final Map<String, Set<String>> roomUsers = new ConcurrentHashMap<>();
    private final Map<String, String> userRooms = new ConcurrentHashMap<>();

    public void joinRoom(String roomId, String userId) {
        String previousRoomId = userRooms.put(userId, roomId);
        if (previousRoomId != null && !previousRoomId.equals(roomId)) {
            removeUserFromRoom(previousRoomId, userId);
        }

        roomUsers.computeIfAbsent(roomId, ignored -> ConcurrentHashMap.newKeySet())
                .add(userId);
    }

    public Set<String> getUsersInRoom(String roomId) {
        if (roomId == null) {
            return Collections.emptySet();
        }

        Set<String> users = roomUsers.get(roomId);
        return users != null ? Collections.unmodifiableSet(users) : Collections.emptySet();
    }

    public Optional<String> getRoomByUser(String userId) {
        if (userId == null) {
            return Optional.empty();
        }

        return Optional.ofNullable(userRooms.get(userId));
    }

    public boolean isUserInRoom(String roomId, String userId) {
        if (roomId == null || userId == null) {
            return false;
        }

        Set<String> users = roomUsers.get(roomId);
        return users != null && users.contains(userId);
    }

    public void removeUser(String userId) {
        String roomId = userRooms.remove(userId);
        if (roomId != null) {
            removeUserFromRoom(roomId, userId);
        }
    }

    private void removeUserFromRoom(String roomId, String userId) {
        roomUsers.computeIfPresent(roomId, (key, users) -> {
            users.remove(userId);
            return users.isEmpty() ? null : users;
        });
    }
}
