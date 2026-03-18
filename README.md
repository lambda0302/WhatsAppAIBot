# WhatsApp 千问社群机器人

一个基于 whatsapp-web.js 和阿里千问大模型的 WhatsApp 社群机器人框架。

## 功能特性

- ✅ WhatsApp 扫码登录
- ✅ 私聊自动回复（打招呼）
- ✅ 群聊@提及回复
- ✅ 新成员入群欢迎
- ✅ 接入阿里千问大模型

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件（已预配置）：

```env
QWEN_API_KEY=sk-5e2e53935e0e4714bf034020cdcb25d2
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
QWEN_MODEL=qwen-plus
BOT_NAME=社群助手
ENABLE_GREETING=true
GREETING_MESSAGE=🎉 欢迎加入社群！
```

### 3. 运行机器人

```bash
npm start
```

首次运行会显示二维码，使用 WhatsApp 手机 App 扫描即可登录。

## 项目结构

```
whatsapp-qwen-bot/
├── app.js              # 应用入口
├── src/
│   ├── index.js        # WhatsApp 机器人主逻辑
│   └── qwen-service.js # 阿里千问 API 服务
├── .env                # 环境配置
├── .env.example        # 配置模板
└── package.json
```

## 使用说明

### 私聊
用户发送「你好」「hello」「hi」等问候语时，机器人会调用千问生成个性化欢迎回复。

### 群聊
- 只有在群里被 @ 时才会回复
- 自动调用千问生成回复内容

### 新人入群
- 自动发送预设的欢迎消息
- 可选：启用 AI 生成个性化欢迎语（修改 `src/index.js` 中 `handleGroupJoin` 方法）

## 自定义

### 修改 AI 人设

编辑 `src/index.js` 中的 `systemPrompt`：

```javascript
const reply = await this.qwenService.chat(
  message.body,
  '你是一个幽默风趣的社群管理员...' // 修改这里
);
```

### 添加更多自动回复规则

在 `handleMessage` 方法中添加：

```javascript
if (message.body.includes('价格')) {
  await message.reply('我们的产品定价如下...');
}
```

## 注意事项

1. **网络要求**: 访问 WhatsApp 需要稳定的网络连接，中国大陆用户可能需要配置代理
2. 首次登录会生成 `whatsapp-session` 文件夹保存会话，下次启动无需重新扫码
3. 如果连接超时，请在 `.env` 中配置 `HTTP_PROXY` 代理

### 配置代理（如需要）

编辑 `.env` 文件，取消注释并修改代理地址：

```env
HTTP_PROXY=http://127.0.0.1:7890
```

或者在命令行设置：

```bash
# Windows PowerShell
$env:HTTP_PROXY="http://127.0.0.1:7890"; npm start

# Windows CMD
set HTTP_PROXY=http://127.0.0.1:7890 && npm start
```

## 依赖

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API
- [阿里千问](https://help.aliyun.com/zh/dashscope/) - 大模型 API
