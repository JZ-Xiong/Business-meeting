# WebRTC Meet — 新手快速上手指南

> 📖 本文档面向零基础用户，手把手教你跑通整个项目。
> 如需查看完整架构和高级配置，请阅读 [OPERATION_GUIDE.md](../webrtc-project/OPERATION_GUIDE.md)。

---

## 📋 目录

1. [这个项目是什么？](#1-这个项目是什么)
2. [准备工作（安装软件）](#2-准备工作安装软件)
3. [第一次运行 — Web 端](#3-第一次运行--web-端)
4. [第一次运行 — Android 端](#4-第一次运行--android-端)
5. [两人视频通话测试](#5-两人视频通话测试)
6. [常见问题（遇到报错看这里）](#6-常见问题遇到报错看这里)
7. [项目文件说明](#7-项目文件说明)

---

## 1. 这个项目是什么？

**WebRTC Meet** 是一个局域网视频会议系统，类似于简化版 Zoom / 腾讯会议。

它能做到：
- 🎥 **多人视频通话** — 打开浏览器或手机 App 就能开会
- 💬 **实时聊天** — 文字消息实时同步，会后可查历史
- 📺 **弹幕** — 像 B 站一样在视频上发弹幕
- 🖥️ **屏幕共享** — 分享你的桌面
- 📱 **手机参会** — Android App 可与电脑互通

**工作原理（简单版）:**

```
你的电脑/手机 ──(视频 + 音频)──► 对方的电脑/手机
      │                                  │
      │          ┌──────────┐            │
      └──(信令)──► 信令服务器 ◄──(信令)──┘
                 │ 后端程序  │
                 └──────────┘
                       │
                   ┌───▼───┐
                   │ MySQL │
                   │ 数据库 │
                   └───────┘
```

> 💡 视频/音频是点对点传输（浏览器直接传），不经过服务器。
> 服务器只负责"牵线搭桥"（信令）和保存聊天记录。

---

## 2. 准备工作（安装软件）

### 你需要安装这些 ⬇️

| # | 软件 | 做什么用的 | 下载地址 | 怎么检查已安装 |
|---|------|-----------|---------|--------------|
| 1 | **JDK** (Java) | 运行后端服务器 | [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) 或 [Adoptium](https://adoptium.net/) | 打开命令行输入 `java -version` |
| 2 | **Maven** | 编译后端代码 | [Maven 下载](https://maven.apache.org/download.cgi) | `mvn -v` |
| 3 | **Node.js** | 运行前端开发服务 | [Node.js 官网](https://nodejs.org/) (选 LTS 版) | `node -v` |
| 4 | **MySQL** | 存储聊天记录 | [MySQL 下载](https://dev.mysql.com/downloads/installer/) | `mysql --version` |
| 5 | **Chrome 浏览器** | 使用 Web 端 | [Chrome 下载](https://www.google.com/chrome/) | 已有就行 |

> ⚠️ **没安装过 Java/Maven/Node？**
> 
> 安装完后需要配置环境变量，让命令行能找到这些程序。
> 搜索关键词: "Windows 配置 Java 环境变量" / "Maven 配置环境变量"

### 验证安装 ✅

打开 **PowerShell** (按 Win+X 选 "终端")，依次输入:

```powershell
java -version       # 应显示 java version "17..." 或更高
mvn -v              # 应显示 Apache Maven 3.9...
node -v             # 应显示 v18... 或更高
npm -v              # 应显示 9... 或更高
mysql --version     # 应显示 mysql Ver 8... 或 9...
```

**全部显示版本号 = 安装成功！**

---

## 3. 第一次运行 — Web 端

### 3.1 创建数据库（只需做一次）

1. 打开 PowerShell，输入:

```powershell
mysql -u root
```

> 如果你的 MySQL 设了密码，用 `mysql -u root -p` 然后输入密码

2. 在 MySQL 命令行中输入:

```sql
CREATE DATABASE webrtc_meet;
```

3. 输入 `exit` 退出 MySQL

### 3.2 启动后端（信令服务器）

```powershell
# 进入后端文件夹
cd D:\Webrtc\Business-meeting\webrtc-project\backend

# 编译并运行（首次会下载依赖，可能需要几分钟）
mvn spring-boot:run
```

**等待看到这行字 = 启动成功:**

```
Started WebrtcApplication in X.X seconds
```

> ⚡ **不要关掉这个窗口！** 后端需要一直运行。

### 3.3 启动前端

**打开一个新的 PowerShell 窗口** (别关闭后端那个)：

```powershell
# 进入前端文件夹
cd D:\Webrtc\Business-meeting\webrtc-project\frontend

# 首次运行 — 安装依赖
npm install

# 启动开发服务器
npm run dev
```

**看到这行字 = 启动成功:**

```
Local:   http://localhost:5173/
```

### 3.4 打开浏览器

1. 打开 Chrome
2. 地址栏输入: **`http://localhost:5173`**
3. 你会看到加入房间的页面

### 3.5 加入会议

1. **Room ID**: 保持默认 `room-1`（或随便起个名字）
2. **Your Name**: 输入你的名字
3. 点击 **Join Room**
4. 浏览器会弹窗询问摄像头和麦克风权限 → 点 **允许**
5. 🎉 你进入会议了！

---

## 4. 第一次运行 — Android 端

### 4.1 APK 在哪？

已编译好的 APK 位于:

```
D:\Webrtc\Business-meeting\android-client\app\build\outputs\apk\debug\app-debug.apk
```

### 4.2 安装到手机

**方式 A: USB 安装 (推荐)**

1. 手机开启 **USB 调试** (设置 → 开发者选项 → USB 调试)
2. 用 USB 数据线连接手机和电脑
3. 打开 PowerShell:

```powershell
adb install D:\Webrtc\Business-meeting\android-client\app\build\outputs\apk\debug\app-debug.apk
```

**方式 B: 直接传输**

1. 把 `app-debug.apk` 文件发送到手机 (微信/QQ/数据线均可)
2. 在手机上打开并安装 (可能需要允许 "安装未知来源应用")

### 4.3 使用 App

1. 打开 **WebRTC Meet** App
2. 填写:
   - **Server IP**: 你电脑的局域网 IP 地址 (见下方获取方法)
   - **Room ID**: 和 Web 端相同的房间号
   - **Your Name**: 你的名字
3. 点击 **Join Room**
4. 允许摄像头和麦克风权限

### 如何查看电脑的 IP 地址？

```powershell
ipconfig
```

找到 **无线局域网适配器 WLAN** 或 **以太网适配器** 下面的 **IPv4 地址**，通常是 `192.168.x.x`

> ⚠️ **关键前提**: 手机和电脑必须连接 **同一个 WiFi / 同一个局域网**

### 4.4 重新编译 APK（如果修改了代码）

```powershell
# 必须使用 Android Studio 自带的 Java 21
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"

cd D:\Webrtc\Business-meeting\android-client
.\gradlew.bat assembleDebug --no-daemon
```

或者直接用 **Android Studio** 打开 `android-client` 文件夹，点击 ▶ Run。

---

## 5. 两人视频通话测试

### 场景 A: 两个浏览器窗口

1. 确保后端和前端都已启动
2. Chrome 打开 `http://localhost:5173` → 用名字 "Alice" 加入 `room-1`
3. 再开一个 **无痕窗口** (Ctrl+Shift+N) → 打开同样地址 → 用 "Bob" 加入 `room-1`
4. 两边应该都能看到对方的视频

### 场景 B: 电脑 + 手机

1. 确保后端已启动
2. 电脑浏览器: `http://localhost:5173` → "Alice" 加入 `room-1`
3. 手机 App: 输入电脑 IP → "Bob" 加入 `room-1`
4. 两端视频互通 + 聊天互通

### 场景 C: 局域网内多台电脑

1. 确保后端已启动
2. 查看跑后端的电脑 IP: `ipconfig` → 找到 `192.168.x.x`
3. 其他电脑浏览器打开: `http://192.168.x.x:5173`
4. 所有人加入同一个 Room ID 即可

> 💡 **提示**: 局域网使用时，其他电脑的浏览器可能会提示 "不安全"，
> 这是因为 WebRTC 需要 HTTPS。 可以在 Chrome 中输入
> `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
> 添加你的服务地址到白名单。

---

## 6. 常见问题（遇到报错看这里）

### ❌ 后端启动报 "MySQL 连接失败"

```
HikariPool-1 - Exception during pool initialization
```

**原因**: MySQL 没启动 或 数据库没创建

**解决方法**:

```powershell
# 1. 检查 MySQL 是否在运行
Get-Service -Name 'mysql*'

# 如果没运行，启动它:
Start-Service MySQL90    # MySQL 9.0 的服务名，具体看你安装的版本

# 2. 检查数据库是否存在
mysql -u root -e "SHOW DATABASES LIKE 'webrtc%'"

# 如果不存在，创建:
mysql -u root -e "CREATE DATABASE webrtc_meet"
```

### ❌ 前端 `npm install` 很慢

**解决**: 使用国内镜像源

```powershell
npm config set registry https://registry.npmmirror.com
npm install
```

### ❌ 浏览器看不到视频 / 没有摄像头权限弹窗

**原因**: 浏览器安全策略阻止了非 HTTPS 页面访问摄像头

**解决 (localhost 正常，局域网 IP 需要操作)**:
1. Chrome 地址栏输入: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
2. 添加你的服务地址 (如 `http://192.168.3.36:5173`)
3. 设为 **Enabled** → 重启浏览器

### ❌ 两个人进房间但看不到对方视频

**排查步骤**:
1. 确认两人输入的 **Room ID 完全一致** (区分大小写)
2. 按 F12 打开浏览器开发者工具 → Console 看有没有红色报错
3. 确认后端 PowerShell 窗口没有报错
4. 试试刷新页面重新加入

### ❌ Android App 连接不上服务器

**排查步骤**:
1. 确认手机和电脑在 **同一个 WiFi** 下
2. 确认 Server IP 地址正确 (电脑上跑 `ipconfig` 检查)
3. 确认后端正在运行 (端口 8080)
4. 检查 Windows 防火墙是否拦截了 8080 端口:

```powershell
# 添加防火墙规则 (管理员运行)
New-NetFirewallRule -DisplayName "WebRTC Backend" -Direction Inbound -Port 8080 -Protocol TCP -Action Allow
```

### ❌ `mvn spring-boot:run` 报错 "找不到 mvn 命令"

**原因**: Maven 没安装或没配置环境变量

**解决**:
1. 下载 Maven: https://maven.apache.org/download.cgi
2. 解压到任意目录 (如 `C:\apache-maven-3.9.9`)
3. 添加到环境变量:
   - `MAVEN_HOME` = `C:\apache-maven-3.9.9`
   - `Path` 里添加 `%MAVEN_HOME%\bin`
4. **重启 PowerShell**，再试 `mvn -v`

---

## 7. 项目文件说明

```
Business-meeting/                 ← 整个项目根目录
│
├── docs/                         ← 📚 文档 (你正在看的)
│   ├── QUICK_START.md            # 本文档 — 新手指南
│   ├── OPERATION_GUIDE.md        # 详细操作指南 (进阶)
│   ├── EXTENSION_PLAN.md         # 未来扩展计划
│   └── ARCHITECTURE.md           # 系统架构图
│
├── webrtc-project/               ← 🌐 Web 版本
│   ├── backend/                  # 后端 (Java + Spring Boot)
│   │   ├── pom.xml               #   依赖配置
│   │   └── src/...               #   Java 源代码
│   │
│   └── frontend/                 # 前端 (React)
│       ├── package.json          #   依赖配置
│       └── src/...               #   React 源代码
│
├── android-client/               ← 📱 Android 版本
│   ├── README.md                 #   Android 构建说明
│   ├── app/build.gradle          #   依赖配置
│   └── app/src/...               #   Java 源代码 + 布局
│
└── webrtc-demo/                  ← 📦 早期实验代码 (可忽略)
```

### 哪些文件你可能需要修改？

| 需求 | 要改的文件 | 说明 |
|------|----------|------|
| 修改数据库密码 | `backend/src/main/resources/application.properties` | 改 `spring.datasource.password` |
| 修改后端端口 | 同上 | 改 `server.port=8080` |
| 修改前端样式 | `frontend/src/index.css` | CSS 样式 |
| 修改 Android 服务器地址 | 打开 App 时输入即可 | 不用改代码 |

---

## 🎉 恭喜！

如果你成功看到了视频通话画面，说明整个系统已经跑通了。

**下一步可以:**
- 📖 阅读 [OPERATION_GUIDE.md](../webrtc-project/OPERATION_GUIDE.md) 了解更多配置项
- 📱 试试 Web 端和 Android 端互通
- 💬 试试聊天和弹幕功能
- 🔧 阅读 [EXTENSION_PLAN.md](./EXTENSION_PLAN.md) 了解未来扩展计划

> 有问题？先看第 6 节常见问题。还解决不了的话，检查后端和前端的命令行窗口有没有报错信息。
