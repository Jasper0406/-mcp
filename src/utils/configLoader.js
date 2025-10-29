// 配置加载工具
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 默认配置
const defaultConfig = {
  server: {
    host: '0.0.0.0',
    port: 3000
  },
  music: {
    libraryPath: path.resolve(__dirname, '../../music'),
    scanInterval: 3600000, // 1小时
    supportedFormats: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg']
  },
  api: {
    prefix: '/api',
    timeout: 30000,
    maxResults: 100
  },
  websocket: {
    enabled: true,
    path: '/ws',
    heartbeatInterval: 30000
  },
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  logging: {
    level: 'info',
    file: path.resolve(__dirname, '../../logs/app.log'),
    maxSize: 5242880, // 5MB
    maxFiles: 5
  },
  security: {
    enableApiKey: false,
    apiKey: '',
    rateLimit: {
      windowMs: 15 * 60 * 1000,
      max: 100
    }
  },
  xiaozhi: {
    enabled: true,
    websocketUrl: 'wss://api.xiaozhi.me/mcp',
    token: process.env.XIAOZHI_TOKEN || '',
    reconnectInterval: 5000,
    maxReconnectAttempts: 5
  }
};

/**
 * 加载配置
 * @returns {Object} 合并后的配置对象
 */
export function loadConfig() {
  try {
    // 尝试从配置文件加载
    let userConfig = {};
    const configPath = path.resolve(__dirname, '../../config.js');
    
    if (fs.existsSync(configPath)) {
      // 动态导入配置文件
      const configModule = await import(`file://${configPath}`);
      userConfig = configModule.default || {};
    }
    
    // 合并默认配置和用户配置
    const config = deepMerge(defaultConfig, userConfig);
    
    // 验证配置
    validateConfig(config);
    
    // 确保必要的目录存在
    ensureDirectories(config);
    
    return config;
  } catch (error) {
    console.error(`配置加载失败: ${error.message}`);
    // 返回默认配置作为后备
    return defaultConfig;
  }
}

/**
 * 深度合并两个对象
 * @param {Object} target 目标对象
 * @param {Object} source 源对象
 * @returns {Object} 合并后的对象
 */
function deepMerge(target, source) {
  const output = { ...target };
  
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  
  return output;
}

/**
 * 检查值是否为对象
 * @param {*} item 要检查的值
 * @returns {boolean} 是否为对象
 */
function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 验证配置的有效性
 * @param {Object} config 配置对象
 */
function validateConfig(config) {
  // 验证服务器配置
  if (!config.server.port || config.server.port < 1 || config.server.port > 65535) {
    throw new Error('无效的服务器端口配置');
  }
  
  // 验证音乐库路径
  if (!config.music.libraryPath) {
    throw new Error('音乐库路径未配置');
  }
  
  // 验证WebSocket URL（如果启用）
  if (config.xiaozhi.enabled && !config.xiaozhi.websocketUrl) {
    throw new Error('小智WebSocket URL未配置');
  }
  
  // 验证日志级别
  const validLogLevels = ['error', 'warn', 'info', 'verbose', 'debug', 'silly'];
  if (!validLogLevels.includes(config.logging.level)) {
    console.warn(`无效的日志级别: ${config.logging.level}，使用默认值: info`);
    config.logging.level = 'info';
  }
}

/**
 * 确保必要的目录存在
 * @param {Object} config 配置对象
 */
function ensureDirectories(config) {
  try {
    // 确保音乐库目录存在
    fs.ensureDirSync(config.music.libraryPath);
    
    // 确保日志目录存在
    const logDir = path.dirname(config.logging.file);
    fs.ensureDirSync(logDir);
    
    // 确保公共目录存在
    fs.ensureDirSync(path.resolve(__dirname, '../../public'));
  } catch (error) {
    console.error(`创建必要目录失败: ${error.message}`);
  }
}

/**
 * 获取配置示例
 * @returns {Object} 配置示例对象
 */
export function getConfigExample() {
  return {
    server: {
      host: '0.0.0.0',
      port: 3000
    },
    music: {
      libraryPath: './music',
      scanInterval: 3600000
    },
    xiaozhi: {
      enabled: true,
      websocketUrl: 'wss://api.xiaozhi.me/mcp',
      token: 'your_token_here'
    }
  };
}