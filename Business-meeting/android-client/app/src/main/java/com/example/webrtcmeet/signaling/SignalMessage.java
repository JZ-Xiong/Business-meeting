package com.example.webrtcmeet.signaling;

import java.util.Map;

/**
 * WebSocket signaling message model.
 * Must match the backend SignalMessage format exactly.
 */
public class SignalMessage {
    private String type;
    private String roomId;
    private String from;
    private String to;
    private Map<String, Object> data;

    public SignalMessage() {}

    public SignalMessage(String type, String roomId, String from, String to, Map<String, Object> data) {
        this.type = type;
        this.roomId = roomId;
        this.from = from;
        this.to = to;
        this.data = data;
    }

    public String getType()   { return type; }
    public String getRoomId() { return roomId; }
    public String getFrom()   { return from; }
    public String getTo()     { return to; }
    public Map<String, Object> getData() { return data; }

    public void setType(String type)     { this.type = type; }
    public void setRoomId(String roomId) { this.roomId = roomId; }
    public void setFrom(String from)     { this.from = from; }
    public void setTo(String to)         { this.to = to; }
    public void setData(Map<String, Object> data) { this.data = data; }
}
