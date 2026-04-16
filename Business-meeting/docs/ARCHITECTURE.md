# WebRTC Meet — 系统架构文档

## 项目结构总览

```
Business-meeting/
│
├── docs/                              ← 📚 文档中心
│   ├── OPERATION_GUIDE.md             # 操作指南 (含启动/API/排障)
│   ├── EXTENSION_PLAN.md              # 扩展路线图 (Android/Cloud/AI)
│   └── ARCHITECTURE.md                # 本文档 — 架构概览
│
├── webrtc-project/                    ← 🌐 Web 平台 (已完成)
│   ├── backend/                       # Java Spring Boot 信令服务器
│   │   ├── pom.xml
│   │   └── src/main/java/com/example/webrtc/
│   │       ├── config/                # 配置 (WebSocket/Jackson/Async)
│   │       ├── controller/            # REST API
│   │       ├── entity/                # JPA 实体 (User/Room/Message)
│   │       ├── repository/            # Spring Data 仓库
│   │       ├── handler/               # WebSocket 信令处理器
│   │       ├── model/                 # 消息模型
│   │       └── service/               # 业务逻辑 (Room/User/Persistence)
│   │
│   └── frontend/                      # React + Vite + Tailwind 前端
│       └── src/
│           ├── hooks/                 # 自定义 Hooks (WebSocket/WebRTC/Speaker)
│           └── components/            # UI 组件 (VideoGrid/Chat/Danmaku等)
│
├── android-client/                    ← 📱 Android 客户端 (新建)
│   ├── app/src/main/
│   │   ├── java/com/example/webrtcmeet/
│   │   │   ├── signaling/             # WebSocket 信令 (OkHttp)
│   │   │   └── webrtc/                # WebRTC Mesh 连接管理
│   │   └── res/                       # 布局/颜色/主题
│   ├── build.gradle                   # Gradle 配置
│   └── settings.gradle
│
├── webrtc-demo/                       ← 📦 早期 Demo (已归档)
└── webrtc-signal-server/              ← 📦 早期信令服务 (已归档)
```

---

## 六层架构

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: CLIENT                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────┐      │
│  │ Web Client │  │  Android   │  │ Desktop (Electron) │      │
│  │ React/Vite │  │  Java/WRT  │  │ Future             │      │
│  │ ✅ Done    │  │ ✅ Created │  │ 🔜 Planned         │      │
│  └─────┬──────┘  └─────┬──────┘  └────────────────────┘      │
│        │               │                                      │
│        └───── ws://host:8080/ws ──────┘                       │
└────────────────────────┬─────────────────────────────────────┘
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 2: SIGNALING (Spring Boot 4.1)                        │
│  SignalHandler ←→ RoomService ←→ PersistenceService          │
│  ApiController (REST)                                        │
└────────────────────────┬─────────────────────────────────────┘
┌────────────────────────▼─────────────────────────────────────┐
│  Layer 3: DATA                                                │
│  MySQL 9.6 (users/rooms/messages) │ Redis (Future)           │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│  Layer 4: REAL-TIME (Chat + Danmaku + Speaker Detection)     │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│  Layer 5: AI (Future — Meeting Summary + Contract Review)    │
└──────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────┐
│  Layer 6: DEPLOYMENT (LAN → Docker → Cloud)                  │
└──────────────────────────────────────────────────────────────┘
```

---

## 信令协议 (v3)

```json
// 客户端 → 服务端
{ "type": "join|leave|chat|danmaku|offer|answer|candidate",
  "roomId": "room-1", "from": "Alice", "to": "Bob",
  "data": { /* 类型相关数据 */ } }

// 服务端 → 客户端
{ "type": "room-users|user-joined|user-left|chat|danmaku|error",
  "from": "...", "data": { /* ... */ } }
```

**所有平台 (Web + Android) 共享同一协议**，确保互操作性。

---

## 数据流

```
User Action → WebSocket → SignalHandler → broadcastToRoom() → All Clients
                                      ↘ @Async
                                        PersistenceService → MySQL
```

**核心设计**: 广播零延迟，持久化异步不阻塞。
