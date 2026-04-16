# WebRTC Meet — 扩展方案文档 (v2)

## 📌 项目演进路线

```
[已完成] Phase 0 → WebRTC Demo (点对点通话)
[已完成] Phase 1 → Zoom 风格 UI (React + Tailwind + 多人 Mesh)
[已完成] Phase 2 → 聊天 + 弹幕 + MySQL 持久化 + REST API
[计划中] Phase 3 → Android 客户端
[计划中] Phase 4 → 云部署 + 水平扩展
[计划中] Phase 5 → AI 企业助手
```

---

## ✅ 已完成功能清单

### Phase 2 完成的功能

| 功能 | 技术 | 状态 |
|------|------|------|
| 实时聊天 (房间隔离) | WebSocket 广播 + React 侧边栏 | ✅ 已验证 |
| 弹幕系统 | CSS Animation + 8 轨道 + 颜色选择 | ✅ 已验证 |
| MySQL 持久化 | Spring Data JPA + HikariCP + @Async | ✅ 已验证 |
| 用户/房间自动注册 | PersistenceService.ensureUser/Room | ✅ 已验证 |
| 系统事件记录 | join/leave → messages(type=system) | ✅ 已验证 |
| REST API 历史消息 | GET /api/history?roomId=&type= | ✅ 已验证 |
| REST API 用户管理 | POST /api/user | ✅ 已验证 |

---

## 📱 Phase 3 — Android 客户端 (2-3 周)

### 3.1 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 语言 | Java | Android 原生 |
| WebRTC | org.webrtc (Google) | 音视频传输 |
| WebSocket | OkHttp WebSocket | 信令通道 |
| UI | Android XML Layout | 原生视图 |
| 视频渲染 | SurfaceViewRenderer | WebRTC 视频 |
| JSON | Gson | 消息序列化 |

### 3.2 核心架构

```
┌─────────────────────────────────────────────────────┐
│                 Android Client                       │
│                                                      │
│  ┌────────────────────┐  ┌────────────────────────┐  │
│  │     UI Layer       │  │     Service Layer       │  │
│  │                    │  │                          │  │
│  │  MainActivity      │  │  SignalingClient         │  │
│  │  (Join Screen)     │  │  ├── connect()           │  │
│  │     ↓              │  │  ├── sendJoin()          │  │
│  │  CallActivity      │  │  ├── sendChat()          │  │
│  │  ├── LocalView     │  │  ├── sendDanmaku()       │  │
│  │  ├── RemoteView    │  │  └── sendLeave()         │  │
│  │  ├── ChatFragment  │  │                          │  │
│  │  └── ControlBar    │  │  WebRTCClient            │  │
│  │                    │  │  ├── createOffer()        │  │
│  │  ChatAdapter       │  │  ├── handleAnswer()      │  │
│  │  (RecyclerView)    │  │  ├── addIceCandidate()   │  │
│  │                    │  │  └── closeConnection()    │  │
│  └────────────────────┘  └────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐   │
│  │              Media Layer                       │   │
│  │  PeerConnectionFactory → VideoTrack/AudioTrack │   │
│  │  CameraCapturer → SurfaceViewRenderer          │   │
│  └───────────────────────────────────────────────┘   │
└─────────────────────┬───────────────────────────────┘
                      │ WebSocket (ws://host:8080/ws)
                      │ WebRTC (P2P STUN/TURN)
                      ▼
                Signal Server (Spring Boot)
```

### 3.3 SignalingClient 完整实现

