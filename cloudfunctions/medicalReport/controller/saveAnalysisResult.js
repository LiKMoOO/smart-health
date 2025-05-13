/**
 * 保存AI分析结果
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'

/**
 * 保存AI分析结果
 * @param {Object} params - 请求参数
 * @param {String} params.reportId - 报告ID
 * @param {Object} params.aiAnalysis - AI分析结果
 * @param {Number} params.aiAnalysisTime - 分析时间
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  try {
    console.log('[保存分析] 开始执行，参数:', JSON.stringify(params));
    
    // 参数校验
    if (!params.reportId) {
      return { code: 1001, msg: '报告ID不能为空' };
    }
    
    if (!params.aiAnalysis) {
      return { code: 1002, msg: 'AI分析结果不能为空' };
    }
    
    // 确认用户身份
    const userId = params.userId || wxContext.OPENID;
    
    if (!userId) {
      return { code: 1003, msg: '用户ID不能为空' };
    }
    
    // 先查询报告是否存在
    try {
      const reportResult = await db.collection(reportCollection).doc(params.reportId).get();
      
      // 检查报告存在并且属于该用户
      if (!reportResult.data) {
        return { code: 1004, msg: '报告不存在' };
      }
      
      if (reportResult.data.userId !== userId) {
        return { code: 1005, msg: '无权访问该报告' };
      }
      
      // 处理分析结果存储
      console.log('[保存分析] 分析结果格式:', typeof params.aiAnalysis);
      console.log('[保存分析] 分析结果内容示例:', typeof params.aiAnalysis === 'string' ? 
                  params.aiAnalysis.substring(0, 50) + '...' : 'not string');
      
      let analysisToSave = params.aiAnalysis;
      
      // 确保保存的是字符串格式
      if (typeof analysisToSave !== 'string') {
        console.log('[保存分析] 转换对象为JSON字符串');
        analysisToSave = JSON.stringify(analysisToSave);
      }
      
      // 检查是否已经是有效的JSON
      try {
        // 尝试解析后再重新转换，保证它是有效的JSON
        const testParse = JSON.parse(analysisToSave);
        if (typeof testParse === 'object') {
          console.log('[保存分析] 验证JSON格式有效');
        }
      } catch (jsonError) {
        // 不是有效的JSON，可能是纯文本，转换为标准格式
        console.log('[保存分析] 不是有效的JSON格式，转换为标准格式');
        const standardObj = {
          suggestion: '保持均衡饮食，适量运动，定期体检，及时就医。',
          riskLevel: 'low',
          details: analysisToSave // 使用原文本作为details
        };
        analysisToSave = JSON.stringify(standardObj);
      }
      
      // 更新报告的AI分析结果
      await db.collection(reportCollection).doc(params.reportId).update({
        data: {
          aiAnalysis: analysisToSave,
          aiAnalysisTime: params.aiAnalysisTime || new Date().getTime()
        }
      });
      
      console.log('[保存分析] 分析结果保存成功');
      return { code: 0, msg: '保存成功' };
      
    } catch (err) {
      console.error('[保存分析] 查询或更新报告失败:', err);
      return { code: 1006, msg: '保存分析结果失败: ' + err.message };
    }
    
  } catch (err) {
    console.error('[保存分析] 处理过程中发生异常:', err);
    return { code: 500, msg: '系统错误，请稍后重试' };
  }
}; 