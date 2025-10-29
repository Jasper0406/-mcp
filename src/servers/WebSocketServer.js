// WebSocket服务器 - 处理与小智AI机器人的实时通信
import WebSocket from 'ws';
import http from 'http';
import { nanoid } from 'nanoid';

class WebSocketServer {
  constructor(config, musicManager, logger) {
    this.config = config;
    this.musicManager = musicManager;
    this.logger = logger;
    this.wss = null;
    this.clients = new Map(); // 存储连接的客户端
    this.reconnectAttempts = 0;
    this.reconnectTimer = null;
    this.heartbeatInterval = null;
    this.server = null;
  }

  // 初始化WebSocket服务器
  initialize(server) {
    if (!this.config.websocket.enabled) {
      this.logger.info('WebSocket服务已禁用');
      return;
    }
    
    if (server && server instanceof http.Server) {
      this.server = server;
      
      // 创建WebSocket服务器
      this.wss = new WebSocket.Server({
        server: server,
        path: this.config.websocket.path,
        perMessageDeflate: {
          zlibDeflateOptions: {
            chunkSize: 1024,
            memLevel: 7,
            level: 3
          },
          zlibInflateOptions: {
            chunkSize: 10 * 1024
          },
          clientNoContextTakeover: true,
          serverNoContextTakeover: true,
          serverMaxWindowBits: 10,
          concurrencyLimit: 10,
          threshold: 1024
        }
      });
      
      // 设置事件处理器
      this._setupEventHandlers();
      
      // 设置心跳检测
      this._setupHeartbeat();
      
      this.logger.info(`WebSocket服务器已初始化，路径: ${this.config.websocket.path}`);
      
      // 如果启用了小智连接，尝试连接到小智WebSocket
      if (this.config.xiaozhi.enabled) {
        this._connectToXiaoZhi();
      }
    } else {
      this.logger.error('WebSocket初始化失败: 无效的HTTP服务器实例');
    }
  }