```java
public class SignalingClient {
    private WebSocket webSocket;
    private final OkHttpClient client;
    private final Gson gson = new Gson();
    private final SignalingListener listener;
    private String roomId, userId;
    private int reconnectAttempt = 0;
    private final Handler reconnectHandler = new Handler(Looper.getMainLooper());

    public SignalingClient(SignalingListener listener) {
        this.listener = listener;
        this.client = new OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(30, TimeUnit.SECONDS)  // 保活
            .build();
    }

    public void connect(String serverUrl, String roomId, String userId) {
        this.roomId = roomId;
        this.userId = userId;

        Request request = new Request.Builder().url(serverUrl).build();
        webSocket = client.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(WebSocket ws, Response response) {
                reconnectAttempt = 0;
                sendJoin();
                listener.onConnected();
            }

            @Override
            public void onMessage(WebSocket ws, String text) {
                SignalMessage msg = gson.fromJson(text, SignalMessage.class);
                handleMessage(msg);
            }

            @Override
            public void onClosed(WebSocket ws, int code, String reason) {
                listener.onDisconnected();
                scheduleReconnect();
            }

            @Override
            public void onFailure(WebSocket ws, Throwable t, Response response) {
                listener.onDisconnected();
                scheduleReconnect();
            }
        });
    }

    private void handleMessage(SignalMessage msg) {
        switch (msg.getType()) {
            case "room-users":
                List<String> users = (List<String>) msg.getData().get("users");
                listener.onRoomUsers(users);
                break;
            case "user-joined":
                listener.onUserJoined((String) msg.getData().get("userId"));
                break;
            case "user-left":
                listener.onUserLeft((String) msg.getData().get("userId"));
                break;
            case "offer":
                listener.onOffer(msg);
                break;
            case "answer":
                listener.onAnswer(msg);
                break;
            case "candidate":
                listener.onCandidate(msg);
                break;
            case "chat":
                listener.onChatMessage(msg.getFrom(),
                    (String) msg.getData().get("text"),
                    ((Number) msg.getData().get("timestamp")).longValue());
                break;
            case "danmaku":
                listener.onDanmaku(msg.getFrom(),
                    (String) msg.getData().get("content"),
                    (String) msg.getData().get("color"));
                break;
        }
    }

    // ── 发送方法 ──────────────────────────────────
    public void sendJoin() {
        send(new SignalMessage("join", roomId, userId, null, null));
    }

    public void sendChat(String text) {
        send(new SignalMessage("chat", roomId, userId, null, Map.of("text", text)));
    }

    public void sendDanmaku(String content, String color) {
        send(new SignalMessage("danmaku", roomId, userId, null,
            Map.of("content", content, "color", color)));
    }

    public void sendOffer(String to, String sdp) {
        send(new SignalMessage("offer", roomId, userId, to, Map.of("sdp", sdp)));
    }

    public void sendAnswer(String to, String sdp) {
        send(new SignalMessage("answer", roomId, userId, to, Map.of("sdp", sdp)));
    }

    public void sendCandidate(String to, Map<String, Object> candidate) {
        send(new SignalMessage("candidate", roomId, userId, to,
            Map.of("candidate", candidate)));
    }

    public void sendLeave() {
        send(new SignalMessage("leave", roomId, userId, null, null));
    }

    private void send(SignalMessage msg) {
        if (webSocket != null) {
            webSocket.send(gson.toJson(msg));
        }
    }

    // ── 网络重连 ──────────────────────────────────
    private void scheduleReconnect() {
        int delay = Math.min(1000 * (int) Math.pow(2, reconnectAttempt), 16000);
        reconnectAttempt++;
        reconnectHandler.postDelayed(() -> {
            connect("ws://host:8080/ws", roomId, userId);
        }, delay);
    }

    public void disconnect() {
        reconnectHandler.removeCallbacksAndMessages(null);
        if (webSocket != null) {
            sendLeave();
            webSocket.close(1000, "User left");
        }
    }
}
```

### 3.4 SignalingListener 接口

```java
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
```

### 3.5 WebRTCClient Mesh 逻辑

