// 音乐管理器模块

const fs = require('fs-extra');
const path = require('path');
const mm = require('music-metadata');
const config = require('./config');

class MusicManager {
  constructor() {
    this.musicLibrary = []; // 音乐库数组
    this.currentlyPlaying = null; // 当前播放的音乐
    this.isScanning = false; // 是否正在扫描
    this.libraryPath = config.musicLibrary.path;
  }

  // 初始化音乐库
  async initialize() {
    try {
      // 确保音乐库目录存在
      await fs.ensureDir(this.libraryPath);
      console.log(`音乐库目录已准备: ${this.libraryPath}`);
      
      // 初始扫描
      await this.scanLibrary();
      
      // 设置定时扫描
      setInterval(() => this.scanLibrary(), config.musicLibrary.scanInterval);
      
      return true;
    } catch (error) {
      console.error('初始化音乐库失败:', error);
      return false;
    }
  }

  // 扫描音乐库
  async scanLibrary() {
    if (this.isScanning) return;
    
    this.isScanning = true;
    console.log('开始扫描音乐库...');
    
    try {
      const newLibrary = [];
      await this._scanDirectory(this.libraryPath, newLibrary);
      
      this.musicLibrary = newLibrary;
      console.log(`音乐库扫描完成，共发现 ${newLibrary.length} 首音乐`);
      
      return newLibrary;
    } catch (error) {
      console.error('扫描音乐库失败:', error);
      return this.musicLibrary; // 返回之前的音乐库
    } finally {
      this.isScanning = false;
    }
  }

  // 递归扫描目录
  async _scanDirectory(directory, library) {
    const files = await fs.readdir(directory);
    
    for (const file of files) {
      const filePath = path.join(directory, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        // 递归扫描子目录
        await this._scanDirectory(filePath, library);
      } else if (this._isSupportedMusicFile(file)) {
        // 处理音乐文件
        const musicInfo = await this._extractMusicInfo(filePath);
        if (musicInfo) {
          library.push(musicInfo);
        }
      }
    }
  }

  // 检查是否为支持的音乐文件
  _isSupportedMusicFile(filename) {
    const ext = path.extname(filename).toLowerCase();
    return config.musicLibrary.supportedFormats.includes(ext);
  }

  // 提取音乐信息
  async _extractMusicInfo(filePath) {
    try {
      const metadata = await mm.parseFile(filePath);
      const common = metadata.common;
      
      return {
        id: path.basename(filePath, path.extname(filePath)),
        title: common.title || path.basename(filePath, path.extname(filePath)),
        artist: common.artist || '未知艺术家',
        album: common.album || '未知专辑',
        genre: common.genre || ['未知流派'],
        duration: metadata.format.duration || 0,
        year: common.year || '未知年份',
        path: filePath,
        filename: path.basename(filePath),
        format: path.extname(filePath).substring(1),
        coverArt: common.picture ? true : false,
        addedAt: new Date().toISOString()
      };
    } catch (error) {
      console.warn(`无法解析音乐文件: ${filePath}`, error.message);
      
      // 如果无法解析元数据，返回基本信息
      return {
        id: path.basename(filePath, path.extname(filePath)),
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

  // 搜索音乐
  searchMusic(query) {
    if (!query || query.trim() === '') {
      return this.musicLibrary;
    }
    
    const lowerQuery = query.toLowerCase();
    return this.musicLibrary.filter(music => 
      music.title.toLowerCase().includes(lowerQuery) ||
      music.artist.toLowerCase().includes(lowerQuery) ||
      music.album.toLowerCase().includes(lowerQuery) ||
      music.genre.some(g => g.toLowerCase().includes(lowerQuery))
    );
  }

  // 根据ID获取音乐
  getMusicById(id) {
    return this.musicLibrary.find(music => music.id === id);
  }

  // 获取音乐列表
  getMusicList(filters = {}) {
    let list = [...this.musicLibrary];
    
    // 应用过滤器
    if (filters.artist) {
      list = list.filter(music => music.artist === filters.artist);
    }
    
    if (filters.album) {
      list = list.filter(music => music.album === filters.album);
    }
    
    if (filters.genre) {
      list = list.filter(music => music.genre.includes(filters.genre));
    }
    
    if (filters.format) {
      list = list.filter(music => music.format === filters.format);
    }
    
    return list;
  }

  // 获取所有艺术家
  getArtists() {
    const artists = new Set();
    this.musicLibrary.forEach(music => artists.add(music.artist));
    return Array.from(artists).sort();
  }

  // 获取所有专辑
  getAlbums() {
    const albums = new Set();
    this.musicLibrary.forEach(music => albums.add(music.album));
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

  // 设置当前播放
  setCurrentlyPlaying(musicId) {
    const music = this.getMusicById(musicId);
    if (music) {
      this.currentlyPlaying = music;
      return music;
    }
    return null;
  }

  // 获取当前播放
  getCurrentlyPlaying() {
    return this.currentlyPlaying;
  }

  // 清除当前播放
  clearCurrentlyPlaying() {
    this.currentlyPlaying = null;
  }
}

// 导出单例
module.exports = new MusicManager();