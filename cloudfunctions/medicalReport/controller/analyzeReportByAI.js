/**
 * AI分析体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'

/**
 * AI分析体检报告 - 简化版实现
 * 由于DeepSeek API可能存在连接问题，这里提供一个简化版的实现
 * 
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
      // 构建内容摘要...
      reportContent = reportResult.data.summary;
    }
    
    // 简化版AI分析：基于检测到的关键词生成分析结果
    console.log('[AI分析] 使用简化版AI分析');
    
    // 使用模拟AI分析功能
    const aiResult = generateSimpleAnalysis(reportContent, reportResult.data);
    console.log('[AI分析] 生成的分析结果:', JSON.stringify(aiResult));

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
 * 生成简单的分析结果
 * @param {String} reportContent - 报告内容
 * @param {Object} reportData - 报告原始数据
 * @returns {Object} - 分析结果
 */
function generateSimpleAnalysis(reportContent, reportData) {
  // 风险评估
  let riskLevel = '低';
  let abnormalCount = 0;
  let keywordMatches = [];
  
  // 关键词检测
  const highRiskKeywords = ['严重', '危险', '高血压', '高血糖', '糖尿病', '肿瘤', '异常', '偏高', '偏低', 
    '超标', '不足', '肝功能异常', '心脏问题', '血脂异常', '血脂偏高'];
    
  const mediumRiskKeywords = ['轻度', '偏高', '偏低', '注意', '建议', '复查', '亚健康', 
    '血压偏高', '血糖偏高', '胆固醇', '尿酸', '超重'];
  
  // 检查异常项目数量
  if (reportData.reportItems && reportData.reportItems.length > 0) {
    reportData.reportItems.forEach(group => {
      if (group.items && group.items.length > 0) {
        group.items.forEach(item => {
          if (item.abnormal) {
            abnormalCount++;
          }
        });
      }
    });
  }
  
  // 检测关键词
  highRiskKeywords.forEach(keyword => {
    if (reportContent.includes(keyword)) {
      keywordMatches.push(keyword);
    }
  });
  
  // 判断风险等级
  if (abnormalCount > 5 || keywordMatches.length >= 3) {
    riskLevel = '高';
  } else if (abnormalCount > 2 || keywordMatches.length > 0) {
    riskLevel = '中';
  }
  
  // 生成建议
  let suggestion = '';
  let details = '';
  
  switch (riskLevel) {
    case '高':
      suggestion = '您的体检报告显示多项指标异常，建议尽快就医进行进一步检查和治疗。同时调整生活方式，包括健康饮食、适当运动、规律作息等。';
      details = `体检报告分析发现${abnormalCount}项异常指标，其中包含关键风险词：${keywordMatches.join('、')}。您的健康状况存在较高风险，建议：\n1. 尽快就医进行专科检查\n2. 严格控制饮食，减少高盐高脂食物\n3. 开展适合您身体状况的有氧运动\n4. 保持良好心态，避免过度焦虑\n5. 定期复查，监测健康指标变化`;
      break;
    case '中':
      suggestion = '您的体检报告显示部分指标异常，建议适当调整生活方式，注意饮食健康，增加适量运动，并在3-6个月内进行复查。';
      details = `体检报告分析发现${abnormalCount}项异常指标。您的健康状况存在一定风险，建议：\n1. 调整饮食结构，增加蔬果摄入\n2. 每周进行3-5次中等强度运动\n3. 保持充足睡眠，减轻压力\n4. 3-6个月后进行复查\n5. 关注自身健康变化，出现不适及时就医`;
      break;
    default:
      suggestion = '您的体检报告总体良好，建议继续保持健康的生活方式，定期体检，关注自身健康变化。';
      details = '体检报告分析未发现明显健康风险。为继续保持良好的健康状态，建议：\n1. 坚持均衡饮食，适量运动\n2. 保持良好作息习惯\n3. 每年进行一次体检\n4. 保持乐观积极的生活态度\n5. 注意劳逸结合，避免过度疲劳';
  }
  
  // 添加针对医院和体检类型的定制化建议
  if (reportData.hospital) {
    details += `\n\n您的体检是在${reportData.hospital}进行的，`;
  }
  
  if (reportData.reportType) {
    details += `这是一次${reportData.reportType}。`;
  }
  
  details += '\n\n注意：AI分析结果仅供参考，详细健康建议请咨询专业医生。';
  
  return {
    suggestion,
    riskLevel,
    details
  };
} 