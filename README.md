# 小智AI机器人音乐服务(MCP)

这是一个基于小智AI机器人的一站式音乐服务，主要功能是调用本地音乐库并通过API接口实现在小智AI机器人上运行。

## 功能特点

- 本地音乐库扫描与管理
- RESTful API接口提供音乐查询、播放等功能
- 与小智AI机器人集成
- 支持音乐分类、搜索和播放控制

## 项目结构

- `main.js`: 主应用入口
- `config.js`: 配置文件
- `musicManager.js`: 音乐库管理模块
- `apiServer.js`: API服务器模块
- `utils/`: 工具函数目录

## 安装与使用

1. 安装依赖：
```bash
npm install
```

2. 配置音乐库路径：
修改 `config.js` 中的音乐库路径配置

3. 启动服务：
```bash
npm start
```

4. 集成到小智AI机器人：
参考小智AI机器人文档，配置API调用

## 技术栈

- Node.js
- Express.js
- 音乐文件处理库

## API文档

### 音乐查询
GET /api/music/search?query=关键词

### 获取音乐列表
GET /api/music/list

### 播放音乐
GET /api/music/play?id=音乐ID

### 暂停音乐
GET /api/music/pause

### 继续播放
GET /api/music/resume

### 停止播放
GET /api/music/stop

## 许可证
MIT