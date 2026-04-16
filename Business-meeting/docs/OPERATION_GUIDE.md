# WebRTC Meet — 操作指南 (v4)

## 一、环境要求

| 组件 | 最低版本 | 用途 | 安装检查命令 |
|------|----------|------|-------------|
| **JDK** | 25+ | 后端 Spring Boot 编译运行 | `java -version` |
| **Maven** | 3.9+ | 后端构建工具 | `mvn -v` |
| **Node.js** | 18+ | 前端构建 & 开发服务器 | `node -v` |
| **npm** | 9+ | 前端依赖管理 | `npm -v` |
| **MySQL** | 9.0+ | 持久化存储 (用户/房间/消息) | `mysql --version` |
| **浏览器** | Chrome 90+ / Edge 90+ / Firefox 85+ | 必须支持 WebRTC | — |
| **Android Studio** | 2025.3+ | Android APK 编译 (可选) | — |

> 📖 **新手用户**: 请先阅读 [快速上手指南 (QUICK_START.md)](../docs/QUICK_START.md)，有详细的安装和操作步骤。

> **⚠ 重要**: WebRTC 要求 HTTPS 或 `localhost` 环境。局域网测试需要 HTTPS 证书。

---

## 二、项目结构

```
Business-meeting/                       ← 项目根目录
│
├── docs/                               # 📚 文档中心
│   ├── QUICK_START.md                  # 新手快速上手指南 ★
│   ├── ARCHITECTURE.md                 # 系统架构文档
│   ├── OPERATION_GUIDE.md              # 本文档副本
│   └── EXTENSION_PLAN.md               # 扩展方案文档
│
├── webrtc-project/                     # 🌐 Web 平台
│   ├── OPERATION_GUIDE.md              # 本文档
│   ├── EXTENSION_PLAN.md               # 扩展方案文档
│   │
│   ├── backend/                        # Java 信令服务器
│   │   ├── pom.xml                     # Maven 依赖
│   │   └── src/main/java/com/example/webrtc/
│   │       ├── WebrtcApplication.java  # Spring Boot 启动类
│   │       ├── config/                 # 配置 (WebSocket/Jackson/Async)
│   │       ├── controller/             # REST API
│   │       ├── entity/                 # JPA 实体 (User/Room/Message)
│   │       ├── repository/             # Spring Data 仓库
│   │       ├── handler/                # SignalHandler (信令核心)
│   │       ├── model/                  # 消息模型
│   │       └── service/                # RoomService/PersistenceService
│   │
│   └── frontend/                       # React 前端
│       ├── package.json
│       └── src/
│           ├── App.jsx                 # 主应用 (Zoom 风格)
│           ├── hooks/                  # WebSocket/WebRTC/Speaker Hooks
│           └── components/             # UI 组件 (12 个)
│
├── android-client/                     # 📱 Android 客户端 ★ 新增
│   ├── README.md                       # Android 构建说明
│   ├── app/build.gradle                # Gradle 依赖
│   └── app/src/main/
│       ├── AndroidManifest.xml          # 权限声明
│       ├── java/com/example/webrtcmeet/
│       │   ├── MainActivity.java        # 加入房间 + 权限
│       │   ├── CallActivity.java        # 通话 + 聊天 + 视频
│       │   ├── ChatAdapter.java         # 聊天 RecyclerView
│       │   ├── signaling/               # WebSocket 信令层
│       │   │   ├── SignalingClient.java  # OkHttp WS + 自动重连
│       │   │   ├── SignalingListener.java
│       │   │   └── SignalMessage.java
│       │   └── webrtc/
│       │       └── WebRTCClient.java     # Mesh PeerConnection 管理
│       └── res/                         # 布局 + 颜色 + 主题
│
└── webrtc-demo/                        # 📦 早期 Demo (已归档)
```

---

## 三、数据库配置

### 步骤 1: 确认 MySQL 服务运行

```bash
# Windows — 检查服务状态
Get-Service -Name 'mysql*'

# 或使用命令行检查
mysql --version
```