```java
public class WebRTCClient {
    private final PeerConnectionFactory factory;
    private final Map<String, PeerConnection> peers = new ConcurrentHashMap<>();
    private final Map<String, List<IceCandidate>> pendingCandidates = new ConcurrentHashMap<>();
    private MediaStream localStream;

    // 当收到 room-users 时,主动 call 所有已有用户
    public void callAllUsers(List<String> users) {
        for (String userId : users) {
            PeerConnection pc = createPeerConnection(userId);
            pc.addStream(localStream);
            // 创建 Offer
            pc.createOffer(new SdpObserverImpl() {
                @Override
                public void onCreateSuccess(SessionDescription sdp) {
                    pc.setLocalDescription(new SdpObserverImpl(), sdp);
                    signalingClient.sendOffer(userId, sdp.description);
                }
            }, new MediaConstraints());
        }
    }

    // 当收到 offer 时,创建 Answer
    public void handleOffer(String from, String sdp) {
        PeerConnection pc = createPeerConnection(from);
        pc.addStream(localStream);
        pc.setRemoteDescription(new SdpObserverImpl(),
            new SessionDescription(SessionDescription.Type.OFFER, sdp));

        // 应用缓存的 ICE candidates
        List<IceCandidate> cached = pendingCandidates.remove(from);
        if (cached != null) {
            for (IceCandidate c : cached) pc.addIceCandidate(c);
        }

        pc.createAnswer(new SdpObserverImpl() {
            @Override
            public void onCreateSuccess(SessionDescription sdp) {
                pc.setLocalDescription(new SdpObserverImpl(), sdp);
                signalingClient.sendAnswer(from, sdp.description);
            }
        }, new MediaConstraints());
    }

    // 清理离开的用户
    public void handleUserLeft(String userId) {
        PeerConnection pc = peers.remove(userId);
        if (pc != null) pc.close();
    }
}
```

### 3.6 Android 权限

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.camera.autofocus" />
```

### 3.7 运行时权限处理

```java
private static final int PERMISSION_REQUEST_CODE = 100;

private void checkPermissions() {
    String[] permissions = {
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO
    };

    List<String> needed = new ArrayList<>();
    for (String p : permissions) {
        if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) {
            needed.add(p);
        }
    }

    if (!needed.isEmpty()) {
        ActivityCompat.requestPermissions(this, needed.toArray(new String[0]), PERMISSION_REQUEST_CODE);
    } else {
        startWebRTC();
    }
}

@Override
public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
    if (requestCode == PERMISSION_REQUEST_CODE) {
        boolean allGranted = true;
        for (int result : grantResults) {
            if (result != PackageManager.PERMISSION_GRANTED) allGranted = false;
        }
        if (allGranted) startWebRTC();
        else Toast.makeText(this, "需要摄像头和麦克风权限", Toast.LENGTH_LONG).show();
    }
}
```

### 3.8 开发计划

| 阶段 | 内容 | 时间 |
|------|------|------|
| A3.1 | 项目搭建 + SignalingClient + WebSocket 连接 | 2 天 |
| A3.2 | WebRTCClient + PeerConnection + 视频渲染 | 3 天 |
| A3.3 | ChatFragment + DanmakuView (RecyclerView + Canvas) | 2 天 |
| A3.4 | 生命周期管理 + 权限 + 网络重连 + 前后台切换 | 2 天 |
| A3.5 | Web ↔ Android 联调测试 + Bug 修复 | 3 天 |

---

## ☁️ Phase 4 — 云部署 + 水平扩展 (2-4 周)

### 4.1 当前架构问题

| 问题 | 影响 | 解决方案 |
|------|------|----------|
| 内存会话存储 | 无法水平扩展 | → Redis 外部存储 |
| 单机信令 | 多实例消息不互通 | → Redis Pub/Sub |
| 无 TURN 服务器 | 跨网络无法连接 | → coturn 部署 |
| HTTP 明文 | 不安全 | → Nginx + TLS |

### 4.2 目标架构

```
┌─────────────────────────────────────────────────┐
│                  Nginx (反向代理)                 │
│              SSL 终止 + 负载均衡                  │
│     /:5173 → Frontend    /ws → Backend          │
└─────────┬──────────────────────┬────────────────┘
          │                      │
    ┌─────▼─────┐          ┌─────▼─────┐
    │ Signal-1  │          │ Signal-2  │  ← 水平扩展
    │ Spring    │          │ Spring    │
    │ Boot      │          │ Boot      │
    └─────┬─────┘          └─────┬─────┘
          │                      │
    ┌─────▼──────────────────────▼─────┐
    │          Redis Cluster            │
    │  Session Store + Pub/Sub          │
    └─────┬────────────────────────────┘
          │
    ┌─────▼──────────────────────┐
    │       MySQL (RDS)          │
    │  users/rooms/messages      │
    └────────────────────────────┘
