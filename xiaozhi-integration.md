# 小智AI机器人集成指南

本文档详细说明如何将音乐服务(MCP)集成到小智AI机器人中。

## 前提条件

1. 确保小智AI机器人SDK已正确安装和配置
2. 音乐服务(MCP)已成功启动并运行
3. 小智AI机器人能够访问到音乐服务的API地址

## 集成步骤

### 1. 配置小智AI机器人

在小智AI机器人的配置文件中添加以下配置：

```json
{
  "plugins": {
    "musicService": {
      "enabled": true,
      "apiBaseUrl": "http://localhost:3000/api",
      "commandPrefix": "音乐",
      "responseTemplates": {
        "searchResults": "找到 {{total}} 首相关音乐",
        "nowPlaying": "正在播放：{{title}} - {{artist}}",
        "playError": "抱歉，无法播放该音乐",
        "noMusicFound": "没有找到相关音乐"
      }
    }
  }
}
```

### 2. 创建音乐服务插件

在小智AI机器人的插件目录中创建音乐服务插件：

```javascript
// xiaozhi-music-plugin.js

const axios = require('axios');

class MusicServicePlugin {
  constructor(robot) {
    this.robot = robot;
    this.apiBaseUrl = robot.config.plugins.musicService.apiBaseUrl;
    this.commandPrefix = robot.config.plugins.musicService.commandPrefix;
    this.responseTemplates = robot.config.plugins.musicService.responseTemplates;
    
    this._registerCommands();
  }
  
  _registerCommands() {
    // 搜索音乐
    this.robot.on(`${this.commandPrefix}搜索`, async (message, params) => {
      try {
        const response = await axios.get(`${this.apiBaseUrl}/music/search`, {
          params: { query: params.text }
        });
        
        if (response.data.success) {
          const template = this.responseTemplates.searchResults;
          const reply = template.replace('{{total}}', response.data.total);
          
          // 如果有结果，可以列出前几首
          if (response.data.results.length > 0) {
            let list = '\n';
            response.data.results.slice(0, 5).forEach((music, index) => {
              list += `${index + 1}. ${music.title} - ${music.artist}\n`;
            });
            this.robot.reply(message, reply + list);
          } else {
            this.robot.reply(message, this.responseTemplates.noMusicFound);
          }
        } else {
          this.robot.reply(message, response.data.message || '搜索失败');
        }
      } catch (error) {
        console.error('搜索音乐失败:', error);
        this.robot.reply(message, '搜索音乐时发生错误');
      }
    });
    
    // 播放音乐
    this.robot.on(`${this.commandPrefix}播放`, async (message, params) => {
      try {
        // 先搜索音乐
        const searchResponse = await axios.get(`${this.apiBaseUrl}/music/search`, {
          params: { query: params.text }
        });
        
        if (searchResponse.data.success && searchResponse.data.results.length > 0) {
          // 播放第一首
          const music = searchResponse.data.results[0];
          const playResponse = await axios.get(`${this.apiBaseUrl}/music/play/${music.id}`);
          
          if (playResponse.data.success) {
            const template = this.responseTemplates.nowPlaying;
            const reply = template
              .replace('{{title}}', music.title)
              .replace('{{artist}}', music.artist);
            this.robot.reply(message, reply);
          } else {
            this.robot.reply(message, this.responseTemplates.playError);
          }
        } else {
          this.robot.reply(message, this.responseTemplates.noMusicFound);
        }
      } catch (error) {
        console.error('播放音乐失败:', error);
        this.robot.reply(message, '播放音乐时发生错误');
      }
    });
    
    // 暂停播放
    this.robot.on(`${this.commandPrefix}暂停`, async (message) => {
      try {
        const response = await axios.get(`${this.apiBaseUrl}/music/pause`);
        if (response.data.success) {
          this.robot.reply(message, response.data.message);
        } else {
          this.robot.reply(message, response.data.message);
        }
      } catch (error) {
        console.error('暂停播放失败:', error);
        this.robot.reply(message, '暂停播放时发生错误');
      }
    });
    
    // 继续播放
    this.robot.on(`${this.commandPrefix}继续`, async (message) => {
      try {
        const response = await axios.get(`${this.apiBaseUrl}/music/resume`);
        if (response.data.success) {
          this.robot.reply(message, response.data.message);
        } else {
          this.robot.reply(message, response.data.message);
        }
      } catch (error) {
        console.error('继续播放失败:', error);
        this.robot.reply(message, '继续播放时发生错误');
      }
    });
    
    // 停止播放
    this.robot.on(`${this.commandPrefix}停止`, async (message) => {
      try {
        const response = await axios.get(`${this.apiBaseUrl}/music/stop`);
        if (response.data.success) {
          this.robot.reply(message, response.data.message);
        } else {
          this.robot.reply(message, response.data.message);
        }
      } catch (error) {
        console.error('停止播放失败:', error);
        this.robot.reply(message, '停止播放时发生错误');
      }
    });
    
    // 当前播放
    this.robot.on(`${this.commandPrefix}当前播放`, async (message) => {
      try {
        const response = await axios.get(`${this.apiBaseUrl}/music/current`);
        if (response.data.success && response.data.current) {
          const music = response.data.current;
          this.robot.reply(message, `当前播放：${music.title} - ${music.artist}（专辑：${music.album}）`);
        } else {
          this.robot.reply(message, '当前没有播放任何音乐');
        }
      } catch (error) {
        console.error('获取当前播放失败:', error);
        this.robot.reply(message, '获取当前播放时发生错误');
      }
    });
  }
}

module.exports = MusicServicePlugin;
```

