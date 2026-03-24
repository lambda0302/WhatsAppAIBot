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
            console.error('加载配置文件失败，使用默认值');
            this.config = { newProduct: "暂无新品", weeklyActivity: "暂无活动" };
        }
    }

    // 提供给 Bot 调用：更新内容并写入文件
    saveConfig(key, content) {
        this.config[key] = content;
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        console.log(`💾 已持久化更新 ${key}`);
    }

    // 初始化所有定时任务
    init() {
        // 示例：每天上午 10:00 推送新品信息
        // 秒 分 时 日 月 周
        cron.schedule('0 * * * * *', async () => {
            console.log('⏰ 触发定时任务：推送每日新品');
            await this.pushNewProducts();
        });

        // 示例：每周五下午 15:00 推送促销活动
        cron.schedule('0 * * * * *', async () => {
            console.log('⏰ 触发定时任务：推送周五活动');
            await this.pushWeeklyActivity();
        });
    }

    async pushNewProducts() {
        await this.broadcastToGroups(this.config.newProduct);
    }

    async pushWeeklyActivity() {
        await this.broadcastToGroups(this.config.weeklyActivity);
    }

    async broadcastToGroups(content) {
        try {

            const groups = await this.bot.getAllGroups();

            for (const group of groups) {
                // 建议群发之间加一点随机延迟，防止被封号
                await new Promise(resolve => setTimeout(resolve, 3000));
                await group.sendMessage(content);
                console.log(`✅ 已推送至群组: ${group.name}`);
            }
        } catch (error) {
            console.error('推送失败:', error);
        }
    }
}

module.exports = BroadcastService;