```

### 4.3 Redis 改造

**RoomService → Redis Hash:**
```java
// 替换 ConcurrentHashMap
// roomId -> Set<userId> 存储在 Redis
redisTemplate.opsForSet().add("room:" + roomId, userId);
redisTemplate.opsForSet().remove("room:" + roomId, userId);
Set<String> users = redisTemplate.opsForSet().members("room:" + roomId);
```

**跨实例消息同步 → Redis Pub/Sub:**
```java
// 发布
redisTemplate.convertAndSend("room:" + roomId, messageJson);

// 订阅 (每个实例)
@RedisListener(topics = "room:*")
public void onMessage(String message) {
    // 转发给本实例的 WebSocket 连接
}
```

### 4.4 Docker 容器化

```dockerfile
# Backend Dockerfile
FROM eclipse-temurin:25-jre
COPY target/webrtc-signal-server*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
```

```yaml
# docker-compose.yml
services:
  mysql:
    image: mysql:9
    environment:
      MYSQL_DATABASE: webrtc_meet
      MYSQL_ALLOW_EMPTY_PASSWORD: "yes"
    ports: ["3306:3306"]

  redis:
    image: redis:8-alpine
    ports: ["6379:6379"]

  signal-server:
    build: ./backend
    depends_on: [mysql, redis]
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:mysql://mysql:3306/webrtc_meet
      SPRING_REDIS_HOST: redis

  frontend:
    build: ./frontend
    ports: ["5173:80"]
```

### 4.5 TURN 服务器

```bash
# coturn 安装 (Linux)
sudo apt install coturn

# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
realm=your-domain.com
user=webrtc:password

# 前端配置修改
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: ['turn:your-server:3478', 'turns:your-server:5349'],
      username: 'webrtc',
      credential: 'password',
    },
  ],
};
```

---

## 🤖 Phase 5 — AI 企业助手 (4-8 周)

### 5.1 会议摘要生成

```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│  MySQL   │────►│ Summary      │────►│  LLM API │────►│ summaries│
│ messages │     │ Service      │     │(GPT/通义) │     │ 表 (MySQL)│
└──────────┘     │              │     └──────────┘     └──────────┘
                 │ 1. 提取消息   │
                 │ 2. 组装 Prompt│
                 │ 3. 调用 LLM  │
                 │ 4. 解析结果   │
                 │ 5. 存储摘要   │
                 └──────────────┘
```

**触发时机:**
- 用户手动点击 "生成摘要"
- 会议结束后自动触发 (最后一人离开 + 延迟 5 分钟)

**输入:**
- `messages` 表中 `type=chat` 的记录
- `messages` 表中 `type=danmaku` 的记录
- (未来) 语音转文字 (STT) 结果

**新增数据库表:**
```sql
CREATE TABLE summaries (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  room_id VARCHAR(128) NOT NULL,
  summary TEXT NOT NULL,
  key_topics JSON,          -- ["话题1", "话题2"]
  decisions JSON,           -- ["决定1", "决定2"]
  action_items JSON,        -- [{"assignee":"Alice","task":"...","deadline":"..."}]
  model VARCHAR(64),        -- "gpt-4o" / "qwen-plus"
  message_count INT,        -- 输入消息数
  generated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_room (room_id)
);
```

**Prompt Pipeline (可插拔):**
```java
@Service
public class SummaryService {
    private final MessageRepository messageRepo;
    private final LlmGateway llmGateway;  // 可插拔接口

