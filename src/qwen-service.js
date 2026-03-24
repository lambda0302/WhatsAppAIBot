const axios = require('axios');

class QwenService {
  constructor() {
    this.apiKey = process.env.QWEN_API_KEY;
    this.apiUrl = process.env.QWEN_API_URL;
    this.model = process.env.QWEN_MODEL || 'qwen-plus';
  }

  /**
   * 调用阿里千问 API
   * @param {string} prompt - 用户输入
   * @param {string} systemPrompt - 系统提示词
   * @returns {Promise<string>} - AI 回复
   */
  async chat(prompt, systemPrompt = '你是一个友好的WhatsApp社群助手') {
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('千问 API 调用失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 生成打招呼回复
   * @param {string} nameString - 用户名称
   * @returns {Promise<string>}
   */
  async generateGreeting(nameString) {
    const prompt = `请为社群新成员 ${nameString} 生成一句简短友好的欢迎语，50 字以内`;
    return await this.chat(prompt, '你是一个热情的社群管理员，擅长欢迎新成员');
  }
}

module.exports = QwenService;
