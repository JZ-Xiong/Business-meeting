package com.example.webrtcmeet.webrtc;

import android.content.Context;
import android.util.Log;

import org.webrtc.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Manages WebRTC PeerConnectionFactory, local media, and multi-peer Mesh connections.
 */
public class WebRTCClient {
    private static final String TAG = "WebRTCClient";

    public interface Callback {
        void onLocalStream(VideoTrack videoTrack);
        void onRemoteStream(String userId, VideoTrack videoTrack);
        void onRemoteStreamRemoved(String userId);
        void onIceCandidate(String targetUserId, IceCandidate candidate);
        void onOfferCreated(String targetUserId, SessionDescription sdp);
        void onAnswerCreated(String targetUserId, SessionDescription sdp);
    }

    private final Context context;
    private final Callback callback;
    private PeerConnectionFactory factory;
    private EglBase eglBase;

    // Local media
    private VideoCapturer videoCapturer;
    private VideoSource videoSource;
    private VideoTrack localVideoTrack;
    private AudioTrack localAudioTrack;
    private MediaStream localStream;
    private boolean isMicEnabled = true;
    private boolean isCameraEnabled = true;

    // Multi-peer connections
    private final Map<String, PeerConnection> peers = new ConcurrentHashMap<>();
    private final Map<String, List<IceCandidate>> pendingCandidates = new ConcurrentHashMap<>();

    private static final List<PeerConnection.IceServer> ICE_SERVERS = List.of(
            PeerConnection.IceServer.builder("stun:stun.l.google.com:19302").createIceServer()
    );

    public WebRTCClient(Context context, Callback callback) {
        this.context = context;
        this.callback = callback;
    }

    public EglBase getEglBase() {
        return eglBase;
    }

    /**
     * Initialize PeerConnectionFactory and local media capture.
     */
    public void init() {
        eglBase = EglBase.create();

        PeerConnectionFactory.InitializationOptions initOptions =
                PeerConnectionFactory.InitializationOptions.builder(context)
                        .setEnableInternalTracer(false)
                        .createInitializationOptions();
        PeerConnectionFactory.initialize(initOptions);

        PeerConnectionFactory.Options options = new PeerConnectionFactory.Options();
        factory = PeerConnectionFactory.builder()
                .setOptions(options)
                .setVideoDecoderFactory(new DefaultVideoDecoderFactory(eglBase.getEglBaseContext()))
                .setVideoEncoderFactory(new DefaultVideoEncoderFactory(
                        eglBase.getEglBaseContext(), true, true))
                .createPeerConnectionFactory();

        startLocalMedia();
    }

    private void startLocalMedia() {
        // Audio
        AudioSource audioSource = factory.createAudioSource(new MediaConstraints());
        localAudioTrack = factory.createAudioTrack("audio0", audioSource);
        localAudioTrack.setEnabled(true);

        // Video
        videoCapturer = createCameraCapturer();
        if (videoCapturer != null) {
            SurfaceTextureHelper surfaceHelper = SurfaceTextureHelper.create(
                    "CaptureThread", eglBase.getEglBaseContext());
            videoSource = factory.createVideoSource(videoCapturer.isScreencast());
            videoCapturer.initialize(surfaceHelper, context, videoSource.getCapturerObserver());
            videoCapturer.startCapture(640, 480, 30);

            localVideoTrack = factory.createVideoTrack("video0", videoSource);
            localVideoTrack.setEnabled(true);

            callback.onLocalStream(localVideoTrack);
        }

        // Create local MediaStream
        localStream = factory.createLocalMediaStream("localStream");
        localStream.addTrack(localAudioTrack);
        if (localVideoTrack != null) {
            localStream.addTrack(localVideoTrack);
        }
    }

