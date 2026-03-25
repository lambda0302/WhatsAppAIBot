const { Client, LocalAuth} = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { COMPANY_INFO, GROUP_RULES } = require('./constants'); // 引入常量
// const {BroadcastService} = require('./services/broadcast-service.js')
require('dotenv').config();

const QwenService = require('./qwen-service');

class WhatsAppBot {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "qwen-bot" // 建议指定 ID，防止多实例冲突
      }),
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
          '--proxy-server='
        ]
      },
      // 自定义 WhatsApp 网页地址，备用域名
      webVersion: 'https://web.whatsapp.com'
    });

    this.qwenService = new QwenService();
    this.botName = process.env.BOT_NAME || '社群助手';
    this.enableGreeting = process.env.ENABLE_GREETING !== 'false';
    this.greetingMessage = process.env.GREETING_MESSAGE || '欢迎加入社群！';
    this.broadcastService = null;
    this.setupEventListeners();
  }

  // 提供一个方法接收外部注入的实例
  setBroadcastService(service) {
    this.broadcastService = service;
  }

  // 新增：获取所有群组的公共方法，供 BroadcastService 调用
  async getAllGroups() {
    try {
      const chats = await this.client.getChats();
      return chats.filter(chat => chat.isGroup);
    } catch (error) {
      console.error('获取群组列表失败:', error);
      return [];
    }
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
    // 观察扫码之后是否有认证信息
    this.client.on('authenticated', () => {
      console.log('📡 认证成功！正在同步数据...');
    });

    // 登录成功
    this.client.on('ready', async () => {
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

        // 延迟一段时间，等待网页端完全加载聊天列表
        setTimeout(async () => {
            console.log('📤 正在发送自测消息...');
            // 使用系统识别出的本人 ID 发送，成功率最高
            const info = this.client.info;
            const userName = info?.pushname || info?.wid?.user || '未知用户';
            const aiGreeting = await this.qwenService.generateGreeting(userName);
            await this.client.sendMessage(myId, aiGreeting); 
        }, 10000);

      } catch (err) {
        console.error('❌ Ready 处理出错:', err);
      }

      try {
        // 延迟一段时间，等待网页端完全加载聊天列表
        setTimeout(async () => {
            console.log('📤 正在发送群聊消息...');
            // 向目标群聊发送消息
            await this.client.sendMessage('', '我是chatBot，登陆成功');
        }, 10000);

      } catch (err) {
        console.error('❌ Ready 处理出错:', err);
      }

    });

    // 监听发送消息事件
    this.client.on('message_create', async (message) => {
      console.log('message_create');
      //监听发送的指令信息
      const contact = await message.getContact();
      const chat = await message.getChat();
      if (contact.number === '86管理员电话号码' && message.body.startsWith('!')) {
        await this.handleAdminCommands(message, chat, contact);
      }
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
    //  if (message.fromMe) return;

    // 忽略状态消息
    if (message.type === 'revoked_caption' || message.type === 'e2e_notification') return;

    const contact = await message.getContact();
    const chat = await message.getChat();

    console.log(`收到消息 - 来自：${contact.pushname || contact.number}，聊天：${chat.id.server}`);
    //消息为来自管理员的指令信息
    if (contact.number === '86管理员电话号' && message.body.startsWith('!')) {
      await this.handleAdminCommands(message, chat, contact);
      return;
    }
    // 私聊消息处理
    if (chat.isGroup === false) {
      await this.handlePrivateMessage(message, contact);
      return;
    }

    // 群聊消息处理 - 只有被@时才回复
    if (message.mentionedIds && message.mentionedIds.some(id => id.includes(this.client.info.wid.user))) {
      await this.handleGroupMention(message, contact, chat);
    }
  }

  async handlePrivateMessage(message, contact) {
    try {
      const text = message.body.trim().toLowerCase();
      const isAdmin = contact.number === '管理员手机号'; // 替换为管理员的 WhatsApp 绑定的号码（不带@s.whatsapp.net）

      // 管理员指令处理
      if (isAdmin && text.startsWith('!')) {
        if (text.startsWith('!设置新品 ')) {
          const content = text.replace('!设置新品 ', '').trim();
          this.broadcastService.saveConfig('newProduct', content);
          await message.reply(`✅ 新品文案已更新并保存：\n\n${content}`);
          return;
        }

        if (text.startsWith('!设置活动 ')) {
          const content = text.replace('!设置活动 ', '').trim();
          this.broadcastService.saveConfig('weeklyActivity', content);
          await message.reply(`✅ 活动文案已更新并保存：\n\n${content}`);
          return;
        }

        if (text === '!查看当前内容') {
          const conf = this.broadcastService.config;
          await message.reply(`当前推送配置：\n\n[新品]: ${conf.newProduct}\n\n[活动]: ${conf.weeklyActivity}`);
          return;
        }
      }



      // 简单的打招呼逻辑
      if (text.includes('你好') || text.includes('hello') || text.includes('hi') || text.includes('嗨')) {
        const userName = contact.pushname || contact.name || contact.number || '朋友';
        
        // 加入延迟
        await this.simulateTypingDelay();

        const reply = await this.qwenService.generateGreeting(userName);
        await message.reply(reply);
      }else{
        // 加入延迟
        await this.simulateTypingDelay();

        const reply = await this.qwenService.chat(text,"你是一个友好的WhatsApp社群助手,请使用用户的语言回复他，告诉他如果想聊天的话请在群聊中@机器人");
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

      // notification.recipientIds 是一个包含 ID 字符串的数组
      const newUserIds = notification.recipientIds;

      // 使用 Promise.all 并行获取所有 Contact 对象
      const newContacts = await Promise.all(
          newUserIds.map(id => this.client.getContactById(id))
      );
      // 1. 提取所有新成员的名字（优先使用 pushname，没有则用 name，最后兜底用 '新成员'）
      const userNames = newContacts.map(contact => contact.pushname || contact.name || '新成员');

      // 2. 将名字数组连接成字符串，用中文顿号“、”分隔
      const namesString = userNames.join('、');

      // AI 生成个性化欢迎语
      const aiGreeting = await this.qwenService.generateGreeting(namesString);
      await chat.sendMessage(aiGreeting);
      
      //发布公司信息，清晰说明我们是谁
      setTimeout(async () => {
            await chat.sendMessage(COMPANY_INFO);
        }, 1500);
      //发布群规
      setTimeout(async () => {
        await chat.sendMessage(GROUP_RULES);
      }, 1500);

    } catch (error) {
      console.error('处理新人入群失败:', error.message);
    }
  }

  async handleAdminCommands(message, chat, contact) {
    // 统一转为 trim()，但内容部分保留原始换行和大小写（不使用 toLowerCase()）
    const text = message.body.trim();
    const isAdmin = contact.number === '86管理员电话号';
    //非管理员，退出操作
    if (!isAdmin){return;}

    // 1. 标记当前群组 (在群组内操作)
    // 格式：!标记群组 标签名
    if (text.startsWith('!标记群组 ')) {
      const tagName = text.replace('!标记群组 ', '').trim();
      if (!tagName) return await message.reply('❌ 请输入标签名，例如：!标记群组 electronics');

      const success = await this.broadcastService.addGroupToTag(tagName, chat.id._serialized);
      const resp = success
          ? `✅ 已将本群 [${chat.name}] 归类为标签：${tagName}`
          : `⚠️ 本群此前已在标签 [${tagName}] 下，无需重复添加。`;
      await message.reply(resp);
      return;
    }

    // 2. 动态设置标签推送内容 (建议私聊操作)
    // 格式：!设置内容 标签名 文案内容
    if (text.startsWith('!设置内容 ')) {
      const parts = text.split(/\s+/); // 使用正则匹配空格，支持多个空格分隔
      if (parts.length < 3) {
        return await message.reply('❌ 格式错误。\n正确格式：!设置内容 [标签名] [文案]\n示例：!设置内容 daily 🌟 今日特价...');
      }

      const tagName = parts[1];
      // 重新拼接文案，保留原有的空格和换行
      const content = text.split(tagName)[1].trim();

      this.broadcastService.updateTagContent(tagName, content);
      await message.reply(`✅ 标签 [${tagName}] 的文案已更新并持久化：\n\n${content}`);
      return;
    }

    // 3. 查看当前所有配置状态
    if (text === '!状态' || text === '!查看内容') {
      const tags = this.broadcastService.config.tags;
      if (Object.keys(tags).length === 0) {
        return await message.reply('📭 目前没有任何标签配置。');
      }

      let report = "📊 *当前推送配置概览*：\n";
      for (const [name, info] of Object.entries(tags)) {
        report += `\n🏷️ *标签*: ${name}`;
        report += `\n👥 *群组数*: ${info.groups.length}`;
        report += `\n📝 *文案预览*: ${info.content ? info.content.substring(0, 20) + '...' : '未设置'}`;
        report += `\n${'-'.repeat(15)}`;
      }
      await message.reply(report);
      return;
    }

    // 4. 清空某个标签的内容 (可选)
    if (text.startsWith('!清空标签 ')) {
      const tagName = text.replace('!清空标签 ', '').trim();
      if (this.broadcastService.config.tags[tagName]) {
        delete this.broadcastService.config.tags[tagName];
        this.broadcastService.saveConfig();
        await message.reply(`🗑️ 标签 [${tagName}] 及其关联数据已删除。`);
      } else {
        await message.reply(`❌ 未找到标签 [${tagName}]`);
      }
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
