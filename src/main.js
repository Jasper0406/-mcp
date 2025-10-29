// 新一代MCP音乐服务平台 - 主入口文件
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createLogger, transports, format } from 'winston';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import MusicManager from './managers/MusicManager.js';
import ApiServer from './servers/ApiServer.js';
import WebSocketServer from './servers/WebSocketServer.js';
import { loadConfig } from './utils/configLoader.js';

// 初始化环境变量
dotenv.config();

// 获取当前文件路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建日志器
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: join(__dirname, '../logs/app.log') })
  ]
});

class App {
  constructor() {
    this.config = loadConfig();
    this.musicManager = new MusicManager(this.config, logger);
    this.apiServer = new ApiServer(this.config, this.musicManager, logger);
    this.webSocketServer = new WebSocketServer(this.config, this.musicManager, logger);
    this.app = express();
    this.server = null;
  }

  // 初始化应用
  async initialize() {
    try {
      logger.info('正在初始化MCP音乐服务平台...');
      
      // 设置基本中间件
      this._setupMiddleware();
      
      // 初始化音乐管理器
      await this.musicManager.initialize();
      
      // 设置API路由
      this.apiServer.setupRoutes(this.app);
      
      // 设置WebSocket服务
      this.webSocketServer.initialize(this.server);
      
      logger.info('初始化完成');
      return this;
    } catch (error) {
      logger.error(`初始化失败: ${error.message}`);
      throw error;
    }
  }

  // 设置中间件
  _setupMiddleware() {
    // 安全中间件
    this.app.use(helmet());
    
    // CORS配置
    this.app.use(cors(this.config.cors || {}));
    
    // 解析JSON请求体
    this.app.use(express.json({ limit: '10mb' }));
    
    // 解析URL编码请求体
    this.app.use(express.urlencoded({ extended: true }));
    
    // 静态文件服务
    this.app.use(express.static(join(__dirname, '../public')));
    
    // 请求限速
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100 // 每个IP限制请求数
    });
    this.app.use('/api', limiter);
    
    // 日志中间件
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.url} ${req.ip}`);
      next();
    });
  }

  // 启动应用
  async start() {
    try {
      await this.initialize();
      
      const port = this.config.server.port || 3000;
      const host = this.config.server.host || '0.0.0.0';
      
      this.server = this.app.listen(port, host, () => {
        logger.info(`MCP音乐服务平台已启动`);
        logger.info(`HTTP服务: http://${host}:${port}`);
        logger.info(`健康检查: http://${host}:${port}/health`);
        logger.info(`API文档: http://${host}:${port}/api/docs`);
      });
      
      // 设置WebSocket服务
      this.webSocketServer.initialize(this.server);
      
      // 设置进程事件处理
      this._setupProcessEvents();
      
      return this.server;
    } catch (error) {
      logger.error(`启动失败: ${error.message}`);
      throw error;
    }
  }

  // 停止应用
  stop() {
    logger.info('正在停止MCP音乐服务平台...');
    
    // 停止WebSocket服务
    this.webSocketServer.stop();
    
    // 停止HTTP服务器
    if (this.server) {
      this.server.close(() => {
        logger.info('HTTP服务器已停止');
      });
    }
    
    // 清理音乐管理器资源
    this.musicManager.cleanup();
    
    logger.info('MCP音乐服务平台已完全停止');
  }

  // 设置进程事件处理
  _setupProcessEvents() {
    // 处理SIGINT信号（Ctrl+C）
    process.on('SIGINT', () => {
      logger.info('收到SIGINT信号，正在停止...');
      this.stop();
      process.exit(0);
    });
    
    // 处理退出事件
    process.on('exit', (code) => {
      logger.info(`进程正在退出，退出码: ${code}`);
    });
    
    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
      logger.error(`未捕获的异常: ${error.message}`);
      logger.error(error.stack);
      this.stop();
      process.exit(1);
    });
    
    // 处理未处理的Promise拒绝
    process.on('unhandledRejection', (reason) => {
      logger.error(`未处理的Promise拒绝: ${reason}`);
    });
  }
}

// 创建并导出应用实例
const app = new App();

// 如果直接运行此文件，则启动应用
if (process.argv[1] === __filename) {
  app.start().catch(err => {
    logger.error(`应用启动失败: ${err.message}`);
    process.exit(1);
  });
}

export default app;
export { App };