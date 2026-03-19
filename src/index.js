const { Client } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
require('dotenv').config();

const QwenService = require('./qwen-service');

class WhatsAppBot {
  constructor() {
    this.client = new Client({
      puppeteer: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu',
          '--proxy-server=http://192.168.28.12:8118'
        ]
      },
      // 自定义 WhatsApp 网页地址，备用域名
      webVersion: 'https://web.whatsapp.com'
    });

    this.qwenService = new QwenService();
    this.botName = process.env.BOT_NAME || '社群助手';
    this.enableGreeting = process.env.ENABLE_GREETING !== 'false';
    this.greetingMessage = process.env.GREETING_MESSAGE || '欢迎加入社群！';

    this.setupEventListeners();
  }


  // 加入随机延迟
  // 生成随机整数 (min 到 max 之间，单位毫秒)
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // 模拟人类打字延时 ( 1.5 秒 到 4 秒 之间)
  async simulateTypingDelay() {
    const delay = this.getRandomInt(1500, 4000); 
    console.log(`⏳ 模拟打字延迟 ${delay}ms...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // 
  setupEventListeners() {
    // 二维码扫描
    this.client.on('qr', (qr) => {
      console.log('请使用 WhatsApp 扫描二维码登录:');
      qrcode.generate(qr, { small: true });
    });

    // 登录成功
    this.client.on('ready', () => {
      try {
        const info = this.client.info;
        const userName = info?.pushname || info?.wid?.user || '未知用户';
        console.log(`✅ 机器人已就绪，登录用户: ${userName}`);
      } catch (err) {
        console.warn('⚠️ 获取用户信息失败:', err.message);
        console.log(`✅ 机器人已就绪，登录用户: undefined (可忽略)`);
      }
      try {
        // 获取机器人自己的完整 ID (包含正确的国家代码和后缀)
        const myId = this.client.info.wid._serialized; 
        console.log(`✅ 机器人已就绪，我的 ID 是: ${myId}`);

        // 延迟一段时间，等待网页端完全加载聊天列表
        setTimeout(async () => {
            console.log('📤 正在发送自测消息...');
            // 使用系统识别出的本人 ID 发送，成功率最高
            await this.client.sendMessage(myId, '这是发给自己的测试消息'); 
        }, 10000);

      } catch (err) {
        console.error('❌ Ready 处理出错:', err);
      }
    });


    // 监听发送消息事件
    this.client.on('message_create', async (message) => {
      console.log('pong');
    });

    // 收到消息
    this.client.on('message', async (message) => {
      console.log('pong');
      await this.handleMessage(message);
    });


    // 群组成员变动（欢迎新人）
    this.client.on('group_join', async (notification) => {
      await this.handleGroupJoin(notification);
    });

    // 认证失败
    this.client.on('auth_failure', (msg) => {
      console.error('❌ 认证失败:', msg);
    });

    // 断开连接
    this.client.on('disconnected', (reason) => {
      console.log('❌ 断开连接:', reason);
    });
  }

  async handleMessage(message) {
    console.log('接收到消息');
    // 忽略自己发送的消息
     if (message.fromMe) return;

    // 忽略状态消息
    if (message.type === 'revoked_caption' || message.type === 'e2e_notification') return;

    const contact = await message.getContact();
    const chat = await message.getChat();

    console.log(`收到消息 - 来自：${contact.pushname || contact.number}，聊天：${chat.id._server}`);

    // 私聊消息处理
    if (chat.isGroup === false) {
      await this.handlePrivateMessage(message, contact);
      return;
    }

    // 群聊消息处理 - 只有被@时才回复
    if (message.mentionedIds && message.mentionedIds.some(id => id.includes(this.client.info.wid._user))) {
      await this.handleGroupMention(message, contact, chat);
    }
  }

  async handlePrivateMessage(message, contact) {
    try {
      // 简单的打招呼逻辑
      const text = message.body.toLowerCase();

      if (text.includes('你好') || text.includes('hello') || text.includes('hi') || text.includes('嗨')) {
        const userName = contact.pushname || contact.number || '朋友';
        
        // 加入延迟
        await this.simulateTypingDelay();

        const reply = await this.qwenService.generateGreeting(userName);
        await message.reply(reply);
      }
    } catch (error) {
      console.error('处理私聊消息失败:', error.message);
    }
  }

  async handleGroupMention(message, contact, chat) {
    try {
      const userName = contact.pushname || '群友';
      const userMessage = message.body.replace(/@\d+/, '').trim();

      console.log(`被@了 - 用户：${userName}, 消息：${userMessage}`);


      // 加入延迟
        await this.simulateTypingDelay();


      // 调用千问生成回复
      const reply = await this.qwenService.chat(
        `${userName} 在群里问道：${userMessage}`,
        `你是${process.env.BOT_NAME}，一个友善的社群 AI 助手。请用简洁友好的语气回复，控制在 100 字以内。`
      );

      await message.reply(`@${contact.number} ${reply}`);
    } catch (error) {
      console.error('处理群聊@消息失败:', error.message);
      await message.reply('抱歉，我现在有点忙，请稍后再试~');
    }
  }

  async handleGroupJoin(notification) {
    if (!this.enableGreeting) return;

    try {
      const chat = await notification.getChat();
      const contact = await notification.getAuthor();
      const userName = contact.pushname || '新成员';

      console.log(`新成员加入群聊：${userName}, 群：${chat.name}`);

      // 发送欢迎消息
      const welcomeMessage = this.greetingMessage.replace('{name}', userName);
      await chat.sendMessage(welcomeMessage);

      // 也可以用 AI 生成个性化欢迎语
      // const aiGreeting = await this.qwenService.generateGreeting(userName);
      // await chat.sendMessage(aiGreeting);
    } catch (error) {
      console.error('处理新人入群失败:', error.message);
    }
  }

  async start() {
    console.log('🤖 正在启动 WhatsApp 机器人...');
    await this.client.initialize();
    console.log('初始化完成！');
  }

  async stop() {
    console.log('🛑 正在停止机器人...');
    await this.client.destroy();
  }
}

module.exports = WhatsAppBot;
