# WebRTC Meet — 操作指南 (v2)

## 一、环境要求

| 组件 | 最低版本 | 用途 | 安装检查命令 |
|------|----------|------|-------------|
| **JDK** | 25+ | 后端 Spring Boot 编译运行 | `java -version` |
| **Maven** | 3.9+ | 后端构建工具 | `mvn -v` |
| **Node.js** | 18+ | 前端构建 & 开发服务器 | `node -v` |
| **npm** | 9+ | 前端依赖管理 | `npm -v` |
| **浏览器** | Chrome 90+ / Edge 90+ / Firefox 85+ | 必须支持 WebRTC | — |

> **⚠ 重要**: WebRTC 要求 HTTPS 或 `localhost` 环境。局域网测试需要 HTTPS 证书。

---

## 二、项目结构

```
webrtc-project/
├── OPERATION_GUIDE.md                 # 本文档
├── EXTENSION_PLAN.md                  # 扩展方案文档
│
├── backend/                           # Java 信令服务器
│   ├── pom.xml
│   └── src/main/java/com/example/webrtc/
│       ├── WebrtcApplication.java     # Spring Boot 启动类
│       ├── config/
│       │   ├── WebSocketConfig.java   # WebSocket 端点配置
│       │   └── JacksonConfig.java     # ObjectMapper Bean 注册
│       ├── handler/
│       │   └── SignalHandler.java     # 信令处理核心 (join/leave/chat/relay)
│       ├── model/
│       │   └── SignalMessage.java     # 信令消息模型
│       └── service/
│           ├── RoomService.java       # 房间管理
│           └── UserService.java       # 用户会话管理
│
├── frontend/                          # React 前端
│   ├── index.html                     # HTML 入口
│   ├── package.json
│   ├── vite.config.js                 # Vite 构建配置
│   ├── tailwind.config.js             # Tailwind CSS 主题
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx                   # React 挂载入口
│       ├── App.jsx                    # 主应用 (Zoom 风格布局)
│       ├── index.css                  # Tailwind + 全局样式
│       │
│       ├── hooks/                     # 自定义 React Hooks
│       │   ├── useLocalStream.js      # 摄像头/麦克风/屏幕共享/模糊
│       │   ├── useWebSocket.js        # WebSocket 连接 + 自动重连 + 聊天
│       │   ├── useMultiPeerConnection.js  # 多人 Mesh RTCPeerConnection
│       │   ├── useActiveSpeaker.js    # 活跃说话人检测 (AudioContext)
│       │   └── useNetworkQuality.js   # 网络质量检测 (getStats)
│       │
│       └── components/                # UI 组件
│           ├── JoinScreen.jsx         # 加入房间页 (毛玻璃卡片)
│           ├── TopBar.jsx             # 顶部栏 (房间名/计时器/用户)
│           ├── VideoGrid.jsx          # 视频网格 + 说话人模式
│           ├── VideoTile.jsx          # 单个视频卡片
│           ├── ControlBar.jsx         # 底部控制栏 (7个按钮)
│           ├── Sidebar.jsx            # 右侧边栏容器
│           ├── ChatPanel.jsx          # 聊天面板
│           ├── ParticipantList.jsx    # 参与者列表
│           ├── AvatarFallback.jsx     # 摄像头关闭头像
│           ├── NetworkBadge.jsx       # 网络质量指示器
│           └── StatusToast.jsx        # 状态通知浮层
```

---

## 三、快速启动 (详细步骤)

### 步骤 1: 克隆或打开项目

```bash
# 确认项目路径
cd d:\Webrtc\webrtc-project
```

---

### 步骤 2: 启动后端信令服务器

#### 方式 A — IntelliJ IDEA (推荐新手)

1. 打开 IntelliJ IDEA
2. 菜单: `File` → `Open` → 选择 `webrtc-project/backend` 目录
3. 等待右下角进度条完成 (Maven 正在下载依赖)
4. 左侧项目树找到: `src/main/java/com/example/webrtc/WebrtcApplication.java`
5. 双击打开该文件
6. 找到 `public static void main` 方法, 左侧会有一个 ▶ 绿色三角
7. 点击 ▶ → `Run 'WebrtcApplication'`
8. 等待控制台输出:
   ```
   Started WebrtcApplication in X.XXX seconds
   ```
