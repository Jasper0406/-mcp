// 工具函数模块

/**
 * 格式化时间（秒转换为分:秒格式）
 * @param {number} seconds - 秒数
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '0:00';
  
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * 生成唯一ID
 * @returns {string} 唯一ID
 */
function generateUniqueId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的文件大小字符串
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证文件路径是否安全（防止路径遍历攻击）
 * @param {string} basePath - 基础路径
 * @param {string} userPath - 用户提供的路径
 * @returns {boolean} 是否安全
 */
function isValidPath(basePath, userPath) {
  const normalizedBasePath = require('path').normalize(basePath);
  const normalizedUserPath = require('path').normalize(userPath);
  
  return normalizedUserPath.startsWith(normalizedBasePath);
}

/**
 * 清理字符串（移除特殊字符等）
 * @param {string} str - 原始字符串
 * @returns {string} 清理后的字符串
 */
function sanitizeString(str) {
  if (!str) return '';
  return str.replace(/[<>"'&]/g, '');
}

/**
 * 延迟函数
 * @param {number} ms - 延迟毫秒数
 * @returns {Promise} Promise对象
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 重试函数
 * @param {Function} fn - 要重试的函数
 * @param {number} retries - 重试次数
 * @param {number} delayMs - 重试间隔（毫秒）
 * @returns {Promise} Promise对象
 */
async function retry(fn, retries = 3, delayMs = 1000) {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await delay(delayMs);
    return retry(fn, retries - 1, delayMs * 2); // 指数退避
  }
}

/**
 * 日志记录函数
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {Object} data - 附加数据
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [${level.toUpperCase()}] ${message}`, data);
}

module.exports = {
  formatTime,
  generateUniqueId,
  formatFileSize,
  isValidPath,
  sanitizeString,
  delay,
  retry,
  log
};