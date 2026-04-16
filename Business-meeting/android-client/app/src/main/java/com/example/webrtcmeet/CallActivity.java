package com.example.webrtcmeet;

import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.view.inputmethod.EditorInfo;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.example.webrtcmeet.signaling.SignalMessage;
import com.example.webrtcmeet.signaling.SignalingClient;
import com.example.webrtcmeet.signaling.SignalingListener;
import com.example.webrtcmeet.webrtc.WebRTCClient;

import org.webrtc.IceCandidate;
import org.webrtc.SessionDescription;
import org.webrtc.SurfaceViewRenderer;
import org.webrtc.VideoTrack;

import java.util.List;

/**
 * Main call activity — handles video rendering, WebRTC connections, chat, and controls.
 */
public class CallActivity extends AppCompatActivity implements SignalingListener, WebRTCClient.Callback {
    private static final String TAG = "CallActivity";

    private SignalingClient signalingClient;
    private WebRTCClient webRTCClient;
    private String userId;

    // UI
    private SurfaceViewRenderer localVideoView;
    private SurfaceViewRenderer remoteVideoView;
    private TextView tvRemotePlaceholder;
    private TextView tvRoomInfo;
    private TextView tvParticipantCount;
    private View viewConnectionDot;
    private LinearLayout chatContainer;
    private RecyclerView rvChatMessages;
    private EditText etChatInput;
    private ImageButton btnMic, btnCamera, btnChat, btnHangUp;

