// 项目配置文件

module.exports = {
  // 音乐库配置
  musicLibrary: {
    path: 'e:/MCP/Music/library', // 默认音乐库路径
    supportedFormats: ['.mp3', '.wav', '.flac', '.aac', '.ogg'], // 支持的音乐格式
    scanInterval: 60000, // 音乐库扫描间隔（毫秒）
  },
  
  // API服务配置
  apiServer: {
    port: 3000, // API服务端口
    host: 'localhost', // API服务主机
    corsEnabled: true, // 是否启用CORS
  },
  
  // 小智AI机器人集成配置
  xiaozhi: {
    apiKey: '', // 小智AI机器人API密钥
    apiEndpoint: '', // 小智AI机器人API端点
    commandPrefix: '音乐', // 命令前缀
    websocketUrl: 'wss://api.xiaozhi.me/mcp?token=your token', // 小智AI机器人WebSocket地址
  },
  
  // 播放器配置
  player: {
    defaultVolume: 80, // 默认音量（0-100）
    autoPlay: false, // 是否自动播放
  },
  
  // 日志配置
  logging: {
    level: 'info', // 日志级别: debug, info, warn, error
    file: 'app.log', // 日志文件
  }
};