package com.example.webrtcmeet.signaling;

import java.util.List;

/**
 * Callback interface for signaling events.
 * All methods are called on the main thread.
 */
public interface SignalingListener {
    void onConnected();
    void onDisconnected();
    void onRoomUsers(List<String> users);
    void onUserJoined(String userId);
    void onUserLeft(String userId);
    void onOffer(SignalMessage msg);
    void onAnswer(SignalMessage msg);
    void onCandidate(SignalMessage msg);
    void onChatMessage(String from, String text, long timestamp);
    void onDanmaku(String from, String content, String color);
}
