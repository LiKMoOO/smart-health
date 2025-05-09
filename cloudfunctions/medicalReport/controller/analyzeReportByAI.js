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

// DeepSeek API配置，请替换为实际的API地址和密钥
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
  // 记录环境和请求参数
  console.log('[AI分析] 开始执行，云环境:', cloud.DYNAMIC_CURRENT_ENV);
  console.log('[AI分析] 请求参数:', JSON.stringify(params));
  console.log('[AI分析] 微信上下文:', JSON.stringify(wxContext));

  try {
    // 参数校验
    if (!params.userId && !wxContext.OPENID) {
      console.error('[AI分析] 用户ID不能为空');
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.reportId) {
      console.error('[AI分析] 报告ID不能为空');
      return { code: 1002, msg: '报告ID不能为空' }
    }

    // 确认userId
    const userId = params.userId || wxContext.OPENID;
    console.log('[AI分析] 使用的用户ID:', userId);

    // 先查询报告是否存在
    let reportResult;
    try {
      console.log('[AI分析] 开始查询报告数据，报告ID:', params.reportId);
      reportResult = await db.collection(reportCollection).doc(params.reportId).get();
      console.log('[AI分析] 查询到的报告数据:', JSON.stringify(reportResult.data));
    } catch (queryErr) {
      console.error('[AI分析] 查询报告失败:', queryErr);
      return { code: 1004, msg: '报告不存在或查询失败' }
    }
    
    if (!reportResult.data) {
      console.error('[AI分析] 报告不存在');
      return { code: 1004, msg: '报告不存在' }
    }
    
    // 权限校验：是否是用户自己的报告
    if (reportResult.data.userId !== userId) {
      console.error('[AI分析] 无权访问该报告，报告userId:', reportResult.data.userId, '请求userId:', userId);
      return { code: 1005, msg: '无权访问该报告' }
    }

    // 获取报告内容，优先使用传入的内容，否则使用存储的内容
    let reportContent = '';
    if (params.reportContent && params.reportContent.trim()) {
      console.log('[AI分析] 使用传入的报告内容');
      reportContent = params.reportContent;
    } else if (reportResult.data.summary) {
      console.log('[AI分析] 使用数据库中的报告内容');
      // 尝试构建完整内容
      reportContent = `体检报告摘要: ${reportResult.data.summary}\n`;
      reportContent += `体检日期: ${reportResult.data.reportDate}\n`;
      reportContent += `医院/机构: ${reportResult.data.hospital}\n`;
      reportContent += `报告类型: ${reportResult.data.reportType}\n`;
      
      // 添加报告项目数据
      if (reportResult.data.reportItems && reportResult.data.reportItems.length > 0) {
        reportContent += "\n体检项目详情:\n";
        reportResult.data.reportItems.forEach(group => {
          reportContent += `${group.name}:\n`;
          
          if (group.items && group.items.length > 0) {
            group.items.forEach(item => {
              const abnormalMark = item.abnormal ? "[异常]" : "";
              reportContent += `  ${item.name}: ${item.value}${item.unit || ''} ${abnormalMark} (参考范围: ${item.referenceRange || '未知'})\n`;
            });
          }
          
          reportContent += "\n";
        });
      }
    }
    
    // 内容为空则返回错误
    if (!reportContent.trim()) {
      console.error('[AI分析] 报告内容为空');
      return { code: 1003, msg: '报告内容不能为空，无法进行分析' }
    }

    console.log('[AI分析] 准备分析的报告内容长度:', reportContent.length);
    // 如果报告内容太长，截取前3000个字符
    if (reportContent.length > 3000) {
      console.log('[AI分析] 报告内容过长，将截取前3000个字符');
      reportContent = reportContent.substring(0, 3000) + "...(内容过长，已截断)";
    }

    // 调用DeepSeek API进行体检报告分析
    console.log('[AI分析] 开始调用DeepSeek API...');
    const aiResult = await callDeepSeekAPI(reportContent);
    console.log('[AI分析] AI分析结果:', JSON.stringify(aiResult));

    // 更新数据库，写入AI分析结果
    try {
      console.log('[AI分析] 开始写入AI分析结果到数据库');
      await db.collection(reportCollection).doc(params.reportId).update({
        data: {
          aiAnalysis: aiResult,
          aiAnalysisTime: db.serverDate()
        }
      });
      console.log('[AI分析] AI分析结果已写入数据库');
    } catch (updateErr) {
      console.error('[AI分析] 写入AI分析结果失败:', updateErr);
      // 不终止流程，继续返回分析结果
    }

    return {
      code: 0,
      msg: 'AI分析成功',
      data: aiResult
    }
  } catch (err) {
    console.error('[AI分析] 处理过程中发生异常，详细错误:', err);
    return {
      code: 500,
      msg: '系统错误，请稍后重试',
      error: err.message || '未知错误'
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
      你是一位专业的医学顾问，请分析以下体检报告内容，并提供健康建议、风险评估和详细分析。
      
      体检报告内容：
      ${reportContent}
      
      请根据体检报告的各项指标，特别关注异常项目，并给出专业的解读和建议。如果报告内容不完整，请基于现有信息给出分析。
      
      请以JSON格式返回分析结果，必须包含以下字段：
      1. suggestion: 具体的健康建议，包括生活方式、饮食、运动等方面的建议
      2. riskLevel: 健康风险等级，必须是以下三个值之一："低"、"中"、"高"
      3. details: 详细分析，包括对异常项目的解读以及可能的健康隐患

      如果无法确定风险等级，请根据现有信息进行合理推断。
      请确保返回的是有效的JSON格式。
    `;

    console.log('[DeepSeek API] 构造的提示词长度:', prompt.length);

    // 调用DeepSeek API
    console.log('[DeepSeek API] 开始发送请求');
    const response = await axios.post(DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        { 
          role: 'system', 
          content: '你是一位专业的医学顾问，精通体检报告分析。请以专业、准确且易于理解的方式分析体检报告，并给出健康建议。请始终以JSON格式返回分析结果。' 
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3, // 降低温度使输出更加确定性
      response_format: { type: 'json_object' },
      max_tokens: 1500 // 扩大输出长度上限
    }, {
      headers: {
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 60000 // 60秒超时，给AI更多处理时间
    });

    console.log('[DeepSeek API] 响应状态码:', response.status);

    // 解析API返回结果
    const aiResponse = response.data.choices[0].message.content;
    console.log('[DeepSeek API] AI原始返回内容摘要:', aiResponse.substring(0, 200) + '...');

    let aiResult;
    try {
      // 尝试解析JSON格式结果
      aiResult = JSON.parse(aiResponse);
      console.log('[DeepSeek API] AI返回JSON解析成功');
    } catch (e) {
      // 如果无法解析，尝试从文本中提取JSON部分
      console.error('[DeepSeek API] 解析AI返回结果JSON失败，尝试提取JSON部分:', e);
      const jsonMatch = aiResponse.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        try {
          aiResult = JSON.parse(jsonMatch[0]);
          console.log('[DeepSeek API] 从文本中提取JSON成功');
        } catch (e2) {
          console.error('[DeepSeek API] 二次解析仍然失败:', e2);
          // 如果仍然解析失败，构造默认结构
          aiResult = {
            suggestion: '无法解析AI分析结果，请重试。原始内容: ' + aiResponse.substring(0, 100) + '...',
            riskLevel: '未知',
            details: aiResponse.substring(0, 800) // 保留部分原始返回作为详情
          };
        }
      } else {
        console.error('[DeepSeek API] 无法从文本中提取JSON');
        aiResult = {
          suggestion: '无法解析AI分析结果，请重试',
          riskLevel: '未知',
          details: aiResponse.substring(0, 800) // 保留部分原始返回作为详情
        };
      }
    }

    // 确保所有字段都存在
    if (!aiResult.suggestion) aiResult.suggestion = '未能获取健康建议';
    if (!aiResult.riskLevel) aiResult.riskLevel = '未知';
    if (!aiResult.details) aiResult.details = '未能获取详细分析';

    // 限制过长的内容
    if (aiResult.suggestion.length > 1000) {
      aiResult.suggestion = aiResult.suggestion.substring(0, 1000) + '...';
    }
    if (aiResult.details.length > 2000) {
      aiResult.details = aiResult.details.substring(0, 2000) + '...';
    }

    // 标准化风险等级
    if (aiResult.riskLevel.includes('低') || aiResult.riskLevel.toLowerCase().includes('low')) {
      aiResult.riskLevel = '低';
    } else if (aiResult.riskLevel.includes('中') || aiResult.riskLevel.toLowerCase().includes('medium')) {
      aiResult.riskLevel = '中';
    } else if (aiResult.riskLevel.includes('高') || aiResult.riskLevel.toLowerCase().includes('high')) {
      aiResult.riskLevel = '高';
    } else {
      aiResult.riskLevel = '未知';
    }

    return aiResult;
  } catch (err) {
    console.error('[DeepSeek API] 调用失败，详细错误:', err);
    if (err.response) {
      console.error('[DeepSeek API] 错误响应状态:', err.response.status);
      console.error('[DeepSeek API] 错误响应数据:', JSON.stringify(err.response.data));
    }
    
    // 返回默认错误结果
    return {
      suggestion: 'AI分析服务暂时不可用，请稍后重试',
      riskLevel: '未知',
      details: '调用AI分析服务失败: ' + (err.message || '未知错误')
    }
  }
} 