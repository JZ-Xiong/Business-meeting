package com.example.webrtc.repository;

import com.example.webrtc.entity.ChatUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<ChatUser, Long> {
    Optional<ChatUser> findByName(String name);
    boolean existsByName(String name);
}
