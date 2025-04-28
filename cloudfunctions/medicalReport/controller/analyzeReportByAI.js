/**
 * AI分析体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'
const axios = require('axios')

// DeepSeek API配置
// TODO: 替换为实际的API地址和密钥
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
const DEEPSEEK_API_KEY = 'sk-7dbea75119104c51bb178da367c25ea0'

/**
 * AI分析体检报告
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {String} params.reportId - 报告ID
 * @param {String} params.reportContent - 报告内容
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  try {
    // 参数校验
    if (!params.userId) {
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.reportId) {
      return { code: 1002, msg: '报告ID不能为空' }
    }
    if (!params.reportContent) {
      return { code: 1003, msg: '报告内容不能为空' }
    }

    // 查询报告是否存在
    const reportResult = await db.collection(reportCollection).doc(params.reportId).get()
    
    if (!reportResult.data) {
      return { code: 1004, msg: '报告不存在' }
    }
    
    // 权限校验：是否是用户自己的报告
    if (reportResult.data.userId !== params.userId) {
      return { code: 1005, msg: '无权访问该报告' }
    }

    // 调用DeepSeek API进行体检报告分析
    const aiResult = await callDeepSeekAPI(params.reportContent)

    // 更新数据库，写入AI分析结果
    await db.collection(reportCollection).doc(params.reportId).update({
      data: {
        aiAnalysis: aiResult
      }
    })

    return {
      code: 0,
      msg: 'AI分析成功',
      data: aiResult
    }
  } catch (err) {
    console.error('AI分析体检报告失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
}

/**
 * 调用DeepSeek API
 * @param {String} reportContent - 体检报告内容
 * @returns {Object} - AI分析结果
 */
async function callDeepSeekAPI(reportContent) {
  try {
    // 构造AI分析提示词
    const prompt = `
      你是一位专业的医学顾问。请分析以下体检报告内容，并提供健康建议、风险评估和详细分析。
      请以JSON格式返回分析结果，包含以下字段：
      - suggestion: 健康建议
      - riskLevel: 健康风险等级 (低/中/高)
      - details: 详细分析

      体检报告内容：
      ${reportContent}
    `

    // 调用DeepSeek API
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a professional medical consultant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      }
    })

    // 解析API返回结果
    const aiResponse = response.data.choices[0].message.content
    let aiResult

    try {
      // 尝试解析JSON格式结果
      aiResult = JSON.parse(aiResponse)
    } catch (e) {
      // 如果无法解析，使用默认结构和错误提示
      console.error('解析AI返回结果失败', e)
      aiResult = {
        suggestion: '无法解析AI分析结果，请重试',
        riskLevel: '未知',
        details: aiResponse
      }
    }

    return aiResult
  } catch (err) {
    console.error('调用DeepSeek API失败', err)
    
    // 返回默认错误结果
    return {
      suggestion: 'AI分析服务暂时不可用，请稍后重试',
      riskLevel: '未知',
      details: '调用DeepSeek API失败: ' + (err.message || '未知错误')
    }
  }
} 