    @Async
    public CompletableFuture<MeetingSummary> generateSummary(String roomId) {
        // 1. 提取消息
        List<ChatMessage> messages = messageRepo
            .findByRoomIdOrderByTimestampDesc(roomId, PageRequest.of(0, 500));
        Collections.reverse(messages);

        // 2. 组装 Prompt
        String transcript = messages.stream()
            .filter(m -> "chat".equals(m.getType()) || "danmaku".equals(m.getType()))
            .map(m -> String.format("[%s] %s: %s", m.getType(), m.getUserId(), m.getContent()))
            .collect(Collectors.joining("\n"));

        String prompt = """
            你是一个专业的会议记录员。请根据以下会议聊天记录生成摘要。

            聊天记录:
            %s

            请输出 JSON 格式:
            {
              "summary": "会议整体摘要 (2-3 句话)",
              "keyTopics": ["主要话题列表"],
              "decisions": ["会议决定列表"],
              "actionItems": [{"assignee":"负责人","task":"任务","deadline":"截止日期"}]
            }
            """.formatted(transcript);

        // 3. 调用 LLM (可插拔)
        String response = llmGateway.chat(prompt);

        // 4. 解析结果
        MeetingSummary summary = parseJson(response);
        summary.setRoomId(roomId);
        summary.setMessageCount(messages.size());

        // 5. 存储
        summaryRepo.save(summary);
        return CompletableFuture.completedFuture(summary);
    }
}
```

**LLM Gateway 接口 (可插拔):**
```java
public interface LlmGateway {
    String chat(String prompt);
    String getModel();
}

// 实现 1: OpenAI GPT
@Component
@Profile("openai")
public class OpenAiGateway implements LlmGateway {
    public String chat(String prompt) {
        // 调用 OpenAI API
    }
}

// 实现 2: 通义千问
@Component
@Profile("qwen")
public class QwenGateway implements LlmGateway {
    public String chat(String prompt) {
        // 调用通义千问 API
    }
}

// 实现 3: 本地 Ollama
@Component
@Profile("local")
public class OllamaGateway implements LlmGateway {
    public String chat(String prompt) {
        // 调用本地 Ollama REST API
    }
}
```

**新增 REST API:**
```
POST /api/rooms/{roomId}/summary      ← 触发生成
GET  /api/rooms/{roomId}/summaries    ← 查询历史摘要
```

**输出格式:**
```json
{
  "id": 1,
  "roomId": "room-1",
  "summary": "本次会议讨论了 Q2 产品路线图和技术选型...",
  "keyTopics": ["产品路线图", "技术选型", "人员安排"],
  "decisions": [
    "确定使用 React Native 开发移动端",
    "Launch date 定为 6月15日"
  ],
  "actionItems": [
    { "assignee": "Alice", "task": "完成技术调研报告", "deadline": "4月底" },
    { "assignee": "Bob", "task": "准备原型设计", "deadline": "5月10日" }
  ],
  "model": "gpt-4o",
  "messageCount": 47,
  "generatedAt": "2026-04-16T23:00:00"
}
```

### 5.2 合同审查助手

```
                                ┌──────────────────────────┐
┌──────────┐     ┌──────────┐  │    Contract Analyzer      │
│  用户上传  │────►│ Document │  │                          │
│ PDF/DOCX │     │ Parser   │──►│ 1. 条款提取              │
└──────────┘     │ (Apache  │  │ 2. 风险检测 → LLM        │
                 │  Tika)   │  │ 3. 建议生成              │
                 └──────────┘  │ 4. 评级: 高/中/低         │
                               └──────────────┬───────────┘
                                              │
                                              ▼
                               ┌──────────────────────────┐
                               │     contract_reviews 表   │
                               │ id, room_id, filename,   │
                               │ clauses (JSON),          │
                               │ risks (JSON),            │
                               │ suggestions (JSON),      │
                               │ overall_risk (HIGH/MED/LOW) │
                               └──────────────────────────┘
