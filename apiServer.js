// API服务器模块

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const config = require('./config');
const musicManager = require('./musicManager');

class ApiServer {
  constructor() {
    this.app = express();
    this.port = config.apiServer.port;
    this.host = config.apiServer.host;
    this.server = null;
  }

  // 初始化服务器
  initialize() {
    this._setupMiddleware();
    this._setupRoutes();
    this._setupErrorHandling();
    
    return this;
  }

  // 设置中间件
  _setupMiddleware() {
    // 启用CORS
    if (config.apiServer.corsEnabled) {
      this.app.use(cors());
    }
    
    // 解析JSON请求体
    this.app.use(express.json());
    
    // 提供静态文件服务
    this.app.use(express.static('public'));
    
    // 日志中间件
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
      next();
    });
  }

  // 设置路由
  _setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API路由前缀
    const api = express.Router();

    // 音乐查询接口
    api.get('/music/search', (req, res) => {
      const query = req.query.query || '';
      const results = musicManager.searchMusic(query);
      res.json({
        success: true,
        results: results,
        total: results.length
      });
    });

    // 获取音乐列表
    api.get('/music/list', (req, res) => {
      const filters = {
        artist: req.query.artist,
        album: req.query.album,
        genre: req.query.genre,
        format: req.query.format
      };
      const list = musicManager.getMusicList(filters);
      res.json({
        success: true,
        list: list,
        total: list.length
      });
    });

    // 获取音乐详情
    api.get('/music/:id', (req, res) => {
      const music = musicManager.getMusicById(req.params.id);
      if (music) {
        res.json({
          success: true,
          music: music
        });
      } else {
        res.status(404).json({
          success: false,
          message: '音乐不存在'
        });
      }
    });

    // 播放音乐
    api.get('/music/play/:id', (req, res) => {
      const music = musicManager.setCurrentlyPlaying(req.params.id);
      if (music) {
        // 在实际应用中，这里会调用音频播放功能
        res.json({
          success: true,
          message: `正在播放: ${music.title} - ${music.artist}`,
          music: music
        });
      } else {
        res.status(404).json({
          success: false,
          message: '音乐不存在'
        });
      }
    });

    // 暂停播放
    api.get('/music/pause', (req, res) => {
      const current = musicManager.getCurrentlyPlaying();
      if (current) {
        // 在实际应用中，这里会调用暂停播放功能
        res.json({
          success: true,
          message: `已暂停: ${current.title}`
        });
      } else {
        res.status(400).json({
          success: false,
          message: '没有正在播放的音乐'
        });
      }
    });

    // 继续播放
    api.get('/music/resume', (req, res) => {
      const current = musicManager.getCurrentlyPlaying();
      if (current) {
        // 在实际应用中，这里会调用继续播放功能
        res.json({
          success: true,
          message: `继续播放: ${current.title}`
        });
      } else {
        res.status(400).json({
          success: false,
          message: '没有正在播放的音乐'
        });
      }
    });

    // 停止播放
    api.get('/music/stop', (req, res) => {
      const current = musicManager.getCurrentlyPlaying();
      if (current) {
        musicManager.clearCurrentlyPlaying();
        // 在实际应用中，这里会调用停止播放功能
        res.json({
          success: true,
          message: '已停止播放'
        });
      } else {
        res.status(400).json({
          success: false,
          message: '没有正在播放的音乐'
        });
      }
    });

    // 获取当前播放
    api.get('/music/current', (req, res) => {
      const current = musicManager.getCurrentlyPlaying();
      res.json({
        success: true,
        current: current
      });
    });

    // 获取艺术家列表
    api.get('/artists', (req, res) => {
      const artists = musicManager.getArtists();
      res.json({
        success: true,
        artists: artists,
        total: artists.length
      });
    });

    // 获取专辑列表
    api.get('/albums', (req, res) => {
      const albums = musicManager.getAlbums();
      res.json({
        success: true,
        albums: albums,
        total: albums.length
      });
    });

    // 获取流派列表
    api.get('/genres', (req, res) => {
      const genres = musicManager.getGenres();
      res.json({
        success: true,
        genres: genres,
        total: genres.length
      });
    });

    // 重新扫描音乐库
    api.post('/music/scan', async (req, res) => {
      try {
        const library = await musicManager.scanLibrary();
        res.json({
          success: true,
          message: '音乐库扫描完成',
          total: library.length
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: '扫描失败',
          error: error.message
        });
      }
    });

    // 音乐文件下载/流式传输
    api.get('/stream/:id', (req, res) => {
      const music = musicManager.getMusicById(req.params.id);
      if (!music || !fs.existsSync(music.path)) {
        return res.status(404).json({
          success: false,
          message: '音乐文件不存在'
        });
      }

      // 获取文件信息
      const stat = fs.statSync(music.path);
      const fileSize = stat.size;
      const range = req.headers.range;

      if (range) {
        // 处理范围请求（用于音频流式传输）
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(music.path, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': `audio/${music.format}`,
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // 完整文件传输
        const head = {
          'Content-Length': fileSize,
          'Content-Type': `audio/${music.format}`,
        };
        res.writeHead(200, head);
        fs.createReadStream(music.path).pipe(res);
      }
    });

    // 使用API路由
    this.app.use('/api', api);
  }

  // 设置错误处理
  _setupErrorHandling() {
    // 404错误处理
    this.app.use((req, res) => {
      res.status(404).json({
        success: false,
        message: '接口不存在'
      });
    });

    // 500错误处理
    this.app.use((err, req, res, next) => {
      console.error('服务器错误:', err);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'production' ? '请联系管理员' : err.message
      });
    });
  }

  // 启动服务器
  start() {
    this.server = this.app.listen(this.port, this.host, () => {
      console.log(`API服务器已启动，监听地址: http://${this.host}:${this.port}`);
      console.log(`健康检查: http://${this.host}:${this.port}/health`);
      console.log(`API文档: http://${this.host}:${this.port}/api`);
    });

    return this.server;
  }

  // 停止服务器
  stop() {
    if (this.server) {
      this.server.close(() => {
        console.log('API服务器已停止');
      });
    }
  }
}

// 导出单例
module.exports = new ApiServer();