9. ✅ 后端启动成功

#### 方式 B — 命令行

```bash
cd webrtc-project/backend

# 首次运行,会下载 Maven 依赖 (可能需要几分钟)
mvn spring-boot:run
```

等待看到:
```
Tomcat started on port 8080 (http) with context path '/'
Started WebrtcApplication in 1.082 seconds
```

> 后端默认端口: **8080**
> WebSocket 端点: `ws://localhost:8080/ws`

#### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `java: error: release 25` | JDK 版本太低 | 安装 JDK 25+ |
| `Port 8080 already in use` | 端口被占用 | 关闭其他占用 8080 的程序, 或修改 `application.properties` 中 `server.port=8081` |
| `Could not resolve dependencies` | Maven 仓库无法访问 | 配置 Maven 镜像 (如阿里云镜像) |

---

### 步骤 3: 启动前端开发服务器

```bash
cd webrtc-project/frontend

# 第一次运行必须安装依赖
npm install

# 启动 Vite 开发服务器
npm run dev
```

等待看到:
```
VITE v8.0.8  ready in 197 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.x.x:5173/
```

> 前端默认端口: **5173**
> 浏览器打开: `http://localhost:5173`

#### 常见问题

| 问题 | 原因 | 解决方案 |
|------|------|----------|
| `Cannot find module xxx` | 未安装依赖 | 运行 `npm install` |
| 端口冲突 | 5173 被占用 | Vite 会自动使用 5174 |
| 页面空白 | 浏览器缓存 | Ctrl+Shift+R 硬刷新 |

---

### 步骤 4: 使用会议功能

#### 4.1 加入房间

1. 浏览器打开 `http://localhost:5173`
2. 你会看到 **Join Screen** (深色毛玻璃卡片)
3. **Room ID**: 默认 `room-1`, 可以改为任意名称
4. **Your Name**: 输入你的名字 (如 `Alice`)
5. 点击 **Join Room** 按钮
6. 浏览器会弹出摄像头/麦克风权限请求 → 点击 **允许**
7. 进入会议主界面

#### 4.2 多人通话

1. **打开另一个浏览器标签页** (或另一台电脑)
2. 访问相同地址 `http://localhost:5173`
3. 输入 **相同的 Room ID** (如 `room-1`)
4. 输入 **不同的名字** (如 `Bob`)
5. 点击 **Join Room**
6. 系统会自动建立 WebRTC P2P 连接
7. 两个人的视频会自动出现在 **VideoGrid** 中

> **多人模式**: 可以有 3+ 人同时加入同一房间, 系统使用 Mesh 拓扑自动建立两两连接。

#### 4.3 使用控制栏

底部控制栏从左到右的 7 个按钮:

| # | 图标 | 功能 | 说明 |
|---|------|------|------|
| 1 | 🎤 | 麦克风开关 | 关闭时按钮显示红色边框 |
| 2 | 📷 | 摄像头开关 | 关闭时显示 Avatar 头像占位 |
| 3 | 🖥 | 屏幕共享 | 共享桌面替换摄像头画面 |
| 4 | 🖼 | 背景模糊 | CSS 模糊效果 |
| 5 | 💬 | 聊天 | 打开右侧聊天面板 |
| 6 | 👥 | 参与者 | 打开右侧参与者列表 |
| 7 | 🔴 | 离开会议 | 断开所有连接, 返回加入页 |

#### 4.4 使用聊天

1. 点击控制栏 💬 图标, 右侧打开聊天面板
2. 在底部输入框输入消息
3. 点击发送或按 Enter
4. 消息会实时同步到房间内所有人
5. 自己的消息显示在右侧 (紫色气泡)
6. 别人的消息显示在左侧 (灰色气泡)
7. 未读消息时, 💬 按钮上会显示红色角标

#### 4.5 查看参与者