```

**功能:**
- 上传 PDF/DOCX 文档 (Apache Tika 解析)
- AI 自动提取关键条款 (付款条件/违约责任/保密协议/管辖权)
- 风险条款标注 + 严重程度评级 (高/中/低)
- 修改建议生成
- 与会议上下文关联 (在会议中讨论合同时自动拉取分析结果)

**REST API:**
```
POST /api/contracts/upload?roomId=xxx  ← 上传文档
GET  /api/contracts/{id}              ← 获取分析结果
GET  /api/rooms/{roomId}/contracts    ← 获取房间关联合同
```

**Prompt 示例:**
```
你是一名法律顾问。请分析以下合同文本:

[合同全文]

请输出 JSON:
{
  "clauses": [
    {"title": "付款条件", "content": "...", "risk": "low"},
    {"title": "违约责任", "content": "...", "risk": "high", "suggestion": "建议增加..."}
  ],
  "overallRisk": "medium",
  "recommendations": ["建议1", "建议2"]
}
```

### 5.3 AI 架构 (独立微服务)

```
┌──────────────────────────────────────────────────────────────┐
│                    AI Service (独立部署)                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                   Unified API Layer                     │  │
│  │   POST /ai/summary     POST /ai/contract-review       │  │
│  └────────────────────────┬───────────────────────────────┘  │
│                           │                                  │
│  ┌────────────────────────▼───────────────────────────────┐  │
│  │                  Prompt Pipeline                        │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │  │
│  │  │ Context  │→│ Template │→│ LLM Gateway           │  │  │
│  │  │ Builder  │  │ Engine   │  │ (可插拔: GPT/通义/   │  │  │
│  │  │          │  │          │  │  Ollama/自定义)      │  │  │
│  │  └──────────┘  └──────────┘  └──────────────────────┘  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  Document Parser                        │  │
│  │  Apache Tika → PDF / DOCX / TXT 统一文本提取            │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                  Result Store                           │  │
│  │  summaries 表 │ contract_reviews 表 │ ai_tasks 表       │  │
│  └────────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────────┘
                           │ REST API (内部)
                           ▼
                    Signal Server (Spring Boot)