### 步骤 2: 创建数据库

```sql
-- 使用 root 连接 MySQL
mysql -u root

-- 创建数据库
CREATE DATABASE IF NOT EXISTS webrtc_meet
  DEFAULT CHARSET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- 验证
SHOW DATABASES LIKE 'webrtc%';
```

> **注意**: 表结构由 Hibernate 自动创建 (`spring.jpa.hibernate.ddl-auto=update`)，无需手动建表。

### 数据库表结构

启动后端后，以下三张表会自动创建：

| 表名 | 用途 | 关键字段 |
|------|------|----------|
| `users` | 用户记录 | `id` (auto), `name` (unique), `created_at` |
| `rooms` | 房间记录 | `room_id` (PK), `created_at` |
| `messages` | 消息记录 | `id`, `room_id`, `user_id`, `type`, `content`, `timestamp` |

`messages.type` 取值: `chat` / `danmaku` / `system`

---

## 四、快速启动

### 步骤 1: 启动后端信令服务器

```bash
cd webrtc-project/backend
mvn spring-boot:run
```

等待看到:
```
HikariPool-1 - Start completed.           ← MySQL 连接成功
Found 3 JPA repository interfaces.         ← JPA 仓库扫描完成
Tomcat started on port 8080               ← 服务就绪
Started WebrtcApplication in 2.9 seconds
```

### 步骤 2: 启动前端

```bash
cd webrtc-project/frontend
npm install    # 首次运行
npm run dev
```

打开浏览器: `http://localhost:5173`

---

## 五、功能使用说明

### 5.1 加入房间

1. 打开 `http://localhost:5173`
2. 输入 Room ID (默认 `room-1`) 和你的名字
3. 点击 **Join Room** → 允许摄像头/麦克风权限
4. 进入会议主界面

### 5.2 控制栏 (7 个按钮)

| # | 图标 | 功能 | 说明 |
|---|------|------|------|
| 1 | 🎤 | 麦克风开关 | 关闭时红色边框提示 |
| 2 | 📷 | 摄像头开关 | 关闭时显示 Avatar 占位 |
| 3 | 🖥 | 屏幕共享 | 共享桌面画面 |
| 4 | 🖼 | 背景模糊 | CSS 模糊效果 |
| 5 | 💬 | 聊天 | 打开右侧聊天面板 |
| 6 | 👥 | 参与者 | 打开右侧参与者列表 |
| 7 | 🔴 | 离开会议 | 断开连接，返回加入页 |

### 5.3 实时聊天

1. 点击控制栏 💬 图标 → 右侧打开聊天面板
2. 输入消息 → 按 Enter 发送
3. 消息实时同步到房间内所有人
4. 所有聊天消息自动持久化到 MySQL `messages` 表 (`type='chat'`)
5. 未读消息时 💬 按钮显示红色角标

### 5.4 弹幕系统 (Danmaku)

1. 在视频区域右下角找到 💬 弹幕按钮 (小圆形按钮)
2. 点击打开弹幕输入栏
3. 选择颜色 (8 种可选)
4. 输入内容 → 点击 Send 或按 Enter
5. 弹幕从右到左飞过视频画面
6. 所有弹幕自动持久化到 MySQL `messages` 表 (`type='danmaku'`)

**弹幕特性:**
- CSS 动画驱动 (8 秒穿越屏幕)
- 8 条轨道自动分配，避免重叠
- 每条弹幕显示发送者名字
- 支持自定义颜色 (白/红/黄/绿/蓝/粉/橙/青)

### 5.5 查看参与者

1. 点击控制栏 👥 图标
2. 显示所有在线用户 + 连接状态 + 说话指示器

---

## 六、REST API 接口

### GET /api/history

获取房间消息历史。

```bash
# 获取 room-1 的所有消息 (默认 50 条)
curl http://localhost:8080/api/history?roomId=room-1

# 获取特定类型
curl 'http://localhost:8080/api/history?roomId=room-1&type=chat&limit=20'

# 获取弹幕历史
curl 'http://localhost:8080/api/history?roomId=room-1&type=danmaku'
```