1. 点击控制栏 👥 图标
2. 右侧显示所有房间内用户
3. 每个用户旁边有状态指示 (Connected / Connecting / In room)
4. 正在说话的用户会有绿色脉冲动画

---

## 四、界面布局说明

### Zoom 风格三段式布局

```
+----------------------------------------------------------+
| TopBar: [🟢 room-1 | 1 participant]  [00:05]  [Alice 🟣] |
|----------------------------------------------------------|
|                                                          |
|                    VideoGrid                             |
|                                                          |
|   ┌─────────────┐  ┌─────────────┐                      |
|   │  Alice (You) │  │     Bob     │                      |
|   │   📹 video   │  │   📹 video   │                      |
|   └─────────────┘  └─────────────┘                      |
|                                                          |
|----------------------------------------------------------|
| ControlBar: [🎤] [📷] [🖥] [🖼] | [💬] [👥] | [🔴 Leave]  |
+----------------------------------------------------------+
```

### Active Speaker (说话人高亮) 模式

当超过 2 人且检测到说话人时, 自动切换为:
```
+------------------------------------------+
|        Active Speaker (大画面)            |
|                                          |
|------------------------------------------|
| [小1] [小2] [小3] ...  (thumbnail 条)     |
+------------------------------------------+
```

### 侧边栏

点击 💬 或 👥 按钮, 右侧 320px 宽侧边栏滑出:
```
+-------------------------------+----------+
|                               |  Chat    |
|         VideoGrid             |  ──────  |
|                               |  msgs... |
|-------------------------------| [input]  |
| ControlBar                    |          |
+-------------------------------+----------+
```

---

## 五、信令协议 v2

所有消息通过 WebSocket 以 JSON 格式传输。

### 客户端 → 服务端

| 类型 | 用途 | 必填字段 |
|------|------|----------|
| `join` | 加入房间 | `type`, `roomId`, `from` |
| `leave` | 离开房间 | `type`, `roomId`, `from` |
| `chat` | 发送聊天 | `type`, `roomId`, `from`, `data.text` |
| `offer` | SDP Offer | `type`, `roomId`, `from`, `to`, `data.sdp` |
| `answer` | SDP Answer | `type`, `roomId`, `from`, `to`, `data.sdp` |
| `candidate` | ICE Candidate | `type`, `roomId`, `from`, `to`, `data.candidate` |

### 服务端 → 客户端

| 类型 | 用途 | 数据 |
|------|------|------|
| `room-users` | 当前用户列表 | `data.users: string[]` |
| `user-joined` | 用户加入 | `data.userId: string` |
| `user-left` | 用户离开 | `data.userId: string` |
| `chat` | 聊天消息 (广播) | `from`, `data.text`, `data.timestamp` |
| `error` | 错误 | `data.message: string` |

### 多人通话建立流程

```
Alice                Server              Bob               Charlie
  │                    │                   │                   │
  ├─── join ──────────►│                   │                   │
  │◄── room-users ─────┤                   │                   │
  │                    │                   │                   │
  │                    │◄─── join ─────────┤                   │
  │◄── user-joined ────┤── room-users ────►│                   │
  │                    │                   │                   │
  │    (Bob calls Alice based on room-users)                   │
  │◄── offer ──────────┤◄── offer ─────────┤                   │
  │── answer ─────────►│── answer ────────►│                   │
  │◄═══ P2P 1 ════════════════════════════►│                   │
  │                    │                   │                   │
  │                    │◄──────────── join ─┤───────────────────┤
  │◄── user-joined ────┤── user-joined ───►│                   │
  │                    │── room-users ────────────────────────►│
  │                    │                   │                   │
  │   (Charlie calls Alice & Bob from room-users)              │
  │◄── offer ──────────┤◄─── offer ────────┤◄── offer ────────┤
  │── answer ─────────►│── answer ────────►│── answer ────────►│
  │◄═══ P2P 2 ════════════════════════════════════════════════►│
  │                    │◄═══ P2P 3 ════════════════════════════►│
```

---

## 六、高级功能说明

### VideoGrid 自适应布局算法

