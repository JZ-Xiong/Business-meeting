package com.example.webrtc.repository;

import com.example.webrtc.entity.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface MessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByRoomIdOrderByTimestampDesc(String roomId, Pageable pageable);
    List<ChatMessage> findByRoomIdAndTypeOrderByTimestampDesc(String roomId, String type, Pageable pageable);
}
