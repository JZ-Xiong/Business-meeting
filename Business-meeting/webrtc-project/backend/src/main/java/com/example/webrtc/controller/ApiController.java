package com.example.webrtc.controller;

import com.example.webrtc.entity.ChatMessage;
import com.example.webrtc.entity.ChatUser;
import com.example.webrtc.repository.MessageRepository;
import com.example.webrtc.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {

    private final MessageRepository messageRepo;
    private final UserRepository userRepo;

    public ApiController(MessageRepository messageRepo, UserRepository userRepo) {
        this.messageRepo = messageRepo;
        this.userRepo = userRepo;
    }

    /**
     * GET /api/history?roomId=xxx&type=chat&limit=50
     * Returns message history for a room, newest first.
     */
    @GetMapping("/history")
    public ResponseEntity<List<ChatMessage>> getHistory(
            @RequestParam String roomId,
            @RequestParam(required = false) String type,
            @RequestParam(defaultValue = "50") int limit) {

        List<ChatMessage> messages;
        PageRequest page = PageRequest.of(0, Math.min(limit, 200));

        if (type != null && !type.isBlank()) {
            messages = messageRepo.findByRoomIdAndTypeOrderByTimestampDesc(roomId, type, page);
        } else {
            messages = messageRepo.findByRoomIdOrderByTimestampDesc(roomId, page);
        }

        // Return in chronological order
        Collections.reverse(messages);
        return ResponseEntity.ok(messages);
    }

    /**
     * POST /api/user  body: { "name": "Alice" }
     * Create or retrieve a user.
     */
    @PostMapping("/user")
    public ResponseEntity<ChatUser> createUser(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().build();
        }

        ChatUser user = userRepo.findByName(name)
                .orElseGet(() -> userRepo.save(new ChatUser(name)));
        return ResponseEntity.ok(user);
    }

    /**
     * GET /api/rooms/:roomId/messages?limit=100
     * Alias for history endpoint.
     */
    @GetMapping("/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatMessage>> getRoomMessages(
            @PathVariable String roomId,
            @RequestParam(defaultValue = "100") int limit) {

        List<ChatMessage> messages = messageRepo.findByRoomIdOrderByTimestampDesc(roomId, PageRequest.of(0, Math.min(limit, 200)));
        Collections.reverse(messages);
        return ResponseEntity.ok(messages);
    }
}