### 3. 加载插件到小智AI机器人

在小智AI机器人的主程序中加载音乐服务插件：

```javascript
// robot.js

const MusicServicePlugin = require('./plugins/xiaozhi-music-plugin');

const robot = new XiaozhiRobot(config);

// 加载音乐服务插件
robot.use(new MusicServicePlugin(robot));

// 启动机器人
robot.start();
```

## 使用示例

### 与小智AI机器人的对话示例：

- **用户**: 音乐搜索周杰伦
  **小智**: 找到 15 首相关音乐
  1. 稻香 - 周杰伦
  2. 青花瓷 - 周杰伦
  3. 七里香 - 周杰伦
  ...

- **用户**: 音乐播放青花瓷
  **小智**: 正在播放：青花瓷 - 周杰伦

- **用户**: 音乐暂停
  **小智**: 已暂停: 青花瓷

- **用户**: 音乐继续
  **小智**: 继续播放: 青花瓷

- **用户**: 音乐停止
  **小智**: 已停止播放

- **用户**: 音乐当前播放
  **小智**: 当前播放：青花瓷 - 周杰伦（专辑：我很忙）

## 故障排除

### 常见问题：

1. **API连接失败**
   - 检查音乐服务是否正在运行
   - 确认API地址配置正确
   - 检查网络连接和防火墙设置

2. **音乐文件无法播放**
   - 确保音乐文件格式受支持
   - 检查音乐文件权限
   - 验证音乐文件是否完整

3. **命令无响应**
   - 检查命令前缀配置
   - 确认插件已正确加载
   - 查看机器人日志以获取错误信息

## 高级配置

### 自定义命令

可以根据需要自定义更多命令，例如：

```javascript
// 下一首
this.robot.on(`${this.commandPrefix}下一首`, async (message) => {
  // 实现下一首逻辑
});

// 上一首
this.robot.on(`${this.commandPrefix}上一首`, async (message) => {
  // 实现上一首逻辑
});

// 设置音量
this.robot.on(`${this.commandPrefix}音量`, async (message, params) => {
  // 实现音量控制逻辑
});
```

### 高级功能扩展

- 实现播放列表功能
- 添加音乐收藏功能
- 集成歌词显示
- 实现均衡器控制

## 联系与支持

如有任何问题或需要进一步的帮助，请联系开发团队。