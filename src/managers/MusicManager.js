// 音乐管理器 - 负责音乐库扫描、元数据提取和音乐管理
import fs from 'fs-extra';
import path from 'path';
import { parseFile } from 'music-metadata';
import { nanoid } from 'nanoid';

class MusicManager {
  constructor(config, logger) {
    this.config = config;
    this.logger = logger;
    this.musicLibrary = [];
    this.currentlyPlaying = null;
    this.playbackStatus = 'stopped'; // stopped, playing, paused
    this.scanInterval = null;
  }

  // 初始化音乐管理器
  async initialize() {
    this.logger.info('正在初始化音乐管理器...');
    
    // 扫描音乐库
    await this.scanLibrary();
    
    // 设置定期扫描
    this._setupPeriodicScan();
    
    this.logger.info(`音乐管理器初始化完成，已加载 ${this.musicLibrary.length} 首音乐`);
    
    return this;
  }

  // 扫描音乐库
  async scanLibrary() {
    try {
      this.logger.info(`开始扫描音乐库: ${this.config.music.libraryPath}`);
      
      // 清空当前音乐库
      this.musicLibrary = [];
      
      // 递归扫描目录
      const files = await this._scanDirectory(this.config.music.libraryPath);
      
      // 处理每个音乐文件
      for (const filePath of files) {
        try {
          const musicInfo = await this._extractMusicInfo(filePath);
          if (musicInfo) {
            this.musicLibrary.push(musicInfo);
          }
        } catch (error) {
          this.logger.warn(`处理文件失败: ${filePath}, 错误: ${error.message}`);
        }
      }
      
      this.logger.info(`音乐库扫描完成，找到 ${this.musicLibrary.length} 首音乐`);
      return this.musicLibrary;
    } catch (error) {
      this.logger.error(`扫描音乐库失败: ${error.message}`);
      throw error;
    }
  }

  // 递归扫描目录
  async _scanDirectory(dirPath) {
    const files = [];
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isDirectory()) {
        // 递归扫描子目录
        const subFiles = await this._scanDirectory(fullPath);
        files.push(...subFiles);
      } else if (this._isSupportedFormat(item.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  // 检查文件格式是否支持
  _isSupportedFormat(filename) {
    const ext = path.extname(filename).toLowerCase().substring(1);
    return this.config.music.supportedFormats.includes(ext);
  }

  // 提取音乐元数据
  async _extractMusicInfo(filePath) {
    try {
      const metadata = await parseFile(filePath, {
        duration: true,
        skipCovers: false
      });
      
      const common = metadata.common;
      const format = metadata.format;
      
      // 生成唯一ID
      const id = nanoid();
      
      // 构建音乐信息对象
      const musicInfo = {
        id,
        title: common.title || path.basename(filePath, path.extname(filePath)),
        artist: common.artists?.join(', ') || common.artist || '未知艺术家',
        album: common.album || '未知专辑',
        genre: common.genre || ['未知流派'],
        duration: format.duration || 0,
        year: common.date || common.year || '未知年份',
        trackNumber: common.track?.no || 0,
        discNumber: common.disk?.no || 1,
        path: filePath,
        filename: path.basename(filePath),
        format: path.extname(filePath).substring(1),
        coverArt: common.picture ? true : false,
        bitrate: format.bitrate || 0,
        sampleRate: format.sampleRate || 0,
        channels: format.numberOfChannels || 2,
        addedAt: new Date().toISOString(),
        modifiedAt: new Date(await fs.stat(filePath)).toISOString()
      };
      
      // 如果有封面，提取封面数据（如果需要）
      if (common.picture && common.picture.length > 0) {
        musicInfo.coverMimeType = common.picture[0].format;
        // 注意：这里不会存储完整的封面数据，只存储元信息
      }
      
      return musicInfo;
    } catch (error) {
      this.logger.warn(`无法解析音乐文件元数据: ${filePath}`, error.message);
      
      // 如果无法解析元数据，返回基本信息
      return {
        id: nanoid(),
        title: path.basename(filePath, path.extname(filePath)),
        artist: '未知艺术家',
        album: '未知专辑',
        genre: ['未知流派'],
        duration: 0,
        year: '未知年份',
        path: filePath,
        filename: path.basename(filePath),
        format: path.extname(filePath).substring(1),
        coverArt: false,
        addedAt: new Date().toISOString()
      };
    }
  }

  // 设置定期扫描
  _setupPeriodicScan() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
    }
    
    this.scanInterval = setInterval(() => {
      this.logger.info('执行定期音乐库扫描');
      this.scanLibrary().catch(error => {
        this.logger.error(`定期扫描失败: ${error.message}`);
      });
    }, this.config.music.scanInterval);
  }

