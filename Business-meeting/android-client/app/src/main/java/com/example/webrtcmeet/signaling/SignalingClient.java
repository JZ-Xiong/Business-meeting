package com.example.webrtcmeet.signaling;

import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * WebSocket signaling client with auto-reconnect.
 * Handles all message routing to the SignalingListener callbacks.
 */
public class SignalingClient {
    private static final String TAG = "SignalingClient";

    private WebSocket webSocket;
    private final OkHttpClient client;
    private final Gson gson = new Gson();
    private final SignalingListener listener;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    private String serverUrl;
    private String roomId;
    private String userId;
    private int reconnectAttempt = 0;
    private boolean intentionalClose = false;

    public SignalingClient(SignalingListener listener) {
        this.listener = listener;
        this.client = new OkHttpClient.Builder()
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .pingInterval(30, TimeUnit.SECONDS)
                .build();
    }

    /**
     * Connect to the signaling server.
     * @param serverIp  LAN IP address of the server (e.g. "192.168.3.36")
     * @param roomId    Room to join
     * @param userId    Display name
     */
    public void connect(String serverIp, String roomId, String userId) {
        this.serverUrl = "ws://" + serverIp + ":8080/ws";
        this.roomId = roomId;
        this.userId = userId;
        this.intentionalClose = false;

        Log.i(TAG, "Connecting to " + serverUrl);

        Request request = new Request.Builder().url(serverUrl).build();
        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull WebSocket ws, @NonNull Response response) {
                Log.i(TAG, "WebSocket connected");
                reconnectAttempt = 0;
                sendJoin();
                mainHandler.post(listener::onConnected);
            }

            @Override
            public void onMessage(@NonNull WebSocket ws, @NonNull String text) {
                try {
                    SignalMessage msg = gson.fromJson(text, SignalMessage.class);
                    mainHandler.post(() -> handleMessage(msg));
                } catch (Exception e) {
                    Log.w(TAG, "Failed to parse message: " + text, e);
                }
            }

            @Override
            public void onClosed(@NonNull WebSocket ws, int code, @NonNull String reason) {
                Log.i(TAG, "WebSocket closed: " + reason);
                mainHandler.post(listener::onDisconnected);
                if (!intentionalClose) scheduleReconnect();
            }

            @Override
            public void onFailure(@NonNull WebSocket ws, @NonNull Throwable t, @Nullable Response response) {
                Log.e(TAG, "WebSocket failure: " + t.getMessage());
                mainHandler.post(listener::onDisconnected);
                if (!intentionalClose) scheduleReconnect();
            }
        });
    }

    @SuppressWarnings("unchecked")
    private void handleMessage(SignalMessage msg) {
        if (msg == null || msg.getType() == null) return;

        switch (msg.getType()) {
            case "room-users": {
                Map<String, Object> data = msg.getData();
                if (data != null && data.get("users") != null) {
                    List<String> users = gson.fromJson(
                            gson.toJson(data.get("users")),
                            new TypeToken<List<String>>(){}.getType());
                    listener.onRoomUsers(users);
                }
                break;
            }
            case "user-joined": {
                Map<String, Object> data = msg.getData();
                if (data != null) {
                    listener.onUserJoined((String) data.get("userId"));
                }
                break;
            }
            case "user-left": {
                Map<String, Object> data = msg.getData();
                if (data != null) {
                    listener.onUserLeft((String) data.get("userId"));
                }
                break;
            }
            case "offer":
                listener.onOffer(msg);
                break;
            case "answer":
                listener.onAnswer(msg);
                break;
            case "candidate":
                listener.onCandidate(msg);
                break;
            case "chat": {
                Map<String, Object> data = msg.getData();
                if (data != null) {
                    String text = (String) data.get("text");
                    long ts = data.get("timestamp") != null
                            ? ((Number) data.get("timestamp")).longValue()
                            : System.currentTimeMillis();
                    listener.onChatMessage(msg.getFrom(), text, ts);
                }
                break;
            }
            case "danmaku": {
                Map<String, Object> data = msg.getData();
                if (data != null) {
                    listener.onDanmaku(msg.getFrom(),
                            (String) data.get("content"),
                            (String) data.get("color"));
                }
                break;
            }
            default:
                Log.d(TAG, "Unhandled message type: " + msg.getType());
        }
    }

    // ── Send methods ────────────────────────────────────────────

    public void sendJoin() {
        send(new SignalMessage("join", roomId, userId, null, null));
    }

    public void sendLeave() {
        send(new SignalMessage("leave", roomId, userId, null, null));
    }

    public void sendChat(String text) {
        send(new SignalMessage("chat", roomId, userId, null, Map.of("text", text)));
    }

    public void sendOffer(String to, String sdp) {
        send(new SignalMessage("offer", roomId, userId, to, Map.of("sdp", sdp)));
    }

    public void sendAnswer(String to, String sdp) {
        send(new SignalMessage("answer", roomId, userId, to, Map.of("sdp", sdp)));
    }

    public void sendCandidate(String to, String sdpMid, int sdpMLineIndex, String candidate) {
        send(new SignalMessage("candidate", roomId, userId, to,
                Map.of("candidate", Map.of(
                        "sdpMid", sdpMid,
                        "sdpMLineIndex", sdpMLineIndex,
                        "candidate", candidate
                ))));
    }

    private void send(SignalMessage msg) {
        if (webSocket != null) {
            String json = gson.toJson(msg);
            webSocket.send(json);
        }
    }

    // ── Reconnection ────────────────────────────────────────────

    private void scheduleReconnect() {
        int delay = Math.min(1000 * (int) Math.pow(2, reconnectAttempt), 16000);
        reconnectAttempt++;
        Log.i(TAG, "Reconnecting in " + delay + "ms (attempt " + reconnectAttempt + ")");
        mainHandler.postDelayed(() -> {
            if (!intentionalClose) {
                connect(serverUrl.replace("ws://", "").replace(":8080/ws", ""), roomId, userId);
            }
        }, delay);
    }

    /**
     * Disconnect intentionally (no auto-reconnect).
     */
    public void disconnect() {
        intentionalClose = true;
        mainHandler.removeCallbacksAndMessages(null);
        if (webSocket != null) {
            try { sendLeave(); } catch (Exception ignored) {}
            webSocket.close(1000, "User left");
            webSocket = null;
        }
    }

    public String getUserId() { return userId; }
    public String getRoomId() { return roomId; }
}
