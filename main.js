// 主应用入口

const config = require('./config');
const musicManager = require('./musicManager');
const apiServer = require('./apiServer');

class App {
  constructor() {
    this.isRunning = false;
  }

  // 初始化应用
  async initialize() {
    try {
      console.log('====================================');
      console.log('正在启动小智AI机器人音乐服务(MCP)...');
      console.log('====================================');

      // 初始化音乐管理器
      console.log('初始化音乐管理器...');
      const musicInitResult = await musicManager.initialize();
      if (!musicInitResult) {
        throw new Error('音乐管理器初始化失败');
      }
      
      // 初始化API服务器
      console.log('初始化API服务器...');
      apiServer.initialize();
      
      console.log('初始化完成！');
      return true;
    } catch (error) {
      console.error('应用初始化失败:', error);
      return false;
    }
  }

  // 启动应用
  async start() {
    try {
      // 先初始化
      const initialized = await this.initialize();
      if (!initialized) {
        throw new Error('初始化失败，无法启动应用');
      }
      
      // 启动API服务器
      console.log('启动API服务器...');
      apiServer.start();
      
      this.isRunning = true;
      console.log('====================================');
      console.log('小智AI机器人音乐服务(MCP)启动成功！');
      console.log(`音乐库路径: ${config.musicLibrary.path}`);
      console.log(`API服务地址: http://${config.apiServer.host}:${config.apiServer.port}`);
      console.log('====================================');
      
      // 处理进程终止信号
      this._setupProcessHandlers();
      
      return true;
    } catch (error) {
      console.error('应用启动失败:', error);
      return false;
    }
  }

  // 停止应用
  stop() {
    try {
      console.log('正在停止应用...');
      
      // 停止API服务器
      apiServer.stop();
      
      this.isRunning = false;
      console.log('应用已停止');
      return true;
    } catch (error) {
      console.error('应用停止失败:', error);
      return false;
    }
  }

  // 设置进程处理
  _setupProcessHandlers() {
    // 处理Ctrl+C信号
    process.on('SIGINT', () => {
      console.log('\n接收到终止信号，正在停止应用...');
      this.stop();
      process.exit(0);
    });

    // 处理进程退出
    process.on('exit', (code) => {
      console.log(`进程退出，退出码: ${code}`);
    });

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error);
      this.stop();
      process.exit(1);
    });

    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason);
    });
  }
}

// 创建应用实例并启动
const app = new App();

// 启动应用
app.start().catch(error => {
  console.error('启动应用时发生错误:', error);
  process.exit(1);
});

// 导出应用实例供其他模块使用
module.exports = app;