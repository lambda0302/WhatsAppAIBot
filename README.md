# WhatsApp 千问社群机器人

基于 whatsapp-web.js 和阿里千问大模型的智能 WhatsApp 社群机器人，包含自动化推送、管理员指令和智能回复功能。

## 功能特性

- ✅ WhatsApp 扫码登录（支持持久化会话）
- ✅ 私聊自动回复（AI 生成个性化欢迎语）
- ✅ 群聊 @提及回复
- ✅ 新人入群欢迎 + 自动发布公司信息和群规
- ✅ 管理员指令系统
- ✅ 定时推送服务（新品/活动）
- ✅ 模拟人类打字延迟
- ✅ 代理支持

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件：

```env
# 阿里千问 API Key


# 阿里千问 API 端点
QWEN_API_URL=https://dashscope.aliyuncs.com/compatible-mode/v1

# 模型名称
QWEN_MODEL=qwen-plus-2025-07-28

# 机器人名称
BOT_NAME=社群助手

# 是否启用打招呼功能
ENABLE_GREETING=true

# HTTP 代理（访问 WhatsApp 必需）
HTTP_PROXY=http:
```

### 3. 运行机器人

```bash
npm start
```

首次运行会显示二维码，使用 WhatsApp 手机 App 扫描登录。

## 项目结构

```
whatsapp-qwen-bot/
├── app.js                    # 应用入口，启动广播服务
├── src/
│   ├── index.js              # WhatsApp 机器人核心逻辑
│   ├── constants.js          # 公司信息和群规常量
│   ├── qwen-service.js       # 阿里千问 API 服务
│   └── services/
│       └── broadcast-service.js  # 定时推送服务
├── .env                      # 环境配置
├── config.json               # 推送内容配置（自动生成）
├── .gitignore
├── package.json
└── README.md
```

## 使用说明

### 管理员指令

管理员可以通过私聊发送以下指令：

| 指令 | 说明 |
|------|------|
| `!设置新品 内容` | 设置每日新品推送内容，配置保存到 `config.json` |
| `!设置活动 内容` | 设置每周活动推送内容 |
| `!查看当前内容` | 查看当前推送配置 |

**示例：**
```
!设置新品
本周推荐：
- 产品A：性价比最高
- 产品B：品质保障

价格：联系客服获取报价
```

### 私聊回复

用户发送「你好」「hello」「hi」等问候语时，机器人会调用千问生成个性化欢迎回复。

### 群聊回复

只有在群里被 @ 时才会回复，自动调用千问生成回复内容。

### 新人入群

新人加入群聊时，机器人会：
1. 生成个性化欢迎语
2. 发布公司介绍信息
3. 发布群规说明

这些内容在 `src/constants.js` 中配置。

### 定时推送

**每天每小时**推送新品信息（可修改 cron 表达式）：
```javascript
cron.schedule('0 * * * * *', async () => {
    await this.pushNewProducts();
});
```

**每周五下午 3:00**推送活动信息（可修改 cron 表达式）：
```javascript
cron.schedule('0 15 * * 5', async () => {
    await this.pushWeeklyActivity();
});
```

## 定时任务配置

编辑 `src/services/broadcast-service.js` 中的 `init()` 方法：

```javascript
// 每天上午 10:00
cron.schedule('0 10 * * *', async () => {...});

// 每周一上午 9:00
cron.schedule('0 9 * * 1', async () => {...});

// 每月1号凌晨 12:00
cron.schedule('0 0 1 * *', async () => {...});
```

## 代理配置

访问 WhatsApp 需要网络代理，在 `.env` 中配置：

```env
HTTP_PROXY=http:
```

或在 `src/index.js` 的 Puppeteer 配置中直接设置：

```javascript
puppeteer: {
  args: ['--proxy-server=http://your-proxy:port']
}
```

## 模拟人类行为

机器人使用随机延迟模拟真实打字：

```javascript
async simulateTypingDelay() {
  const delay = this.getRandomInt(1500, 4000); // 1.5-4秒
  await new Promise(resolve => setTimeout(resolve, delay));
}
```

## 配置文件

### 公司信息

编辑 `src/constants.js` 中的 `COMPANY_INFO`：

```javascript
COMPANY_INFO: `
欢迎加入 [社群名称]！
...
`
```

### 群规

编辑 `src/constants.js` 中的 `GROUP_RULES`：

```javascript
GROUP_RULES: `
📜 *群规说明*
1. ...
2. ...
`
```

## 管理员配置

在 `src/index.js` 中配置管理员手机号（不带 @s.whatsapp.net）：

```javascript
const isAdmin = contact.number === '你的手机号';
```

## 常见问题

### Q: 扫码后显示认证失败？

A: 检查代理配置是否正确，确保能访问 `web.whatsapp.com`

### Q: 群聊推送太频繁会被封号？

A: 代码中已添加 3 秒随机延迟，可在 `broadcast-service.js` 中调整

### Q: 想要推送其他时间段？

A: 修改 `broadcast-service.js` 中的 cron 表达式

### Q: 配置如何保存？

A: 管理员指令会自动保存到 `config.json`，重启后仍然有效

## 依赖

- [whatsapp-web.js](https://github.com/pedroslopez/whatsapp-web.js) - WhatsApp Web API
- [阿里千问](https://help.aliyun.com/zh/dashscope/) - 大模型 API
- [node-cron](https://www.npmjs.com/package/node-cron) - 定时任务
- [axios](https://axios-http.com/) - HTTP 请求

## License

MIT
