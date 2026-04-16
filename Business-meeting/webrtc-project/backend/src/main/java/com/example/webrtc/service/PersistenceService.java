package com.example.webrtc.service;

import com.example.webrtc.entity.ChatMessage;
import com.example.webrtc.entity.ChatRoom;
import com.example.webrtc.entity.ChatUser;
import com.example.webrtc.repository.MessageRepository;
import com.example.webrtc.repository.RoomRepository;
import com.example.webrtc.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Async persistence layer — DB writes never block the signaling path.
 */
@Service
public class PersistenceService {

    private static final Logger log = LoggerFactory.getLogger(PersistenceService.class);

    private final MessageRepository messageRepo;
    private final RoomRepository roomRepo;
    private final UserRepository userRepo;

    public PersistenceService(MessageRepository messageRepo, RoomRepository roomRepo, UserRepository userRepo) {
        this.messageRepo = messageRepo;
        this.roomRepo = roomRepo;
        this.userRepo = userRepo;
    }

    /** Persist a chat or danmaku message asynchronously. */
    @Async
    public void saveMessage(String roomId, String userId, String type, String content) {
        try {
            messageRepo.save(new ChatMessage(roomId, userId, type, content));
        } catch (Exception e) {
            log.warn("Failed to persist message (room={}, user={}, type={}): {}", roomId, userId, type, e.getMessage());
        }
    }

    /** Persist a system event (join/leave) asynchronously. */
    @Async
    public void saveSystemEvent(String roomId, String userId, String event) {
        try {
            messageRepo.save(new ChatMessage(roomId, userId, "system", event));
        } catch (Exception e) {
            log.warn("Failed to persist system event: {}", e.getMessage());
        }
    }

    /** Ensure a user record exists. */
    @Async
    public void ensureUser(String name) {
        try {
            if (!userRepo.existsByName(name)) {
                userRepo.save(new ChatUser(name));
            }
        } catch (Exception e) {
            log.warn("Failed to ensure user '{}': {}", name, e.getMessage());
        }
    }

    /** Ensure a room record exists. */
    @Async
    public void ensureRoom(String roomId) {
        try {
            if (!roomRepo.existsById(roomId)) {
                roomRepo.save(new ChatRoom(roomId));
            }
        } catch (Exception e) {
            log.warn("Failed to ensure room '{}': {}", roomId, e.getMessage());
        }
    }
}
