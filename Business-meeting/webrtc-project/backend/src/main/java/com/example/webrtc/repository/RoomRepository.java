package com.example.webrtc.repository;

import com.example.webrtc.entity.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<ChatRoom, String> {
}