    private VideoCapturer createCameraCapturer() {
        CameraEnumerator enumerator;
        if (Camera2Enumerator.isSupported(context)) {
            enumerator = new Camera2Enumerator(context);
        } else {
            enumerator = new Camera1Enumerator(false);
        }

        // Prefer front camera
        for (String deviceName : enumerator.getDeviceNames()) {
            if (enumerator.isFrontFacing(deviceName)) {
                VideoCapturer capturer = enumerator.createCapturer(deviceName, null);
                if (capturer != null) return capturer;
            }
        }
        // Fallback to any camera
        for (String deviceName : enumerator.getDeviceNames()) {
            VideoCapturer capturer = enumerator.createCapturer(deviceName, null);
            if (capturer != null) return capturer;
        }
        Log.e(TAG, "No camera found");
        return null;
    }

    // ── Peer Connection Management ──────────────────────────────

    /**
     * When we join a room that has existing users, call each of them.
     */
    public void callAllUsers(List<String> users) {
        for (String userId : users) {
            Log.i(TAG, "Calling user: " + userId);
            PeerConnection pc = getOrCreatePeer(userId);
            pc.createOffer(new SimpleSdpObserver() {
                @Override
                public void onCreateSuccess(SessionDescription sdp) {
                    pc.setLocalDescription(new SimpleSdpObserver(), sdp);
                    callback.onOfferCreated(userId, sdp);
                }
            }, new MediaConstraints());
        }
    }

    /**
     * Handle an incoming offer — create answer.
     */
    @SuppressWarnings("unchecked")
    public void handleOffer(String from, Map<String, Object> data) {
        String sdp = (String) data.get("sdp");
        if (sdp == null) return;

        PeerConnection pc = getOrCreatePeer(from);
        pc.setRemoteDescription(new SimpleSdpObserver(),
                new SessionDescription(SessionDescription.Type.OFFER, sdp));

        // Drain any pending ICE candidates
        drainPendingCandidates(from, pc);

        pc.createAnswer(new SimpleSdpObserver() {
            @Override
            public void onCreateSuccess(SessionDescription sdp) {
                pc.setLocalDescription(new SimpleSdpObserver(), sdp);
                callback.onAnswerCreated(from, sdp);
            }
        }, new MediaConstraints());
    }

    /**
     * Handle an incoming answer.
     */
    public void handleAnswer(String from, Map<String, Object> data) {
        String sdp = (String) data.get("sdp");
        if (sdp == null) return;

        PeerConnection pc = peers.get(from);
        if (pc != null) {
            pc.setRemoteDescription(new SimpleSdpObserver(),
                    new SessionDescription(SessionDescription.Type.ANSWER, sdp));
            drainPendingCandidates(from, pc);
        }
    }

    /**
     * Handle an incoming ICE candidate.
     */
    @SuppressWarnings("unchecked")
    public void handleCandidate(String from, Map<String, Object> data) {
        Object raw = data.get("candidate");
        if (raw == null) return;

        Map<String, Object> candidateMap;
        if (raw instanceof Map) {
            candidateMap = (Map<String, Object>) raw;
        } else {
            return;
        }

        String sdpMid = (String) candidateMap.get("sdpMid");
        int sdpMLineIndex = candidateMap.get("sdpMLineIndex") != null
                ? ((Number) candidateMap.get("sdpMLineIndex")).intValue() : 0;
        String candidateSdp = (String) candidateMap.get("candidate");
        if (candidateSdp == null) return;

        IceCandidate iceCandidate = new IceCandidate(sdpMid, sdpMLineIndex, candidateSdp);

        PeerConnection pc = peers.get(from);
        if (pc != null && pc.getRemoteDescription() != null) {
            pc.addIceCandidate(iceCandidate);
        } else {
            // Buffer until remote description is set
            pendingCandidates.computeIfAbsent(from, k -> new ArrayList<>()).add(iceCandidate);
        }
    }

    /**
     * Remove a user's peer connection when they leave.
     */
    public void handleUserLeft(String userId) {
        PeerConnection pc = peers.remove(userId);
        if (pc != null) {
            pc.close();
        }
        pendingCandidates.remove(userId);
        callback.onRemoteStreamRemoved(userId);
    }