    private ChatAdapter chatAdapter;
    private boolean isChatVisible = false;
    private int participantCount = 1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_call);

        String serverIp = getIntent().getStringExtra("serverIp");
        String roomId   = getIntent().getStringExtra("roomId");
        userId           = getIntent().getStringExtra("userName");

        initViews();
        initChat();
        initControls();

        // Show room info
        tvRoomInfo.setText(roomId + " • " + userId);

        // Initialize WebRTC
        webRTCClient = new WebRTCClient(this, this);
        webRTCClient.init();

        // Initialize video renderers AFTER WebRTC init (needs EglBase)
        localVideoView.init(webRTCClient.getEglBase().getEglBaseContext(), null);
        localVideoView.setMirror(true);
        localVideoView.setZOrderMediaOverlay(true);

        remoteVideoView.init(webRTCClient.getEglBase().getEglBaseContext(), null);

        // Connect signaling
        signalingClient = new SignalingClient(this);
        signalingClient.connect(serverIp, roomId, userId);
    }

    private void initViews() {
        localVideoView     = findViewById(R.id.localVideoView);
        remoteVideoView    = findViewById(R.id.remoteVideoView);
        tvRemotePlaceholder = findViewById(R.id.tvRemotePlaceholder);
        tvRoomInfo         = findViewById(R.id.tvRoomInfo);
        tvParticipantCount = findViewById(R.id.tvParticipantCount);
        viewConnectionDot  = findViewById(R.id.viewConnectionDot);
        chatContainer      = findViewById(R.id.chatContainer);
        rvChatMessages     = findViewById(R.id.rvChatMessages);
        etChatInput        = findViewById(R.id.etChatInput);
        btnMic             = findViewById(R.id.btnMic);
        btnCamera          = findViewById(R.id.btnCamera);
        btnChat            = findViewById(R.id.btnChat);
        btnHangUp          = findViewById(R.id.btnHangUp);
    }

    private void initChat() {
        chatAdapter = new ChatAdapter();
        rvChatMessages.setLayoutManager(new LinearLayoutManager(this));
        rvChatMessages.setAdapter(chatAdapter);

        // Send chat on Enter or send button
        etChatInput.setOnEditorActionListener((v, actionId, event) -> {
            if (actionId == EditorInfo.IME_ACTION_SEND) {
                sendChatMessage();
                return true;
            }
            return false;
        });

        findViewById(R.id.btnSendChat).setOnClickListener(v -> sendChatMessage());
        findViewById(R.id.btnCloseChat).setOnClickListener(v -> toggleChat());
    }

    private void initControls() {
        btnMic.setOnClickListener(v -> {
            webRTCClient.toggleMic();
            btnMic.setBackgroundResource(webRTCClient.isMicEnabled()
                    ? R.drawable.btn_control_bg : R.drawable.btn_control_off_bg);
        });

        btnCamera.setOnClickListener(v -> {
            webRTCClient.toggleCamera();
            btnCamera.setBackgroundResource(webRTCClient.isCameraEnabled()
                    ? R.drawable.btn_control_bg : R.drawable.btn_control_off_bg);
        });

        btnChat.setOnClickListener(v -> toggleChat());

        btnHangUp.setOnClickListener(v -> hangUp());
    }

    private void toggleChat() {
        isChatVisible = !isChatVisible;
        chatContainer.setVisibility(isChatVisible ? View.VISIBLE : View.GONE);
    }

    private void sendChatMessage() {
        String text = etChatInput.getText().toString().trim();
        if (text.isEmpty()) return;

        signalingClient.sendChat(text);
        chatAdapter.addMessage(new ChatAdapter.ChatItem(userId, text, System.currentTimeMillis(), true));
        rvChatMessages.scrollToPosition(chatAdapter.getItemCount() - 1);
        etChatInput.setText("");
    }

    private void hangUp() {
        signalingClient.disconnect();
        webRTCClient.closeAll();
        webRTCClient.dispose();
        finish();
    }

    private void updateParticipantCount(int count) {
        participantCount = count;
        tvParticipantCount.setText(count + " participant" + (count > 1 ? "s" : ""));
    }

    // ── SignalingListener callbacks ─────────────────────────────

    @Override
    public void onConnected() {
        viewConnectionDot.setBackgroundColor(0xFF22C55E); // green
        Toast.makeText(this, "Connected to server", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onDisconnected() {
        viewConnectionDot.setBackgroundColor(0xFFEF4444); // red
    }

    @Override
    public void onRoomUsers(List<String> users) {
        Log.i(TAG, "Room users: " + users);
        updateParticipantCount(users.size() + 1); // +1 for self
        if (!users.isEmpty()) {
            webRTCClient.callAllUsers(users);
        }
    }

    @Override
    public void onUserJoined(String uid) {
        Log.i(TAG, "User joined: " + uid);
        participantCount++;
        updateParticipantCount(participantCount);
        Toast.makeText(this, uid + " joined", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onUserLeft(String uid) {
        Log.i(TAG, "User left: " + uid);
        participantCount = Math.max(1, participantCount - 1);
        updateParticipantCount(participantCount);
        webRTCClient.handleUserLeft(uid);
        Toast.makeText(this, uid + " left", Toast.LENGTH_SHORT).show();
    }

    @Override
    public void onOffer(SignalMessage msg) {
        webRTCClient.handleOffer(msg.getFrom(), msg.getData());
    }

    @Override
    public void onAnswer(SignalMessage msg) {
        webRTCClient.handleAnswer(msg.getFrom(), msg.getData());
    }

    @Override
    public void onCandidate(SignalMessage msg) {
        webRTCClient.handleCandidate(msg.getFrom(), msg.getData());
    }

    @Override
    public void onChatMessage(String from, String text, long timestamp) {
        if (!from.equals(userId)) { // Don't duplicate own messages
            chatAdapter.addMessage(new ChatAdapter.ChatItem(from, text, timestamp, false));
            rvChatMessages.scrollToPosition(chatAdapter.getItemCount() - 1);
        }
    }

    @Override
    public void onDanmaku(String from, String content, String color) {
        // TODO: Implement danmaku overlay for Android
        Log.d(TAG, "Danmaku from " + from + ": " + content);
    }

    // ── WebRTCClient.Callback ───────────────────────────────────

    @Override
    public void onLocalStream(VideoTrack videoTrack) {
        runOnUiThread(() -> videoTrack.addSink(localVideoView));
    }

    @Override
    public void onRemoteStream(String uid, VideoTrack videoTrack) {
        runOnUiThread(() -> {
            tvRemotePlaceholder.setVisibility(View.GONE);
            videoTrack.addSink(remoteVideoView);
        });
    }

    @Override
    public void onRemoteStreamRemoved(String uid) {
        runOnUiThread(() -> {
            if (participantCount <= 1) {
                tvRemotePlaceholder.setVisibility(View.VISIBLE);
            }
        });
    }

    @Override
    public void onIceCandidate(String targetUserId, IceCandidate candidate) {
        signalingClient.sendCandidate(targetUserId,
                candidate.sdpMid, candidate.sdpMLineIndex, candidate.sdp);
    }

    @Override
    public void onOfferCreated(String targetUserId, SessionDescription sdp) {
        signalingClient.sendOffer(targetUserId, sdp.description);
    }

    @Override
    public void onAnswerCreated(String targetUserId, SessionDescription sdp) {
        signalingClient.sendAnswer(targetUserId, sdp.description);
    }

    // ── Lifecycle ───────────────────────────────────────────────

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (signalingClient != null) signalingClient.disconnect();
        if (webRTCClient != null) webRTCClient.dispose();
        if (localVideoView != null) localVideoView.release();
        if (remoteVideoView != null) remoteVideoView.release();
    }

    @Override
    public void onBackPressed() {
        hangUp();
    }
}
