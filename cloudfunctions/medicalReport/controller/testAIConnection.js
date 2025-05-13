/**
 * 测试AI连接
 */
const config = require('../config/config.js');
const axios = require('axios');

/**
 * 测试DeepSeek API连接
 * @returns {Promise<Object>} - 测试结果
 */
exports.main = async () => {
  try {
    console.log('[测试] 开始测试DeepSeek API连接');
    
    // 从配置获取API参数
    const API_KEY = config.DEEPSEEK_API_KEY;
    const API_URL = config.DEEPSEEK_API_URL;
    const MODEL = config.DEEPSEEK_MODEL;
    
    console.log('[测试] API配置:', {
      url: API_URL,
      model: MODEL,
      keyPrefix: API_KEY ? API_KEY.substring(0, 5) + '...' : 'undefined'
    });
    
    // 简单请求数据
    const data = {
      model: MODEL,
      messages: [
        {
          role: "user",
          content: "你好，这是一个API连接测试。请回复：'API连接正常'"
        }
      ],
      temperature: 0.5,
      max_tokens: 20
    };
    
    console.log('[测试] 发送测试请求');
    const startTime = Date.now();
    
    // 发送请求
    const response = await axios({
      method: 'post',
      url: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: JSON.stringify(data),
      timeout: 10000
    });
    
    const duration = Date.now() - startTime;
    console.log(`[测试] 请求完成，耗时: ${duration}ms`);
    console.log('[测试] 响应状态:', response.status);
    
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log('[测试] 响应内容:', content);
      
      return {
        code: 0,
        msg: '连接测试成功',
        data: {
          response: content,
          duration: duration,
          status: response.status
        }
      };
    } else {
      console.error('[测试] 响应格式不正确:', response.data);
      return {
        code: 1001,
        msg: '响应格式不正确',
        data: response.data
      };
    }
  } catch (err) {
    console.error('[测试] 连接测试失败:', err.message);
    
    // 详细错误信息
    const errorDetails = {};
    if (err.response) {
      errorDetails.status = err.response.status;
      errorDetails.data = err.response.data;
    }
    
    return {
      code: 1000,
      msg: '连接测试失败: ' + err.message,
      error: errorDetails
    };
  }
}; 