    private PeerConnection getOrCreatePeer(String userId) {
        PeerConnection existing = peers.get(userId);
        if (existing != null) return existing;

        PeerConnection.RTCConfiguration config = new PeerConnection.RTCConfiguration(ICE_SERVERS);
        config.sdpSemantics = PeerConnection.SdpSemantics.UNIFIED_PLAN;

        PeerConnection pc = factory.createPeerConnection(config, new PeerConnection.Observer() {
            @Override
            public void onIceCandidate(IceCandidate candidate) {
                callback.onIceCandidate(userId, candidate);
            }

            @Override
            public void onAddStream(MediaStream stream) {
                Log.i(TAG, "Remote stream added from: " + userId);
                if (!stream.videoTracks.isEmpty()) {
                    VideoTrack remoteVideo = stream.videoTracks.get(0);
                    callback.onRemoteStream(userId, remoteVideo);
                }
            }

            @Override
            public void onRemoveStream(MediaStream stream) {
                callback.onRemoteStreamRemoved(userId);
            }

            @Override public void onSignalingChange(PeerConnection.SignalingState state) {}
            @Override public void onIceConnectionChange(PeerConnection.IceConnectionState state) {
                Log.d(TAG, "ICE connection " + userId + ": " + state);
            }
            @Override public void onIceConnectionReceivingChange(boolean receiving) {}
            @Override public void onIceGatheringChange(PeerConnection.IceGatheringState state) {}
            @Override public void onIceCandidatesRemoved(IceCandidate[] candidates) {}
            @Override public void onDataChannel(DataChannel dc) {}
            @Override public void onRenegotiationNeeded() {}
            @Override public void onAddTrack(RtpReceiver receiver, MediaStream[] streams) {}
        });

        if (pc != null) {
            pc.addStream(localStream);
            peers.put(userId, pc);
        }
        return pc;
    }

    private void drainPendingCandidates(String userId, PeerConnection pc) {
        List<IceCandidate> cached = pendingCandidates.remove(userId);
        if (cached != null) {
            for (IceCandidate c : cached) {
                pc.addIceCandidate(c);
            }
        }
    }

    // ── Media controls ──────────────────────────────────────────

    public void toggleMic() {
        isMicEnabled = !isMicEnabled;
        if (localAudioTrack != null) {
            localAudioTrack.setEnabled(isMicEnabled);
        }
    }

    public void toggleCamera() {
        isCameraEnabled = !isCameraEnabled;
        if (localVideoTrack != null) {
            localVideoTrack.setEnabled(isCameraEnabled);
        }
    }

    public boolean isMicEnabled()    { return isMicEnabled; }
    public boolean isCameraEnabled() { return isCameraEnabled; }

    // ── Cleanup ─────────────────────────────────────────────────

    public void closeAll() {
        for (PeerConnection pc : peers.values()) {
            try { pc.close(); } catch (Exception ignored) {}
        }
        peers.clear();
        pendingCandidates.clear();
    }

    public void dispose() {
        closeAll();

        if (videoCapturer != null) {
            try { videoCapturer.stopCapture(); } catch (Exception ignored) {}
            videoCapturer.dispose();
        }
        if (videoSource != null) videoSource.dispose();
        if (localVideoTrack != null) localVideoTrack.dispose();
        if (localAudioTrack != null) localAudioTrack.dispose();
        if (factory != null) factory.dispose();
        if (eglBase != null) eglBase.release();
    }

    /**
     * Minimal SDP observer — override only what you need.
     */
    private static class SimpleSdpObserver implements SdpObserver {
        @Override public void onCreateSuccess(SessionDescription sdp) {}
        @Override public void onSetSuccess() {}
        @Override public void onCreateFailure(String error) {
            Log.e(TAG, "SDP create failed: " + error);
        }
        @Override public void onSetFailure(String error) {
            Log.e(TAG, "SDP set failed: " + error);
        }
    }
}
