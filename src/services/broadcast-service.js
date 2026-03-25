const cron = require('node-cron');
const fs = require('fs');
const path = require('path');

class BroadcastService {
    constructor(bot) {
        this.bot = bot; // 传入 WhatsAppBot 实例
        this.configPath = path.join(__dirname, 'config.json');
        this.loadConfig(); // 初始化时加载
    }

    loadConfig() {
        try {
            const data = fs.readFileSync(this.configPath, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            console.error('加载配置文件失败,使用默认值');
            this.config = {
                "tags": {
                    "electronics": {
                        "desc": "电子数码类",
                        "content": "默认电子产品文案",
                        "groups": []
                    },
                    "textile": {
                        "desc": "纺织面料类",
                        "content": "默认纺织类文案",
                        "groups": []
                    }
                }
            };
        }
    }

    // 动态更新某个标签的推送文案
    updateTagContent(tagName, newContent) {
        if (!this.config.tags[tagName]) {
            // 如果标签不存在，动态创建一个
            this.config.tags[tagName] = { desc: tagName, content: '', groups: [] };
        }
        this.config.tags[tagName].content = newContent;
        this.saveToFile();
    }

    // 将某个群组动态绑定到标签
    async addGroupToTag(tagName, groupId) {
        if (!this.config.tags[tagName]) {
            this.config.tags[tagName] = { desc: tagName, content: '新标签待设内容', groups: [] };
        }
        // 防止重复添加
        if (!this.config.tags[tagName].groups.includes(groupId)) {
            this.config.tags[tagName].groups.push(groupId);
            this.saveToFile();
            return true;
        }
        return false;
    }

    saveToFile() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    }


    // 提供给 Bot 调用：更新内容并写入文件
    // saveConfig(key, content) {
    //     this.config.tags[key].content = content;
    //     fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    //     console.log(`💾 已持久化更新 ${key}`);
    // }

    init() {
        // 每分钟执行一次标签推送任务 (示例)
        cron.schedule('0 * * * * *', async () => {
            console.log('⏰ 触发定时任务：按标签推送内容');
            await this.runTagBroadcast();
        });
    }

    async runTagBroadcast() {
        for (const [tagName, info] of Object.entries(this.config.tags)) {
            if (info.groups.length === 0 || !info.content) continue;

            console.log(`🚀 正在推送标签: ${tagName}`);
            for (const groupId of info.groups) {
                try {
                    const chat = await this.bot.client.getChatById(groupId);
                    // 随机延迟 3-6 秒避免封号
                    await new Promise(r => setTimeout(r, Math.random() * 3000 + 3000));
                    await chat.sendMessage(info.content);
                } catch (err) {
                    console.error(`群组 ${groupId} 推送失败:`, err.message);
                }
            }
        }
    }
}

module.exports = BroadcastService;