| 参与者数 | 布局 |
|----------|------|
| 1 | 1×1 全屏 |
| 2 | 1×2 左右 |
| 3-4 | 2×2 网格 |
| 5-6 | 2×3 网格 |
| 7-9 | 3×3 网格 |
| 10+ | √n × √n 自动计算 |

### Active Speaker 检测

* 使用 **Web Audio API (AudioContext)** 实时分析所有音频流
* 检测频率: 每一帧 (requestAnimationFrame)
* 阈值: 平均音量 > 15 判定为说话
* 最高音量用户被标记为 `activeSpeaker`
* 超过 2 人时自动切换 Speaker Layout

### 网络质量监测

通过 `RTCPeerConnection.getStats()` 每 3 秒采样:
* **RTT (Round Trip Time)**: < 100ms 优秀, < 300ms 良好, < 500ms 较差
* **丢包率**: < 1% 优秀, < 5% 良好, < 10% 较差

---

## 七、常见问题排查

### Q1: 看不到视频 / 无法获取摄像头

**排查步骤:**
1. 地址栏确认是 `localhost` 或 `https://` (WebRTC 要求安全上下文)
2. 浏览器 → 设置 → 隐私权 → 摄像头 → 确保未被阻止
3. 检查是否有其他程序占用摄像头 (如 Zoom / Teams)
4. 按 F12 打开开发者工具 → Console 查看错误信息

### Q2: WebSocket 连接失败 (红色指示灯)

**排查步骤:**
1. 确认后端已启动, 终端有 `Started WebrtcApplication` 输出
2. 检查后端端口: `netstat -an | findstr 8080` (Windows)
3. 确认前端在 `localhost` 而非 `127.0.0.1` (跨域问题)
4. 检查防火墙设置

### Q3: 能进入房间但看不到对方

**排查步骤:**
1. 两个用户必须使用 **完全相同的 Room ID**
2. 检查控制台是否有 ICE candidate 错误
3. 如果在不同网络, 需要配置 TURN 服务器 (见扩展方案)

### Q4: 聊天消息发不出去

**排查步骤:**
1. 确认 WebSocket 连接正常 (TopBar 绿色指示灯)
2. 检查终端后端日志是否有 `"Chat requires..."` 错误
3. F12 → Network → WS → 检查消息是否发送

### Q5: 多人场景下卡顿

**原因:** Mesh 拓扑下每个用户都需要与其他所有人建立独立连接
**缓解:**
- 3 人以内效果最佳
- 降低视频分辨率 (`getUserMedia` 约束)
- 参考 `EXTENSION_PLAN.md` 中的 SFU 方案

---

## 八、构建生产版本

### 前端打包

```bash
cd webrtc-project/frontend
npm run build
```

构建产物在 `dist/` 目录:
```
dist/
├── index.html          (~0.9 KB)
├── assets/
│   ├── index-xxx.css   (~25 KB, gzip ~5.5 KB)
│   └── index-xxx.js    (~224 KB, gzip ~69 KB)
```

### 后端打包

```bash
cd webrtc-project/backend
mvn package -DskipTests
```

产物: `target/webrtc-signal-server-0.0.1-SNAPSHOT.jar`

### 部署到服务器

```bash
# 1. 启动后端
java -jar webrtc-signal-server-0.0.1-SNAPSHOT.jar

# 2. 部署前端到 Nginx
# 将 dist/ 目录内容复制到 Nginx 的 html 目录
```

Nginx 配置 (反向代理 WebSocket):
```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /var/www/webrtc-meet/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

---

## 九、技术栈总览

| 层 | 技术 | 版本 |
|---|------|------|
| 前端框架 | React | 19.2 |
| 构建工具 | Vite | 8.0 |
| CSS 框架 | Tailwind CSS | 3.4 |
| 后端框架 | Spring Boot | 4.1 |
| 通信协议 | WebSocket / WebRTC | — |
| 实时媒体 | RTCPeerConnection API | — |
| 音频分析 | Web Audio API (AudioContext) | — |
| 网络检测 | RTCPeerConnection.getStats() | — |
| 多人拓扑 | Mesh (全连接) | — |
