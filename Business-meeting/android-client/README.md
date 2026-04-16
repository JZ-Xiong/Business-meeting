# Android Client — WebRTC Meet

局域网 WebRTC 视频会议 Android 客户端。

## 功能

| 功能 | 状态 |
|------|------|
| 加入房间 (Server IP + Room ID + Name) | ✅ |
| 本地摄像头预览 (前置优先) | ✅ |
| 远程视频渲染 | ✅ |
| 多人 Mesh 连接 (offer/answer/ICE) | ✅ |
| 实时聊天 (房间隔离) | ✅ |
| 麦克风/摄像头开关 | ✅ |
| 网络自动重连 (指数退避) | ✅ |
| 权限处理 (Camera/Mic) | ✅ |
| 离开房间 + 资源释放 | ✅ |

## 构建方式

### 方式 1: Android Studio (推荐)

1. 打开 Android Studio
2. `File → Open` → 选择 `android-client/` 文件夹
3. 等待 Gradle 同步完成 (首次需下载依赖)
4. 连接手机或启动模拟器
5. 点击 `Run ▶` → 选择设备 → 安装

### 方式 2: 命令行

```bash
# 确保已设置 ANDROID_HOME
set ANDROID_HOME=C:\Users\Admin\AppData\Local\Android\Sdk

# 构建 Debug APK
gradlew assembleDebug

# APK 产物位置
# app/build/outputs/apk/debug/app-debug.apk

# 安装到连接的设备
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 使用说明

1. 确保手机和电脑在 **同一局域网**
2. 启动后端: `cd webrtc-project/backend && mvn spring-boot:run`
3. 打开 Android App
4. 输入:
   - **Server IP**: 运行后端的电脑 IP (如 `192.168.3.36`)
   - **Room ID**: 房间号 (如 `room-1`)
   - **Your Name**: 你的名字
5. 点击 **Join Room**
6. 允许摄像头和麦克风权限

## 与 Web 端互通

Android 和 Web 使用 **完全相同的信令协议 (v3)**:
- 加入同一 Room ID → 自动建立 WebRTC P2P 连接
- 聊天消息双向同步
- 所有消息自动持久化到 MySQL

## 技术栈

| 组件 | 版本 |
|------|------|
| compileSdk | 36 |
| minSdk | 24 (Android 7.0+) |
| WebRTC | org.webrtc:google-webrtc:1.0.32006 |
| WebSocket | OkHttp 4.12.0 |
| JSON | Gson 2.11.0 |
| UI | Material Components + ConstraintLayout |

## 文件结构

```
app/src/main/java/com/example/webrtcmeet/
├── MainActivity.java           # 加入房间 (权限检查)
├── CallActivity.java           # 通话界面 (视频+聊天+控制)
├── ChatAdapter.java            # 聊天 RecyclerView 适配器
├── signaling/
│   ├── SignalingClient.java    # OkHttp WebSocket (含重连)
│   ├── SignalingListener.java  # 回调接口
│   └── SignalMessage.java      # 消息模型
└── webrtc/
    └── WebRTCClient.java       # PeerConnection Mesh 管理
```
