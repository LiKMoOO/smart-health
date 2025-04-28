/**
 * 获取体检报告详情
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'

/**
 * 获取体检报告详情
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {String} params.reportId - 报告ID
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

    // 查询详情
    const result = await db.collection(reportCollection).doc(params.reportId).get()
    
    // 判断是否存在
    if (!result.data) {
      return { code: 1003, msg: '报告不存在' }
    }
    
    // 判断是否有权限访问
    if (result.data.userId !== params.userId) {
      return { code: 1004, msg: '无权访问该报告' }
    }

    return {
      code: 0,
      msg: '获取成功',
      data: result.data
    }
  } catch (err) {
    console.error('获取体检报告详情失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
} 