const WhatsAppBot = require('./src/index');
require('dotenv').config();

console.log('🚀 启动 WhatsApp 千问社群机器人...');
console.log('API Key:', process.env.QWEN_API_KEY ? '已配置' : '未配置');
console.log('模型:', process.env.QWEN_MODEL || 'qwen-plus');
console.log('---');

const bot = new WhatsAppBot();

// 
process.on('uncaughtException', (err) => {
    console.error('💥 发生严重错误:', err);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('🚫 未处理的 Promise 拒绝:', reason);
    process.exit(1);
});
// 


// bot.start().catch(console.error);


bot.start()
    .then(() => {
        console.log('✅ start() 函数执行完毕，等待事件中...');
    })
    .catch(err => {
        console.error('❌ start() 启动失败:', err);
        process.exit(1);
    });

process.on('SIGINT', async () => {
    console.log('\n收到退出信号，正在关闭...');
    await bot.stop();
    process.exit(0);
});
