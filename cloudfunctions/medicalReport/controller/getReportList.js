/**
 * 获取体检报告列表
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'
const MAX_LIMIT = 100

/**
 * 获取体检报告列表
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {Number} params.page - 分页页码
 * @param {Number} params.size - 每页条数
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  try {
    // 参数校验
    if (!params.userId) {
      return { code: 1001, msg: '用户ID不能为空' }
    }

    // 分页参数
    const page = params.page || 1
    const size = params.size || 10
    const skip = (page - 1) * size

    // 构建查询条件
    const where = { userId: params.userId }

    // 查询总数
    const countResult = await db.collection(reportCollection).where(where).count()
    const total = countResult.total

    // 查询数据
    const result = await db.collection(reportCollection)
      .where(where)
      .orderBy('reportDate', 'desc')
      .skip(skip)
      .limit(size)
      .get()

    return {
      code: 0,
      msg: '获取成功',
      data: result.data,
      page,
      size,
      total
    }
  } catch (err) {
    console.error('获取体检报告列表失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
} 