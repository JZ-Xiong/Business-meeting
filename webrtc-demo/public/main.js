const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');

const ws = new WebSocket(`ws://${location.hostname}:8080/ws`);
let pc = new RTCPeerConnection({
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
});

// 1️⃣ 获取本地视频
navigator.mediaDevices.getUserMedia({ video: true, audio: true })
.then(stream => {
    localVideo.srcObject = stream;
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
});

// 2️⃣ 接收远程视频
pc.ontrack = event => {
    remoteVideo.srcObject = event.streams[0];
};

// 3️⃣ ICE 交换
pc.onicecandidate = event => {
    if (event.candidate) {
        ws.send(JSON.stringify({
            type: 'candidate',
            candidate: event.candidate
        }));
    }
};

// 4️⃣ WebSocket 接收信令
ws.onmessage = async (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'offer') {
        await pc.setRemoteDescription(data.offer);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        ws.send(JSON.stringify({
            type: 'answer',
            answer: answer
        }));
    }

    if (data.type === 'answer') {
        await pc.setRemoteDescription(data.answer);
    }

    if (data.type === 'candidate') {
        await pc.addIceCandidate(data.candidate);
    }
};

// 5️⃣ 发起通话
async function startCall() {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    ws.send(JSON.stringify({
        type: 'offer',
        offer: offer
    }));
}