  // 搜索音乐
  searchMusic(query, filters = {}) {
    if (!query || query.trim() === '') {
      // 如果没有搜索词，应用过滤器
      return this._applyFilters(this.musicLibrary, filters);
    }
    
    const lowerQuery = query.toLowerCase().trim();
    let results = this.musicLibrary.filter(music => 
      music.title.toLowerCase().includes(lowerQuery) ||
      music.artist.toLowerCase().includes(lowerQuery) ||
      music.album.toLowerCase().includes(lowerQuery) ||
      music.genre.some(g => g.toLowerCase().includes(lowerQuery))
    );
    
    // 应用额外过滤器
    return this._applyFilters(results, filters);
  }

  // 应用过滤器
  _applyFilters(list, filters) {
    let filtered = [...list];
    
    if (filters.artist) {
      filtered = filtered.filter(music => music.artist.toLowerCase().includes(filters.artist.toLowerCase()));
    }
    
    if (filters.album) {
      filtered = filtered.filter(music => music.album.toLowerCase().includes(filters.album.toLowerCase()));
    }
    
    if (filters.genre) {
      filtered = filtered.filter(music => 
        music.genre.some(g => g.toLowerCase().includes(filters.genre.toLowerCase()))
      );
    }
    
    if (filters.format) {
      filtered = filtered.filter(music => music.format === filters.format.toLowerCase());
    }
    
    if (filters.minDuration) {
      filtered = filtered.filter(music => music.duration >= filters.minDuration);
    }
    
    if (filters.maxDuration) {
      filtered = filtered.filter(music => music.duration <= filters.maxDuration);
    }
    
    // 限制返回结果数量
    if (this.config.api.maxResults && filtered.length > this.config.api.maxResults) {
      filtered = filtered.slice(0, this.config.api.maxResults);
    }
    
    return filtered;
  }

  // 根据ID获取音乐
  getMusicById(id) {
    return this.musicLibrary.find(music => music.id === id);
  }

  // 获取音乐列表
  getMusicList(filters = {}, pagination = {}) {
    let list = this._applyFilters(this.musicLibrary, filters);
    
    // 处理分页
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 50;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    
    return {
      items: list.slice(start, end),
      total: list.length,
      page,
      pageSize,
      totalPages: Math.ceil(list.length / pageSize)
    };
  }

  // 获取所有艺术家
  getArtists() {
    const artists = new Set();
    this.musicLibrary.forEach(music => artists.add(music.artist));
    return Array.from(artists).sort();
  }

  // 获取所有专辑
  getAlbums(artistFilter = null) {
    const albums = new Set();
    const filteredMusic = artistFilter 
      ? this.musicLibrary.filter(music => music.artist === artistFilter)
      : this.musicLibrary;
    
    filteredMusic.forEach(music => albums.add(music.album));
    return Array.from(albums).sort();
  }

  // 获取所有流派
  getGenres() {
    const genres = new Set();
    this.musicLibrary.forEach(music => 
      music.genre.forEach(g => genres.add(g))
    );
    return Array.from(genres).sort();
  }

  // 播放控制方法
  playMusic(musicId) {
    const music = this.getMusicById(musicId);
    if (!music) {
      throw new Error('音乐不存在');
    }
    
    this.currentlyPlaying = music;
    this.playbackStatus = 'playing';
    
    this.logger.info(`开始播放: ${music.title} - ${music.artist}`);
    
    return {
      music,
      status: this.playbackStatus
    };
  }

  pauseMusic() {
    if (!this.currentlyPlaying) {
      throw new Error('没有正在播放的音乐');
    }
    
    this.playbackStatus = 'paused';
    this.logger.info(`暂停播放: ${this.currentlyPlaying.title}`);
    
    return {
      music: this.currentlyPlaying,
      status: this.playbackStatus
    };
  }

  resumeMusic() {
    if (!this.currentlyPlaying) {
      throw new Error('没有正在播放的音乐');
    }
    
    this.playbackStatus = 'playing';
    this.logger.info(`继续播放: ${this.currentlyPlaying.title}`);
    
    return {
      music: this.currentlyPlaying,
      status: this.playbackStatus
    };
  }

  stopMusic() {
    if (!this.currentlyPlaying) {
      throw new Error('没有正在播放的音乐');
    }
    
    const stoppedMusic = this.currentlyPlaying;
    this.currentlyPlaying = null;
    this.playbackStatus = 'stopped';
    
    this.logger.info(`停止播放: ${stoppedMusic.title}`);
    
    return {
      music: stoppedMusic,
      status: this.playbackStatus
    };
  }

  // 获取播放状态
  getPlaybackStatus() {
    return {
      current: this.currentlyPlaying,
      status: this.playbackStatus
    };
  }

  // 获取封面图片
  async getCoverArt(musicId) {
    const music = this.getMusicById(musicId);
    if (!music || !music.coverArt) {
      return null;
    }
    
    try {
      const metadata = await parseFile(music.path, {
        duration: false,
        skipCovers: false
      });
      
      if (metadata.common.picture && metadata.common.picture.length > 0) {
        const picture = metadata.common.picture[0];
        return {
          data: picture.data,
          format: picture.format,
          type: picture.type
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error(`获取封面失败: ${error.message}`);
      return null;
    }
  }

  // 清理资源
  cleanup() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.logger.info('音乐管理器资源已清理');
  }
}

export default MusicManager;