**响应:**
```json
[
  {
    "id": 1,
    "roomId": "room-1",
    "userId": "Alice",
    "type": "system",
    "content": "Alice joined the room",
    "timestamp": "2026-04-16T22:42:51"
  },
  {
    "id": 2,
    "roomId": "room-1",
    "userId": "Alice",
    "type": "chat",
    "content": "Hello everyone!",
    "timestamp": "2026-04-16T22:43:10"
  }
]
```

### POST /api/user

创建或获取用户。

```bash
curl -X POST http://localhost:8080/api/user \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice"}'
```

### GET /api/rooms/{roomId}/messages

获取房间消息 (alias)。

```bash
curl http://localhost:8080/api/rooms/room-1/messages?limit=100
```

---

## 七、信令协议 v3

### 客户端 → 服务端

| 类型 | 用途 | 必填字段 |
|------|------|----------|
| `join` | 加入房间 | `type`, `roomId`, `from` |
| `leave` | 离开房间 | `type`, `roomId`, `from` |
| `chat` | 发送聊天 | `type`, `roomId`, `from`, `data.text` |
| `danmaku` | 发送弹幕 | `type`, `roomId`, `from`, `data.content`, `data.color` |
| `offer` | SDP Offer | `type`, `roomId`, `from`, `to`, `data.sdp` |
| `answer` | SDP Answer | `type`, `roomId`, `from`, `to`, `data.sdp` |
| `candidate` | ICE Candidate | `type`, `roomId`, `from`, `to`, `data.candidate` |

### 服务端 → 客户端

| 类型 | 用途 | 数据 |
|------|------|------|
| `room-users` | 当前用户列表 | `data.users: string[]` |
| `user-joined` | 用户加入 | `data.userId` |
| `user-left` | 用户离开 | `data.userId` |
| `chat` | 聊天广播 | `from`, `data.text`, `data.timestamp` |
| `danmaku` | 弹幕广播 | `from`, `data.content`, `data.color`, `data.timestamp` |
| `error` | 错误 | `data.message` |

### 数据流向 (聊天 / 弹幕)

```
Client  ──WebSocket──►  SignalHandler  ──async──►  MySQL
   │                        │
   │                   broadcastToRoom()
   │                        │
   ◄───── all room users ◄──┘
```

所有消息先广播 (零延迟), 再异步写入 MySQL (不阻塞)。  
MySQL 故障不影响实时通信。

---

