/**
 * 微信云函数配置项
 */

// 导出配置
module.exports = {
  // DeepSeek API配置
  DEEPSEEK_API_KEY: 'sk-7dbea75119104c51bb178da367c25ea0', // 与主配置文件中的密钥相同
  DEEPSEEK_API_URL: 'https://api.deepseek.com/v1/chat/completions',
  DEEPSEEK_MODEL: 'deepseek-chat',
  
  // 备用API地址
  BACKUP_API_URLS: [
    'https://api.deepseek.com/v1/chat/completions',  // 主地址
    'https://api-fallback.deepseek.com/v1/chat/completions' // 备用地址（假设）
  ],
  
  // AI分析超时设置
  AI_REQUEST_TIMEOUT: 7000,  // API请求超时（毫秒）
  AI_TOTAL_TIMEOUT: 8000,    // 总处理超时（毫秒）
  
  // 备用分析设置
  ALWAYS_USE_BACKUP: false,  // 是否始终使用备用分析（用于测试）
  
  // 其他medicalReport服务专用配置可以在这里添加
  // ...
} 