```

**设计原则:**
- AI 服务独立部署,不影响实时通信性能
- 所有 AI 调用异步执行 (CompletableFuture + @Async)
- 结果缓存避免重复计算
- LLM Gateway 接口化,切换模型仅需改配置文件

---

## 🧩 统一架构总览

```
┌────────────────────────────────────────────────────────────────┐
│  1. Client Layer                                                │
│     ├── Web (React + Vite + Tailwind)  ← ✅ 已完成              │
│     ├── Android (Java + WebRTC)        ← 📱 Phase 3            │
│     └── Desktop (Electron)             ← 💻 未来                │
│                                                                │
│  2. Signaling Layer (Spring Boot 4.1)                           │
│     ├── WebSocket Handler                                      │
│     │   ├── join / leave               ← ✅ 已完成              │
│     │   ├── chat / danmaku             ← ✅ 已完成              │
│     │   └── offer / answer / candidate ← ✅ 已完成              │
│     ├── Room-based routing             ← ✅ 已完成              │
│     └── REST API                                               │
│         ├── GET /api/history           ← ✅ 已完成              │
│         ├── POST /api/user             ← ✅ 已完成              │
│         ├── POST /api/rooms/{id}/summary  ← 🔜 Phase 5        │
│         └── POST /api/contracts/upload    ← 🔜 Phase 5        │
│                                                                │
│  3. Data Layer                                                  │
│     ├── MySQL 9.6                                              │
│     │   ├── users / rooms / messages   ← ✅ 已完成              │
│     │   ├── summaries                  ← 🔜 Phase 5           │
│     │   └── contract_reviews           ← 🔜 Phase 5           │
│     ├── Async writes (@Async)          ← ✅ 已完成              │
│     └── Redis                          ← ☁️ Phase 4            │
│         ├── Session store (rooms)                              │
│         └── Pub/Sub (cross-instance)                           │
│                                                                │
│  4. Real-time Features                                          │
│     ├── Chat (room-scoped + persisted) ← ✅ 已完成              │
│     ├── Danmaku (8-track + persisted)  ← ✅ 已完成              │
│     ├── Active Speaker Detection       ← ✅ 已完成              │
│     └── Screen Sharing                 ← ✅ 已完成              │
│                                                                │
│  5. AI Layer (独立微服务)                                        │
│     ├── Meeting Summary (LLM)          ← 🤖 Phase 5           │
│     ├── Contract Review (Document AI)  ← 🤖 Phase 5           │
│     └── STT Integration (语音转文字)    ← 🔜 未来               │
│                                                                │
│  6. Deployment Layer                                            │
│     ├── LAN (localhost)                ← ✅ 当前                │
│     ├── Docker Compose                 ← ☁️ Phase 4            │
│     ├── Cloud ECS + RDS                ← ☁️ Phase 4            │
│     ├── Nginx + WSS                    ← ☁️ Phase 4            │
│     └── Kubernetes                     ← 🔜 未来               │
└────────────────────────────────────────────────────────────────┘
```

### 接口解耦矩阵

| 层级边界 | 通信方式 | 协议/接口 | 可替换性 |
|----------|----------|-----------|---------|
| Client ↔ Signal | WebSocket | JSON v3 协议 | 任何 WS 客户端 |
| Client ↔ Data | HTTP REST | `/api/*` | 标准 REST |
| Signal ↔ DB | Spring DI | `PersistenceService` | JPA → MyBatis 可切换 |
| Signal ↔ Room | Spring DI | `RoomService` 接口 | Memory → Redis 可切换 |
| Signal ↔ AI | HTTP REST | `/ai/*` (内部) | 独立微服务 |
| AI ↔ LLM | Gateway 接口 | `LlmGateway` | GPT/通义/本地 可切换 |

---

## 🎯 开发优先级

| 功能 | 复杂度 | 价值 | 状态 | Phase |
|------|--------|------|------|-------|
| 实时聊天 | ⭐⭐ | ⭐⭐⭐⭐ | ✅ 完成 | 2 |
| 弹幕系统 | ⭐⭐ | ⭐⭐⭐ | ✅ 完成 | 2 |
| MySQL 持久化 | ⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 完成 | 2 |
| REST API | ⭐ | ⭐⭐⭐ | ✅ 完成 | 2 |
| Android 客户端 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔜 计划 | 3 |
| TURN 服务器 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 🔜 计划 | 4 |
| Docker 部署 | ⭐⭐ | ⭐⭐⭐⭐ | 🔜 计划 | 4 |
| Redis 扩展 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 🔜 计划 | 4 |
| Nginx + WSS | ⭐⭐ | ⭐⭐⭐⭐⭐ | 🔜 计划 | 4 |
| AI 会议摘要 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 🔜 计划 | 5 |
| AI 合同审查 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 🔜 计划 | 5 |
| STT 语音转文字 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 🔜 计划 | 5+ |
| Electron 桌面端 | ⭐⭐⭐ | ⭐⭐ | 🔜 计划 | 未定 |

---

## 📝 总结

```
当前完成:
  ✅ WebRTC 多人视频通话 (Mesh)
  ✅ Zoom 风格 UI (React + Tailwind)
  ✅ 实时聊天 + 弹幕 (WebSocket 广播)
  ✅ MySQL 持久化 (用户/房间/消息)
  ✅ REST API (历史查询/用户管理)
  ✅ 活跃说话人检测 (AudioContext)

下一步:
  📱 Android 客户端 (共享同一信令协议)
  ☁️ 云部署 (Docker + Nginx + Redis + TURN)
  🤖 AI 助手 (会议摘要 + 合同审查)

架构目标:
  模块化 → 每层可独立替换
  可扩展 → 接口驱动,新功能即插即用
  云就绪 → 从 LAN 到 Cloud 无需重构
```
