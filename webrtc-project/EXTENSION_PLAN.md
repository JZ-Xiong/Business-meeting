# WebRTC Meet — 扩展方案文档

## 📌 文档目的

本文档规划了 WebRTC Meet 从当前 MVP 版本到生产级视频会议系统的演进路径，分为三个阶段，涵盖架构升级、功能增强、性能优化和部署运维等方面。

---

## 一、架构演进路线

### 当前架构: Mesh 全连接

```
     Alice
    /     \
   /       \
  Bob ─── Charlie
```

* **优点**: 无中心节点, 延迟最低, 实现简单
* **缺点**: 每增加 1 人, 所有人都多一路连接 (O(n²)), 3-4 人后性能急剧下降
* **适用**: 1-4 人小型会议

### 阶段 2: SFU (Selective Forwarding Unit)

```
Alice ──┐
        │
Bob ────┼──── SFU Server ────┐
        │                    │
Charlie─┘                    │
                             ↓
                      按需转发 (不解码)
```

* **优点**: 每个客户端只需 1 路上行, 服务器按需转发
* **缺点**: 需要专用媒体服务器
* **适用**: 5-50 人会议
* **推荐方案**: [mediasoup](https://mediasoup.org/) (Node.js) 或 [Janus](https://janus.conf.meetecho.com/)

### 阶段 3: MCU (Multipoint Control Unit)

```
Alice ──┐
        │
Bob ────┼──── MCU Server ────── 混合输出
        │   (解码+混流+编码)
Charlie─┘
```

* **优点**: 客户端只接收 1 路混合流, 带宽最省
* **缺点**: 服务器计算量极大, 延迟增加
* **适用**: 50+ 人大型会议 / 直播
* **推荐方案**: [Kurento](https://www.kurento.org/) 或云服务 (如声网 Agora / Tencent RTC)

---

## 二、Phase 1 扩展 — UX 增强 (1-2 周)

### 1.1 视频质量自适应 (Simulcast)

**目标**: 根据网络状况自动调节视频分辨率

```javascript
// 发送端配置 Simulcast
const sender = pc.addTrack(videoTrack, stream);
const params = sender.getParameters();
params.encodings = [
  { rid: 'low', maxBitrate: 100000, scaleResolutionDownBy: 4 },
  { rid: 'mid', maxBitrate: 300000, scaleResolutionDownBy: 2 },
  { rid: 'high', maxBitrate: 900000 },
];
sender.setParameters(params);
```

**修改文件**: `useMultiPeerConnection.js`

### 1.2 虚拟背景 (TensorFlow.js)

**目标**: 替换当前 CSS blur 为 ML 驱动的真实背景模糊/替换

```bash
npm install @tensorflow/tfjs @tensorflow-models/body-segmentation
```

```javascript
import * as bodySegmentation from '@tensorflow-models/body-segmentation';

const segmenter = await bodySegmentation.createSegmenter(
  bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
  { runtime: 'tfjs' }
);

// 实时分割人体轮廓, 替换背景
```

**新增文件**: `hooks/useVirtualBackground.js`

### 1.3 屏幕共享增强

**目标**: 支持屏幕共享 + 摄像头同时显示

```javascript
// 获取屏幕流
const screenStream = await navigator.mediaDevices.getDisplayMedia({
  video: { cursor: 'always' },
  audio: true, // 系统音频
});

// 在 PeerConnection 中替换 video track
const senders = pc.getSenders();
const videoSender = senders.find(s => s.track?.kind === 'video');
videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
```

**修改文件**: `useLocalStream.js`, `useMultiPeerConnection.js`

### 1.4 会议录制

**目标**: 本地录制会议内容

```javascript
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 将多路视频绘制到 Canvas
// 使用 MediaRecorder 录制 Canvas 流
const recorder = new MediaRecorder(canvas.captureStream(30));
recorder.start();

// 停止后生成 Blob 下载
recorder.onstop = () => {
  const blob = new Blob(recorder.dataChunks, { type: 'video/webm' });
  const url = URL.createObjectURL(blob);
  // 提供下载链接
};
```

**新增文件**: `hooks/useRecording.js`

### 1.5 快捷键支持

| 快捷键 | 功能 |
|--------|------|
| `Alt + A` | 切换麦克风 |
| `Alt + V` | 切换摄像头 |
| `Alt + S` | 切换屏幕共享 |
| `Alt + C` | 切换聊天 |
| `Alt + P` | 切换参与者 |
| `Ctrl + D` | 离开会议 |

**新增文件**: `hooks/useShortcuts.js`

---

## 三、Phase 2 扩展 — 架构升级 (2-4 周)

### 2.1 SFU 媒体服务器集成

**推荐**: mediasoup

```
webrtc-project/
├── media-server/               # 新增
│   ├── package.json
│   └── src/
│       ├── server.js           # mediasoup Worker 管理
│       ├── Room.js             # 房间/Router 管理
│       └── Peer.js             # Producer/Consumer 管理
```

**架构变化**:
```
Frontend ──WebSocket──► Signaling Server (Spring Boot)
    │                          |
    └──WebRTC──────────► Media Server (mediasoup)
```

**前端改动**:
- `useMultiPeerConnection.js` → `useSfuConnection.js` (只有 1 个上行连接)
- 每路远程视频变成独立 Consumer

### 2.2 房间管理增强

**后端新增功能**:

| 功能 | 说明 |
|------|------|
| 房间密码 | 加入时验证密码 |
| 最大人数限制 | 超出后拒绝加入 |
| 房间锁定 | 主持人可锁定房间 |
| 踢出用户 | 主持人可移除参与者 |
| 等候室 | 需要主持人批准进入 |

**新增消息类型**:
```json
{ "type": "kick", "data": { "userId": "Bob" } }
{ "type": "lock-room" }
{ "type": "request-join", "from": "Charlie" }
{ "type": "approve-join", "data": { "userId": "Charlie" } }
```

### 2.3 持久化聊天

将聊天从纯内存广播升级为持久化存储:

```
┌─────────────┐     ┌──────────────┐     ┌───────────┐
│  Frontend   │────►│ Spring Boot  │────►│ Database  │
│             │◄────│              │◄────│ (MongoDB) │
└─────────────┘     └──────────────┘     └───────────┘
```

**后端改动**:
- 新增 `ChatMessage` Entity
- 新增 `ChatRepository`
- `handleChat` 改为先持久化再广播
- 新增 `GET /api/rooms/{roomId}/messages` REST 接口

### 2.4 文件传输

**方式 A**: WebRTC DataChannel (小文件, P2P 直传)
```javascript
const dataChannel = pc.createDataChannel('file-transfer');
dataChannel.send(fileArrayBuffer);
```

**方式 B**: HTTP 上传 (大文件)
```
POST /api/rooms/{roomId}/files
Content-Type: multipart/form-data
```

### 2.5 Emoji 反应

```
┌────────────────────────┐
│  👍 ❤️ 😂 🎉 🤔 👏    │  ← 浮动反应条
│                        │
│    VideoGrid           │
│                        │
│       👍               │  ← 飘浮动画
│          ❤️            │
└────────────────────────┘
```

---

## 四、Phase 3 扩展 — 生产级 (4-8 周)

### 3.1 TURN 服务器部署

**推荐**: [coturn](https://github.com/coturn/coturn)

```bash
# 安装
sudo apt install coturn

# 配置 /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
realm=your-domain.com
user=webrtc:password
```

**前端配置修改** (`useMultiPeerConnection.js`):
```javascript
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: [
        'turn:your-server:3478?transport=udp',
        'turn:your-server:3478?transport=tcp',
        'turns:your-server:5349?transport=tcp',
      ],
      username: 'webrtc',
      credential: 'password',
    },
  ],
};
```

### 3.2 用户认证

```
┌──────────┐     ┌──────────────┐     ┌──────────┐
│ Frontend │────►│ Auth Service │────►│ Database │
│          │     │  (JWT)       │     │          │
│          │────►│ Signal Srv   │     │          │
└──────────┘     └──────────────┘     └──────────┘
```

**技术方案**:
- JWT Token 认证
- WebSocket 握手时验证 Token
- 前端增加登录/注册页面
- Spring Security 集成

### 3.3 移动端适配

**响应式 CSS 断点**:
```css
/* 手机 */
@media (max-width: 640px) {
  .control-bar { /* 简化为 3 个按钮 */ }
  .sidebar { /* 全屏覆盖 */ }
  .video-grid { /* 单列布局 */ }
}

/* 平板 */
@media (max-width: 1024px) {
  .sidebar { /* 弹出层 */ }
}
```

**PWA 支持**:
```json
// manifest.json
{
  "name": "WebRTC Meet",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#0b0e14"
}
```

### 3.4 Electron 桌面客户端

```bash
npm install electron electron-builder

# 项目结构
desktop/
├── main.js          # Electron 主进程
├── preload.js       # 安全桥接
└── package.json     # 打包配置
```

**优势**: 系统托盘、全局快捷键、屏幕共享无需浏览器授权

### 3.5 监控与日志

```
┌──────────┐     ┌────────────┐     ┌──────────────┐
│ Frontend │────►│ Signal Srv │────►│ Prometheus   │
│ (metrics)│     │ (metrics)  │     │ + Grafana    │
└──────────┘     └────────────┘     └──────────────┘
```

**关键指标**:

| 指标 | 来源 | 说明 |
|------|------|------|
| 活跃房间数 | Backend | 当前存在的房间 |
| 在线用户数 | Backend | WebSocket 连接数 |
| ICE 连接成功率 | Frontend | RTCPeerConnection 状态 |
| 平均 RTT | Frontend | getStats() |
| 消息吞吐量 | Backend | 每秒信令消息数 |

### 3.6 国际化 (i18n)

```javascript
// i18n.js
const messages = {
  'zh-CN': {
    joinRoom: '加入房间',
    leaveRoom: '离开会议',
    muteAudio: '静音',
    // ...
  },
  'en': {
    joinRoom: 'Join Room',
    leaveRoom: 'Leave Meeting',
    muteAudio: 'Mute',
    // ...
  },
};
```

---

## 五、技术选型对比

### 媒体服务器

| 方案 | 语言 | 协议 | 优势 | 劣势 |
|------|------|------|------|------|
| **mediasoup** | Node.js/C++ | SFU | 性能极高, API 灵活 | 需要较多开发 |
| **Janus** | C | SFU/MCU | 功能齐全, 插件丰富 | C 语言维护门槛 |
| **Kurento** | Java | MCU | Java 生态, 服务端混流 | 性能开销大 |
| **LiveKit** | Go | SFU | 云原生, Kubernetes 友好 | 商业倾向 |

### 云服务 (无需自建)

| 服务 | 适用场景 | 定价模式 |
|------|----------|----------|
| [声网 Agora](https://www.agora.io/) | 国内为主 | 按分钟计费 |
| [Tencent RTC](https://cloud.tencent.com/product/trtc) | 国内 | 按分钟 |
| [Twilio](https://www.twilio.com/video) | 海外 | 按分钟 |
| [Daily.co](https://www.daily.co/) | 海外 | 按分钟 |

---

## 六、开发优先级矩阵

| 功能 | 复杂度 | 价值 | 优先级 | 建议阶段 |
|------|--------|------|--------|----------|
| 快捷键 | ⭐ | ⭐⭐⭐ | 🟢 P0 | Phase 1 |
| Simulcast | ⭐⭐ | ⭐⭐⭐ | 🟢 P0 | Phase 1 |
| 虚拟背景 | ⭐⭐⭐ | ⭐⭐⭐ | 🟡 P1 | Phase 1 |
| 会议录制 | ⭐⭐ | ⭐⭐ | 🟡 P1 | Phase 1 |
| SFU 集成 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🟢 P0 | Phase 2 |
| 房间管理 | ⭐⭐ | ⭐⭐⭐⭐ | 🟡 P1 | Phase 2 |
| 持久化聊天 | ⭐⭐ | ⭐⭐ | 🟡 P1 | Phase 2 |
| 文件传输 | ⭐⭐ | ⭐⭐ | 🟠 P2 | Phase 2 |
| TURN 部署 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 🟢 P0 | Phase 3 |
| 用户认证 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 🟢 P0 | Phase 3 |
| 移动端适配 | ⭐⭐ | ⭐⭐⭐ | 🟡 P1 | Phase 3 |
| 桌面客户端 | ⭐⭐⭐ | ⭐⭐ | 🟠 P2 | Phase 3 |
| 监控日志 | ⭐⭐ | ⭐⭐⭐⭐ | 🟡 P1 | Phase 3 |
| 国际化 | ⭐ | ⭐⭐ | 🟠 P2 | Phase 3 |

---

## 七、总结

```
Phase 1 (1-2周)  → UX 增强: Simulcast / 虚拟背景 / 录制 / 快捷键
Phase 2 (2-4周)  → 架构升级: SFU / 房间管理 / 持久化 / 文件传输
Phase 3 (4-8周)  → 生产级: TURN / 认证 / 移动端 / 桌面端 / 监控

当前状态:  MVP ✅ (Mesh 拓扑, 小型会议)
下一步:    Phase 1 快捷键 + Simulcast (投入最小, 收益最大)
最终目标:  生产级 Zoom-like 会议系统
```
