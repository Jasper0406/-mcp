# MCP音乐服务平台 v2

基于小智AI机器人的新一代音乐服务MCP平台，提供完整的音乐管理、播放控制和实时通信功能。

这是一个基于小智AI机器人的一站式音乐服务，主要功能是调用本地音乐库并通过API接口实现在小智AI机器人上运行。

## 功能特性

### 核心功能
- 🎵 完整的音乐库管理（扫描、索引、搜索）
- 🎧 高级播放控制（播放、暂停、继续、停止）
- 🔄 实时状态同步
- 📱 RESTful API接口
- 🌐 WebSocket实时通信
- 🤖 小智AI机器人集成
- 📊 完善的日志记录

### 高级特性
- 📁 支持多种音频格式（MP3、WAV、FLAC、M4A、AAC、OGG）
- 🎨 音乐元数据提取（标题、艺术家、专辑、流派等）
- 📷 封面图片支持
- 🔍 高级搜索和过滤
- 📈 分页支持
- ⚡ 音频流式传输
- 🔒 安全配置（CORS、速率限制、API密钥）
- 🔄 自动重连机制
- 📱 多客户端支持

- 本地音乐库扫描与管理
- RESTful API接口提供音乐查询、播放等功能
- 与小智AI机器人集成
- 支持音乐分类、搜索和播放控制

## 项目结构

- `main.js`: 主应用入口
- `config.js`: 配置文件
- `musicManager.js`: 音乐库管理模块
- `apiServer.js`: API服务器模块
- `utils/`: 工具函数目录

## 安装与使用

1. 安装依赖：
```bash
npm install
```

2. 配置音乐库路径：
修改 `config.js` 中的音乐库路径配置

3. 启动服务：
```bash
npm start
```

4. 集成到小智AI机器人：
参考以下配置进行设置

## 小智AI机器人配置
```javascript
xiaozhi: {
  enabled: true,                            // 是否启用
  websocketUrl: 'wss://api.xiaozhi.me/mcp', // WebSocket地址
  token: 'your_token_here',                 // 身份验证令牌
  reconnectInterval: 5000,                  // 重连间隔
  maxReconnectAttempts: 5                   // 最大重连次数
}
```

> **重要提示**：`token` 是必需的，用于身份验证。请从IMCP广场或小智AI平台获取有效的令牌。

### WebSocket通信

MCP音乐服务平台支持通过WebSocket与小智AI机器人进行实时通信。WebSocket URL格式为：

```
wss://api.xiaozhi.me/mcp?token=your_token_here
```

其中 `your_token_here` 应替换为实际的身份验证令牌。系统会自动处理连接建立、消息收发和断开重连逻辑。

## 技术栈

- **Node.js** - 运行时环境
- **Express** - Web框架
- **WebSocket** - 实时通信
- **Music-Metadata** - 音乐元数据提取
- **Winston** - 日志管理
- **Dotenv** - 环境变量管理
- **Nanoid** - 唯一ID生成
- **Express-Rate-Limit** - 请求速率限制
- **Helmet** - 安全增强

## API文档

### 音乐查询
GET /api/music/search?query=关键词

### 获取音乐列表
GET /api/music/list

### 播放音乐
GET /api/music/play?id=音乐ID

### 暂停音乐
GET /api/music/pause

### 继续播放
GET /api/music/resume

### 停止播放
GET /api/music/stop

## 许可证
MIT