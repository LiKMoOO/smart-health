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
      console.log('[保存分析] 检查现有分析结果格式');
      
      // 检查aiAnalysis是否为对象格式
      if (typeof params.aiAnalysis === 'object') {
        // 将对象转换为字符串格式，与现有数据保持一致
        console.log('[保存分析] 转换对象格式为字符串格式');
        let analysisText = '';
        
        // 如果有details字段，使用它的内容
        if (params.aiAnalysis.details) {
          analysisText = params.aiAnalysis.details;
        } else if (params.aiAnalysis.suggestion) {
          // 否则，使用suggestion和riskLevel构建内容
          const riskText = params.aiAnalysis.riskLevel === 'low' ? '低风险' : 
                        params.aiAnalysis.riskLevel === 'medium' ? '中风险' : '高风险';
          
          analysisText = `# 体检报告AI分析\n\n## 风险等级\n${riskText}\n\n## 健康建议\n${params.aiAnalysis.suggestion}`;
        }
        
        // 更新报告的AI分析结果
        await db.collection(reportCollection).doc(params.reportId).update({
          data: {
            aiAnalysis: analysisText,
            aiAnalysisTime: params.aiAnalysisTime || new Date().getTime()
          }
        });
      } else {
        // 如果已经是字符串，直接更新
        await db.collection(reportCollection).doc(params.reportId).update({
          data: {
            aiAnalysis: params.aiAnalysis,
            aiAnalysisTime: params.aiAnalysisTime || new Date().getTime()
          }
        });
      }
      
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