  // 设置事件处理器
  _setupEventHandlers() {
    // 连接事件
    this.wss.on('connection', (ws, req) => {
      const clientId = nanoid();
      
      // 存储客户端信息
      this.clients.set(clientId, {
        ws,
        id: clientId,
        ip: req.socket.remoteAddress,
        connectedAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        isAlive: true
      });
      
      this.logger.info(`客户端连接: ${clientId} (${req.socket.remoteAddress})`);
      
      // 发送欢迎消息
      this._sendMessage(ws, {
        type: 'welcome',
        message: '欢迎连接到MCP音乐服务WebSocket',
        clientId: clientId,
        version: '2.0.0'
      });
      
      // 发送当前播放状态
      this._sendPlaybackStatus(ws);
      
      // 消息事件
      ws.on('message', (message) => {
        this._handleMessage(clientId, message);
      });
      
      // 关闭事件
      ws.on('close', () => {
        this.clients.delete(clientId);
        this.logger.info(`客户端断开连接: ${clientId}`);
      });
      
      // 错误事件
      ws.on('error', (error) => {
        this.logger.error(`客户端错误 (${clientId}): ${error.message}`);
      });
      
      // 心跳检测
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.isAlive = true;
          client.lastMessageAt = new Date().toISOString();
        }
      });
    });
    
    // 错误事件
    this.wss.on('error', (error) => {
      this.logger.error(`WebSocket服务器错误: ${error.message}`);
    });
    
    // 关闭事件
    this.wss.on('close', () => {
      this.logger.info('WebSocket服务器已关闭');
      this.clients.clear();
    });
  }

  // 处理收到的消息
  _handleMessage(clientId, message) {
    try {
      const client = this.clients.get(clientId);
      if (!client) return;
      
      // 更新最后消息时间
      client.lastMessageAt = new Date().toISOString();
      
      // 解析消息
      let data;
      if (typeof message === 'string') {
        data = JSON.parse(message);
      } else {
        data = JSON.parse(message.toString('utf8'));
      }
      
      this.logger.debug(`收到消息 (${clientId}): ${data.type}`);
      
      // 根据消息类型处理
      switch (data.type) {
        case 'ping':
          this._handlePing(clientId);
          break;
        
        case 'play':
          this._handlePlayCommand(clientId, data);
          break;
        
        case 'pause':
          this._handlePauseCommand(clientId);
          break;
        
        case 'resume':
          this._handleResumeCommand(clientId);
          break;
        
        case 'stop':
          this._handleStopCommand(clientId);
          break;
        
        case 'search':
          this._handleSearchCommand(clientId, data);
          break;
        
        case 'status':
          this._handleStatusRequest(clientId);
          break;
        
        default:
          this._sendError(clientId, `未知的消息类型: ${data.type}`);
      }
    } catch (error) {
      this.logger.error(`消息处理错误 (${clientId}): ${error.message}`);
      this._sendError(clientId, '消息格式错误');
    }
  }

  // 处理ping消息
  _handlePing(clientId) {
    this._sendMessageToClient(clientId, {
      type: 'pong',
      timestamp: new Date().toISOString()
    });
  }

  // 处理播放命令
  _handlePlayCommand(clientId, data) {
    try {
      const { id } = data;
      if (!id) {
        throw new Error('音乐ID不能为空');
      }
      
      const result = this.musicManager.playMusic(id);
      
      // 发送成功响应
      this._sendMessageToClient(clientId, {
        type: 'playback_update',
        success: true,
        message: `正在播放: ${result.music.title} - ${result.music.artist}`,
        music: result.music,
        status: result.status
      });
      
      // 广播给所有客户端
      this.broadcast({
        type: 'playback_update',
        music: result.music,
        status: result.status
      }, clientId);
    } catch (error) {
      this._sendError(clientId, error.message);
    }
  }

  // 处理暂停命令
  _handlePauseCommand(clientId) {
    try {
      const result = this.musicManager.pauseMusic();
      
      this._sendMessageToClient(clientId, {
        type: 'playback_update',
        success: true,
        message: `已暂停: ${result.music.title}`,
        music: result.music,
        status: result.status
      });
      
      this.broadcast({
        type: 'playback_update',
        music: result.music,
        status: result.status
      }, clientId);
    } catch (error) {
      this._sendError(clientId, error.message);
    }
  }

  // 处理继续命令
  _handleResumeCommand(clientId) {
    try {
      const result = this.musicManager.resumeMusic();
      
      this._sendMessageToClient(clientId, {
        type: 'playback_update',
        success: true,
        message: `继续播放: ${result.music.title}`,
        music: result.music,
        status: result.status
      });
      
      this.broadcast({
        type: 'playback_update',
        music: result.music,
        status: result.status
      }, clientId);
    } catch (error) {
      this._sendError(clientId, error.message);
    }
  }

  // 处理停止命令
  _handleStopCommand(clientId) {
    try {
      const result = this.musicManager.stopMusic();
      
      this._sendMessageToClient(clientId, {
        type: 'playback_update',
        success: true,
        message: `已停止播放: ${result.music.title}`,
        music: result.music,
        status: result.status
      });
      
      this.broadcast({
        type: 'playback_update',
        music: null,
        status: result.status
      }, clientId);
    } catch (error) {
      this._sendError(clientId, error.message);
    }
  }

  // 处理搜索命令
  _handleSearchCommand(clientId, data) {
    try {
      const { query, filters } = data;
      const results = this.musicManager.searchMusic(query || '', filters || {});
      
      this._sendMessageToClient(clientId, {
        type: 'search_results',
        success: true,
        query: query,
        filters: filters,
        results: results,
        total: results.length
      });
    } catch (error) {
      this._sendError(clientId, error.message);
    }
  }

  // 处理状态请求
  _handleStatusRequest(clientId) {
    const status = this.musicManager.getPlaybackStatus();
    
    this._sendMessageToClient(clientId, {
      type: 'playback_status',
      current: status.current,
      status: status.status
    });
  }

  // 连接到小智WebSocket
  _connectToXiaoZhi() {
    if (!this.config.xiaozhi.websocketUrl) {
      this.logger.error('小智WebSocket URL未配置');
      return;
    }
    
    try {
      const url = this._buildXiaoZhiUrl();
      this.logger.info(`正在连接到小智WebSocket: ${url}`);
      
      // 这里应该实现与小智WebSocket的连接逻辑
      // 由于这是模拟实现，实际项目中需要根据小智的WebSocket协议进行对接
      
      this.logger.info('小智WebSocket连接模拟成功');
      this.reconnectAttempts = 0;
      
      // 模拟接收小智消息
      this._simulateXiaoZhiMessages();
    } catch (error) {
      this.logger.error(`连接小智WebSocket失败: ${error.message}`);
      this._scheduleReconnect();
    }
  }

  // 构建小智WebSocket URL
  _buildXiaoZhiUrl() {
    let url = this.config.xiaozhi.websocketUrl;
    
    // 如果URL中不包含token参数且配置了token，则添加token
    if (this.config.xiaozhi.token && !url.includes('token=')) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}token=${encodeURIComponent(this.config.xiaozhi.token)}`;
    }
    
    return url;
  }

  // 模拟小智消息（仅用于测试）
  _simulateXiaoZhiMessages() {
    // 实际项目中应删除此方法，替换为真实的小智WebSocket消息处理
    setTimeout(() => {
      this.broadcast({
        type: 'xiaozhi_message',
        message: 'MCP音乐服务已成功连接到小智AI',
        timestamp: new Date().toISOString()
      });
    }, 1000);
  }

  // 安排重连
  _scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    if (this.reconnectAttempts >= this.config.xiaozhi.maxReconnectAttempts) {
      this.logger.error(`达到最大重连次数 (${this.config.xiaozhi.maxReconnectAttempts})，停止重连`);
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.config.xiaozhi.reconnectInterval * this.reconnectAttempts;
    
    this.logger.info(`将在 ${delay}ms 后进行第 ${this.reconnectAttempts} 次重连`);
    
    this.reconnectTimer = setTimeout(() => {
      this._connectToXiaoZhi();
    }, delay);
  }

  // 设置心跳检测
  _setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client, clientId) => {
        if (!client.isAlive) {
          this.logger.info(`客户端心跳超时，断开连接: ${clientId}`);
          client.ws.terminate();
          this.clients.delete(clientId);
          return;
        }
        
        client.isAlive = false;
        client.ws.ping();
      });
    }, this.config.websocket.heartbeatInterval);
  }

  // 发送消息到指定WebSocket
  _sendMessage(ws, data) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  }

  // 发送消息到指定客户端
  _sendMessageToClient(clientId, data) {
    const client = this.clients.get(clientId);
    if (client) {
      this._sendMessage(client.ws, data);
    }
  }

  // 发送错误消息
  _sendError(clientId, message) {
    this._sendMessageToClient(clientId, {
      type: 'error',
      message: message
    });
  }

  // 发送播放状态
  _sendPlaybackStatus(ws) {
    const status = this.musicManager.getPlaybackStatus();
    this._sendMessage(ws, {
      type: 'playback_status',
      current: status.current,
      status: status.status
    });
  }

  // 广播消息给所有客户端
  broadcast(data, excludeClientId = null) {
    this.clients.forEach((client, clientId) => {
      if (clientId !== excludeClientId) {
        this._sendMessage(client.ws, data);
      }
    });
  }

  // 获取连接统计信息
  getConnectionStats() {
    return {
      totalClients: this.clients.size,
      clients: Array.from(this.clients.values()).map(client => ({
        id: client.id,
        ip: client.ip,
        connectedAt: client.connectedAt,
        lastMessageAt: client.lastMessageAt
      }))
    };
  }

  // 停止WebSocket服务器
  stop() {
    this.logger.info('正在停止WebSocket服务器...');
    
    // 清除定时器
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // 关闭所有客户端连接
    this.clients.forEach((client) => {
      client.ws.close();
    });
    this.clients.clear();
    
    // 关闭WebSocket服务器
    if (this.wss) {
      this.wss.close(() => {
        this.logger.info('WebSocket服务器已关闭');
      });
    }
  }
}

export default WebSocketServer;