// API服务器 - 提供RESTful API接口
import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';

class ApiServer {
  constructor(config, musicManager, logger) {
    this.config = config;
    this.musicManager = musicManager;
    this.logger = logger;
    this.router = express.Router();
    
    // 设置文件上传
    this.upload = multer({
      dest: path.resolve(this.config.music.libraryPath, '.temp'),
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
      }
    });
  }

  // 设置路由
  setupRoutes(app) {
    const apiPrefix = this.config.api.prefix;
    
    // 健康检查
    app.get('/health', this.handleHealthCheck.bind(this));
    
    // API文档（可选）
    app.get(`${apiPrefix}/docs`, this.serveApiDocs.bind(this));
    
    // API路由组
    app.use(apiPrefix, this.router);
    
    // 注册API路由
    this._registerRoutes();
    
    // 错误处理中间件
    this._setupErrorHandling();
    
    this.logger.info(`API服务器路由已设置，前缀: ${apiPrefix}`);
  }

  // 注册API路由
  _registerRoutes() {
    // 音乐相关路由
    this.router.get('/music/search', this.handleMusicSearch.bind(this));
    this.router.get('/music/list', this.handleMusicList.bind(this));
    this.router.get('/music/:id', this.handleMusicDetails.bind(this));
    this.router.post('/music/scan', this.handleScanLibrary.bind(this));
    
    // 音乐上传（可选功能）
    this.router.post('/music/upload', this.upload.single('music'), this.handleMusicUpload.bind(this));
    
    // 播放控制路由
    this.router.post('/playback/play/:id', this.handlePlayMusic.bind(this));
    this.router.post('/playback/pause', this.handlePauseMusic.bind(this));
    this.router.post('/playback/resume', this.handleResumeMusic.bind(this));
    this.router.post('/playback/stop', this.handleStopMusic.bind(this));
    this.router.get('/playback/status', this.handlePlaybackStatus.bind(this));
    
    // 元数据路由
    this.router.get('/artists', this.handleGetArtists.bind(this));
    this.router.get('/albums', this.handleGetAlbums.bind(this));
    this.router.get('/genres', this.handleGetGenres.bind(this));
    
    // 封面路由
    this.router.get('/cover/:id', this.handleGetCover.bind(this));
    
    // 音频流路由
    this.router.get('/stream/:id', this.handleStreamMusic.bind(this));
    
    // 系统信息路由
    this.router.get('/info', this.handleSystemInfo.bind(this));
  }

  // 健康检查处理
  handleHealthCheck(req, res) {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      musicCount: this.musicManager.musicLibrary.length
    });
  }

  // 提供API文档
  serveApiDocs(req, res) {
    res.json({
      name: 'MCP音乐服务API',
      version: '2.0.0',
      description: '基于小智AI机器人的音乐服务MCP平台API',
      endpoints: {
        health: '/health',
        search: '/api/music/search',
        list: '/api/music/list',
        details: '/api/music/:id',
        playback: '/api/playback/*',
        stream: '/api/stream/:id'
      }
    });
  }

  // 音乐搜索处理
  handleMusicSearch(req, res) {
    try {
      const query = req.query.query || '';
      const filters = this._extractFilters(req.query);
      
      const results = this.musicManager.searchMusic(query, filters);
      
      res.json({
        success: true,
        query: query,
        filters: filters,
        results: results,
        total: results.length
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 音乐列表处理
  handleMusicList(req, res) {
    try {
      const filters = this._extractFilters(req.query);
      const pagination = this._extractPagination(req.query);
      
      const result = this.musicManager.getMusicList(filters, pagination);
      
      res.json({
        success: true,
        filters: filters,
        pagination: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
          totalPages: result.totalPages
        },
        items: result.items
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 音乐详情处理
  handleMusicDetails(req, res) {
    try {
      const music = this.musicManager.getMusicById(req.params.id);
      
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
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 扫描音乐库处理
  async handleScanLibrary(req, res) {
    try {
      const library = await this.musicManager.scanLibrary();
      
      res.json({
        success: true,
        message: '音乐库扫描完成',
        total: library.length
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 音乐上传处理
  async handleMusicUpload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: '未收到音乐文件'
        });
      }
      
      const targetPath = path.join(this.config.music.libraryPath, req.file.originalname);
      
      // 移动文件到音乐库
      await fs.move(req.file.path, targetPath);
      
      // 重新扫描音乐库
      await this.musicManager.scanLibrary();
      
      res.json({
        success: true,
        message: '音乐上传成功',
        filename: req.file.originalname
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 播放音乐处理
  handlePlayMusic(req, res) {
    try {
      const result = this.musicManager.playMusic(req.params.id);
      
      res.json({
        success: true,
        message: `正在播放: ${result.music.title} - ${result.music.artist}`,
        music: result.music,
        status: result.status
      });
    } catch (error) {
      this._handleError(res, error, 404);
    }
  }

  // 暂停播放处理
  handlePauseMusic(req, res) {
    try {
      const result = this.musicManager.pauseMusic();
      
      res.json({
        success: true,
        message: `已暂停: ${result.music.title}`,
        music: result.music,
        status: result.status
      });
    } catch (error) {
      this._handleError(res, error, 400);
    }
  }

  // 继续播放处理
  handleResumeMusic(req, res) {
    try {
      const result = this.musicManager.resumeMusic();
      
      res.json({
        success: true,
        message: `继续播放: ${result.music.title}`,
        music: result.music,
        status: result.status
      });
    } catch (error) {
      this._handleError(res, error, 400);
    }
  }

  // 停止播放处理
  handleStopMusic(req, res) {
    try {
      const result = this.musicManager.stopMusic();
      
      res.json({
        success: true,
        message: `已停止播放: ${result.music.title}`,
        music: result.music,
        status: result.status
      });
    } catch (error) {
      this._handleError(res, error, 400);
    }
  }

  // 获取播放状态
  handlePlaybackStatus(req, res) {
    try {
      const status = this.musicManager.getPlaybackStatus();
      
      res.json({
        success: true,
        current: status.current,
        status: status.status
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 获取艺术家列表
  handleGetArtists(req, res) {
    try {
      const artists = this.musicManager.getArtists();
      
      res.json({
        success: true,
        artists: artists,
        total: artists.length
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 获取专辑列表
  handleGetAlbums(req, res) {
    try {
      const artist = req.query.artist;
      const albums = this.musicManager.getAlbums(artist);
      
      res.json({
        success: true,
        albums: albums,
        total: albums.length,
        artist: artist || 'all'
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 获取流派列表
  handleGetGenres(req, res) {
    try {
      const genres = this.musicManager.getGenres();
      
      res.json({
        success: true,
        genres: genres,
        total: genres.length
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 获取封面
  async handleGetCover(req, res) {
    try {
      const cover = await this.musicManager.getCoverArt(req.params.id);
      
      if (cover && cover.data) {
        res.setHeader('Content-Type', cover.format || 'image/jpeg');
        res.send(Buffer.from(cover.data));
      } else {
        res.status(404).json({
          success: false,
          message: '封面不存在'
        });
      }
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 流式传输音乐
  handleStreamMusic(req, res) {
    try {
      const music = this.musicManager.getMusicById(req.params.id);
      
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
        
        // 检查范围有效性
        if (start >= fileSize || end >= fileSize) {
          res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
          return res.end();
        }
        
        const file = fs.createReadStream(music.path, { start, end });
        const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': `audio/${music.format}`,
          'Content-Disposition': `inline; filename="${encodeURIComponent(music.filename)}"`
        };

        res.writeHead(206, head);
        file.pipe(res);
      } else {
        // 完整文件传输
        const head = {
          'Content-Length': fileSize,
          'Content-Type': `audio/${music.format}`,
          'Content-Disposition': `inline; filename="${encodeURIComponent(music.filename)}"`
        };
        
        res.writeHead(200, head);
        fs.createReadStream(music.path).pipe(res);
      }
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 获取系统信息
  handleSystemInfo(req, res) {
    try {
      res.json({
        success: true,
        info: {
          version: '2.0.0',
          musicCount: this.musicManager.musicLibrary.length,
          libraryPath: this.config.music.libraryPath,
          uptime: process.uptime(),
          nodeVersion: process.version,
          memoryUsage: process.memoryUsage()
        }
      });
    } catch (error) {
      this._handleError(res, error, 500);
    }
  }

  // 提取过滤器参数
  _extractFilters(query) {
    const filters = {};
    
    if (query.artist) filters.artist = query.artist;
    if (query.album) filters.album = query.album;
    if (query.genre) filters.genre = query.genre;
    if (query.format) filters.format = query.format;
    if (query.minDuration) filters.minDuration = parseFloat(query.minDuration);
    if (query.maxDuration) filters.maxDuration = parseFloat(query.maxDuration);
    
    return filters;
  }

  // 提取分页参数
  _extractPagination(query) {
    return {
      page: parseInt(query.page) || 1,
      pageSize: parseInt(query.pageSize) || 50
    };
  }

  // 错误处理
  _handleError(res, error, defaultStatusCode = 500) {
    this.logger.error(`API错误: ${error.message}`);
    
    res.status(defaultStatusCode).json({
      success: false,
      message: error.message || '服务器内部错误',
      error: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }

  // 设置错误处理中间件
  _setupErrorHandling() {
    // 404错误处理
    this.router.use((req, res) => {
      res.status(404).json({
        success: false,
        message: '接口不存在'
      });
    });

    // 500错误处理
    this.router.use((err, req, res, next) => {
      this.logger.error(`API服务器错误: ${err.message}`);
      res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'production' ? '请联系管理员' : err.message
      });
    });
  }
}

export default ApiServer;