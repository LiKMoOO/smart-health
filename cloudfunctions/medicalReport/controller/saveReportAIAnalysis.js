/**
 * 保存体检报告AI分析结果
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const reportCollection = 'medical_report'

/**
 * 保存体检报告AI分析结果
 * @param {Object} params - 请求参数
 * @param {String} params.reportId - 报告ID
 * @param {String} params.userId - 用户ID
 * @param {String} params.aiAnalysis - AI分析结果
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  console.log('[保存AI分析] 开始执行，参数:', JSON.stringify(params));
  console.log('[保存AI分析] 微信上下文:', JSON.stringify(wxContext));
  
  try {
    // 参数校验
    if (!params.reportId) {
      console.error('[保存AI分析] 报告ID不能为空');
      return { code: 1001, msg: '报告ID不能为空' };
    }
    
    if (!params.aiAnalysis) {
      console.error('[保存AI分析] AI分析结果不能为空');
      return { code: 1002, msg: 'AI分析结果不能为空' };
    }
    
    const userId = params.userId || wxContext.OPENID;
    if (!userId) {
      console.error('[保存AI分析] 用户ID不能为空');
      return { code: 1003, msg: '用户ID不能为空' };
    }
    
    // 先查询报告是否存在
    try {
      const reportResult = await db.collection(reportCollection).doc(params.reportId).get();
      
      if (!reportResult || !reportResult.data) {
        console.error('[保存AI分析] 报告不存在');
        return { code: 1004, msg: '报告不存在' };
      }
      
      // 权限校验：是否是用户自己的报告
      if (reportResult.data.userId !== userId) {
        console.error('[保存AI分析] 无权访问该报告');
        return { code: 1005, msg: '无权访问该报告' };
      }
      
      // 更新报告的AI分析结果
      await db.collection(reportCollection).doc(params.reportId).update({
        data: {
          aiAnalysis: params.aiAnalysis,
          aiAnalysisTime: new Date()
        }
      });
      
      console.log('[保存AI分析] 更新成功');
      return {
        code: 0,
        msg: '保存成功'
      };
    } catch (err) {
      console.error('[保存AI分析] 查询或更新报告失败:', err);
      return {
        code: 1006,
        msg: '保存失败: ' + (err.message || '未知错误')
      };
    }
  } catch (err) {
    console.error('[保存AI分析] 处理异常:', err);
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    };
  }
}; 