## 八、系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                             │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │  Web (React+Vite)  │     │  Android (Java) ✅ 已完成    │  │
│  │  WebRTC + WebSocket │     │  org.webrtc + OkHttp WS     │  │
│  └──────────────────────┘     └──────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ WebSocket (ws://host:8080/ws)
┌──────────────────────────▼──────────────────────────────────────┐
│                     Signaling Layer                              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Spring Boot 4.1 (Java 25)                      │   │
│  │  ┌────────────┐ ┌──────────┐ ┌──────────────────────┐    │   │
│  │  │SignalHandler│ │RoomService│ │ PersistenceService   │    │   │
│  │  │(WebSocket) │ │(In-Memory)│ │ (@Async → MySQL)     │    │   │
│  │  └────────────┘ └──────────┘ └──────────────────────┘    │   │
│  │  ┌────────────────────────────────────────────────────┐   │   │
│  │  │     ApiController (REST: /api/history, /api/user)   │   │   │
│  │  └────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ JDBC (HikariCP)
┌──────────────────────────▼──────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    MySQL 9.6                               │   │
│  │   users │ rooms │ messages (chat/danmaku/system)           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 九、常见问题排查

### Q1: MySQL 连接失败

```
HikariPool-1 - Exception during pool initialization
```

**解决:**
1. 确认 MySQL 服务已启动: `Get-Service -Name 'mysql*'`
2. 确认数据库已创建: `mysql -u root -e "SHOW DATABASES LIKE 'webrtc%'"`
3. 检查 `application.properties` 中的连接字符串
4. 如果 MySQL 设置了密码, 修改 `spring.datasource.password`

### Q2: 表不存在

表由 Hibernate 自动创建。如果表缺失:
1. 确认 `spring.jpa.hibernate.ddl-auto=update` 在配置中
2. 检查启动日志是否有 `Found 3 JPA repository interfaces`
3. 手动重启后端

### Q3: 弹幕不显示

**排查:**
1. 确认 WebSocket 已连接 (TopBar 绿色指示灯)
2. 点击视频区域右下角小按钮打开弹幕输入
3. 检查 F12 Console 是否有错误
4. 确认 `index.css` 中有 `@keyframes danmaku-fly` 动画

### Q4: 聊天消息发送但未持久化

**排查:**
1. 检查后端日志是否有 `Failed to persist message` 警告
2. 确认 MySQL 连接正常
3. 调用 `GET /api/history?roomId=xxx` 检查

---

## 十、技术栈总览

| 层 | 技术 | 版本 |
|---|------|------|
| 前端框架 | React | 19.2 |
| 构建工具 | Vite | 8.0 |
| CSS 框架 | Tailwind CSS | 3.4 |
| 后端框架 | Spring Boot | 4.1 |
| 数据库 | MySQL | 9.6 |
| ORM | Hibernate (Spring Data JPA) | 7.2 |
| 连接池 | HikariCP | 7.0 |
| 通信协议 | WebSocket / WebRTC | — |
| 实时媒体 | RTCPeerConnection | — |
| 音频分析 | Web Audio API (AudioContext) | — |
| 弹幕渲染 | CSS Animation (translateX) | — |

---

## 十一、构建生产版本

### 前端打包

```bash
cd webrtc-project/frontend
npm run build
# 产物: dist/ (~226 KB JS, ~27 KB CSS, gzip 后 ~75 KB)
```

### 后端打包

```bash
cd webrtc-project/backend
mvn package -DskipTests
# 产物: target/webrtc-signal-server-0.0.1-SNAPSHOT.jar
```

### 部署

```bash
# 1. 确认 MySQL webrtc_meet 数据库已创建
# 2. 启动后端
java -jar webrtc-signal-server-0.0.1-SNAPSHOT.jar
# 3. 部署前端 dist/ 到 Nginx
```

---

## 十二、Android 客户端 ✅ 已完成

### 12.0 APK 下载

已编译好的 Debug APK:
```
android-client/app/build/outputs/apk/debug/app-debug.apk (33 MB)
```

直接安装到手机即可使用。如需重新编译，见 12.1。

### 12.1 环境要求

| 组件 | 版本 | 说明 |
|------|------|------|
| Android Studio | 2025.3+ (已安装) | IDE / JBR Java 21 |
| Android SDK | API 24+ (Android 7.0+) | 最低兼容 |
| Java | 21 (Android Studio JBR) | Android 编译 |
| Gradle | 8.11.1 | 构建工具 (已配置) |

### 12.2 核心依赖 (build.gradle)

```groovy
dependencies {
    // WebRTC
    implementation 'org.webrtc:google-webrtc:1.0.32006'

    // WebSocket
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'

    // JSON
    implementation 'com.google.code.gson:gson:2.11.0'
}
```

### 12.3 项目结构

```
android-client/
├── app/src/main/
│   ├── AndroidManifest.xml          # 权限声明
│   ├── java/com/example/webrtcmeet/
│   │   ├── MainActivity.java       # 主界面 (加入房间)
│   │   ├── CallActivity.java       # 通话界面 (视频+聊天)
│   │   │
│   │   ├── webrtc/                  # WebRTC 封装层
│   │   │   ├── WebRTCClient.java    # PeerConnectionFactory + 连接管理
│   │   │   ├── PeerConnectionObserverImpl.java
│   │   │   └── SdpObserverImpl.java
│   │   │
│   │   ├── signaling/               # 信令层
│   │   │   ├── SignalingClient.java  # OkHttp WebSocket 客户端
│   │   │   ├── SignalMessage.java   # 消息模型 (与后端一致)
│   │   │   └── SignalingListener.java # 回调接口
│   │   │
│   │   └── chat/                    # 聊天层
│   │       ├── ChatAdapter.java     # RecyclerView 适配器
│   │       └── ChatMessage.java     # 聊天消息模型
│   │
│   └── res/layout/
│       ├── activity_main.xml        # 加入房间 UI
│       └── activity_call.xml        # 通话 UI (SurfaceView + Chat)
```

### 12.4 权限配置 (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<uses-feature android:name="android.hardware.camera" />
<uses-feature android:name="android.hardware.camera.autofocus" />
```

### 12.5 构建 APK

**方式 A: Android Studio (推荐)**

1. 打开 Android Studio → `File → Open` → 选择 `android-client/`
2. 等待 Gradle 同步
3. 连接手机 (`USB 调试`) 或启动模拟器
4. 点击 `Run ▶`

**方式 B: 命令行**

```powershell
# JAVA_HOME 必须指向 Android Studio 自带的 JBR (Java 21)
# 系统默认 Java 25 不兼容 Gradle 8.11.1
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

cd D:\Webrtc\Business-meeting\android-client
.\gradlew.bat assembleDebug --no-daemon

# APK 产物:
# app/build/outputs/apk/debug/app-debug.apk (33 MB)
```

**安装到手机:**

```powershell
adb install app\build\outputs\apk\debug\app-debug.apk
```

### 12.6 使用方法

1. 确保手机和电脑在 **同一局域网**
2. 启动后端: `cd webrtc-project/backend && mvn spring-boot:run`
3. 打开 App → 填写:
   - **Server IP**: 电脑 IP (运行 `ipconfig` 查看)
   - **Room ID**: 房间号 (和 Web 端一致)
   - **Your Name**: 你的名字
4. 点击 **Join Room** → 允许摄像头/麦克风

### 12.7 与 Web 端互联

Android 和 Web 使用 **完全相同的信令协议** (见第七节)，因此：
- Android 加入 `room-1` 后，Web 端同房间用户立即收到 `user-joined`
- 两端通过相同的 `offer/answer/candidate` 流程建立 WebRTC P2P 连接
- 聊天消息双向同步、全部持久化到 MySQL

### 12.8 Android 架构

```
┌─────────────────────────────────────────────┐
│ CallActivity                                │
│  ├── SurfaceViewRenderer (本地 + 远程视频)   │
│  ├── RecyclerView (聊天 via ChatAdapter)     │
│  └── 控制栏 (麦克风/摄像头/聊天/挂断)        │
├─────────────────────────────────────────────┤
│ SignalingClient (OkHttp WebSocket)           │
│  ├── 指数退避自动重连 (1s→2s→4s→...→16s)    │
│  ├── JSON 消息解析 (Gson)                    │
│  └── 主线程回调分发 (Handler)                │
├─────────────────────────────────────────────┤
│ WebRTCClient (org.webrtc)                    │
│  ├── PeerConnectionFactory + EglBase         │
│  ├── Camera1/Camera2 自动选择 (前置优先)      │
│  ├── Mesh 多人连接管理 (ConcurrentHashMap)   │
│  └── ICE Candidate 缓冲 (远端描述未就绪时)   │
└─────────────────────────────────────────────┘
```

---

## 十三、云部署方案 (规划)

### 13.1 部署架构

```
                    ┌───────────────────────────┐
        Internet    │      Cloud ECS / VM       │
         ┌────────►│                            │
         │         │  ┌──────────────────────┐  │
         │         │  │     Nginx            │  │
Users ───┤         │  │  - SSL 终止 (WSS)    │  │
         │         │  │  - 负载均衡           │  │
         │         │  │  - 静态文件 (React)   │  │
         │         │  └──────┬───────────────┘  │
         └────────►│         │                  │
                   │  ┌──────▼───────────────┐  │
                   │  │  Signal Server ×N    │  │
                   │  │  (Spring Boot JAR)   │  │
                   │  └──────┬───────────────┘  │
                   │         │                  │
                   │  ┌──────▼──────┐ ┌──────┐  │
                   │  │   MySQL     │ │Redis │  │
                   │  │   (RDS)     │ │      │  │
                   │  └─────────────┘ └──────┘  │
                   │                            │
                   │  ┌─────────────────────┐   │
                   │  │  coturn (TURN)       │   │
                   │  │  port 3478/5349     │   │
                   │  └─────────────────────┘   │
                   └───────────────────────────┘
```

### 13.2 Nginx 配置 (WSS + 静态文件)

```nginx
server {
    listen 443 ssl http2;
    server_name meet.your-domain.com;

    ssl_certificate     /etc/ssl/certs/fullchain.pem;
    ssl_certificate_key /etc/ssl/private/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;

    # 前端静态文件
    root /var/www/webrtc-meet/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # WebSocket 反向代理 (WSS → WS)
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 86400;   # 24h keepalive
    }

    # REST API 代理
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# HTTP → HTTPS 重定向
server {
    listen 80;
    server_name meet.your-domain.com;
    return 301 https://$host$request_uri;
}
```

### 13.3 Docker 容器化

**Backend Dockerfile:**
```dockerfile
FROM eclipse-temurin:25-jre
WORKDIR /app
COPY target/webrtc-signal-server-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar", \
  "--spring.datasource.url=${DB_URL}", \
  "--spring.datasource.username=${DB_USER}", \
  "--spring.datasource.password=${DB_PASS}"]
```

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  mysql:
    image: mysql:9
    environment:
      MYSQL_DATABASE: webrtc_meet
      MYSQL_ALLOW_EMPTY_PASSWORD: "yes"
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  redis:
    image: redis:8-alpine
    ports:
      - "6379:6379"

  signal-server:
    build: ./backend
    depends_on:
      - mysql
      - redis
    ports:
      - "8080:8080"
    environment:
      DB_URL: jdbc:mysql://mysql:3306/webrtc_meet?useSSL=false
      DB_USER: root
      DB_PASS: ""

  coturn:
    image: coturn/coturn
    network_mode: host
    volumes:
      - ./turnserver.conf:/etc/coturn/turnserver.conf

volumes:
  mysql_data:
```

### 13.4 水平扩展准备

当前 `RoomService` 和 `UserService` 使用 `ConcurrentHashMap` (内存存储)，需改为 Redis：

| 组件 | 当前 (LAN) | 云部署后 |
|------|-----------|---------|
| 房间状态 | `ConcurrentHashMap` | Redis Hash |
| 用户会话 | `ConcurrentHashMap` | Redis + 本地缓存 |
| 消息广播 | 直接 WebSocket | Redis Pub/Sub + WebSocket |
| 消息持久化 | MySQL (直连) | MySQL (RDS) |

---

## 十四、AI 企业助手 (规划)

### 14.1 会议摘要生成

**触发方式:**
- 用户在会议中点击 "生成摘要" 按钮
- 会议结束后自动触发 (最后一人离开 + 延迟 5 分钟)

**数据流:**
```
┌──────────┐     ┌──────────────┐     ┌──────────┐     ┌──────────┐
│  MySQL   │────►│ AI Service   │────►│ LLM API  │────►│ 结果存储  │
│ messages │     │ (提取+组装   │     │(GPT/通义) │     │ summaries│
│ (chat+   │     │  Prompt)     │     │          │     │ 表       │
│  danmaku)│     └──────────────┘     └──────────┘     └──────────┘
└──────────┘
```

**输出格式:**
```json
{
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
  "generatedAt": "2026-04-16T23:00:00"
}
```

**设计原则:**
- 异步处理，不影响实时通信
- 可插拔 LLM 后端 (GPT / 通义千问 / 本地模型)
- 结果存入数据库，可通过 REST API 查询

### 14.2 合同审查助手

**功能:**
- 上传 PDF/DOCX 文档
- AI 自动提取关键条款
- 风险条款标注 + 评级
- 修改建议生成
- 与会议上下文关联 (在会议中讨论合同时自动关联)

**架构:** 独立 AI 微服务，通过 REST API 与信令服务集成

---

## 十五、统一分层架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  1. CLIENT LAYER                                             │   │
│  │     ┌─────────────┐  ┌──────────────┐  ┌────────────────┐   │   │
│  │     │  Web Client  │  │Android Client│  │ Desktop (未来)  │   │   │
│  │     │ React+Vite  │  │ Java+WebRTC │  │  Electron      │   │   │
│  │     │ ✅ 已完成    │  │ ✅ 已完成   │  │  💻 未来       │   │   │
│  │     └─────────────┘  └──────────────┘  └────────────────┘   │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐   │
│  │  2. SIGNALING LAYER (Spring Boot 4.1)                        │   │
│  │     ┌──────────────┐  ┌──────────────┐  ┌────────────────┐   │   │
│  │     │ SignalHandler │  │ ApiController│  │ PersistenceSvc │   │   │
│  │     │ WebSocket     │  │ REST API     │  │ @Async MySQL   │   │   │
│  │     │ ✅ 已完成     │  │ ✅ 已完成    │  │ ✅ 已完成      │   │   │
│  │     └──────────────┘  └──────────────┘  └────────────────┘   │   │
│  └────────────────────────┬─────────────────────────────────────┘   │
│                           │                                         │
│  ┌────────────────────────▼─────────────────────────────────────┐   │
│  │  3. DATA LAYER                                                │   │
│  │     ┌──────────────────────┐  ┌──────────────────────────┐   │   │
│  │     │ MySQL 9.6            │  │ Redis (未来 - Phase 4)   │   │   │
│  │     │ users/rooms/messages │  │ 会话存储 + Pub/Sub       │   │   │
│  │     │ ✅ 已完成             │  │ ☁️ 云部署时添加          │   │   │
│  │     └──────────────────────┘  └──────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  4. REAL-TIME FEATURES                                        │   │
│  │     ┌─────────┐  ┌─────────┐  ┌────────────┐  ┌──────────┐   │   │
│  │     │ Chat    │  │ Danmaku │  │ Speaker    │  │ Screen   │   │   │
│  │     │ ✅      │  │ ✅      │  │ Detection  │  │ Share    │   │   │
│  │     │         │  │         │  │ ✅         │  │ ✅       │   │   │
│  │     └─────────┘  └─────────┘  └────────────┘  └──────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  5. AI LAYER (未来 - Phase 5)                                 │   │
│  │     ┌──────────────────┐  ┌──────────────────────────────┐   │   │
│  │     │ Meeting Summary  │  │ Contract Review Assistant    │   │   │
│  │     │ 🤖 LLM 集成     │  │ 🤖 文档分析 + 风险检测       │   │   │
│  │     └──────────────────┘  └──────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  6. DEPLOYMENT LAYER                                          │   │
│  │     ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │   │
│  │     │ LAN      │  │ Docker   │  │ Cloud    │  │ K8s      │   │   │
│  │     │ ✅ 当前   │  │ ☁️ 准备  │  │ ☁️ 规划  │  │ 🔜 未来  │   │   │
│  │     └──────────┘  └──────────┘  └──────────┘  └──────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 接口解耦原则

| 层级 | 上层接口 | 下层接口 |
|------|----------|----------|
| Client ↔ Signaling | WebSocket JSON 协议 (v3) | — |
| Client ↔ Data | REST API (/api/*) | — |
| Signaling ↔ Data | PersistenceService (Spring DI) | JPA Repository |
| Signaling ↔ Redis | RoomService 接口 (未来) | RedisTemplate |
| AI ↔ Data | REST API 或消息队列 | MySQL 读取 |

所有层之间通过 **接口 (Interface)** 解耦，替换实现不影响上层调用者。

