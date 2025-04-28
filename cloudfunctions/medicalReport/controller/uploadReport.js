/**
 * 上传体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'

/**
 * 上传体检报告
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {String} params.reportDate - 体检日期
 * @param {String} params.hospital - 医院名称
 * @param {String} params.reportType - 报告类型
 * @param {Array} params.reportItems - 报告项目数组
 * @param {String} params.reportFileId - 报告文件云存储ID
 * @param {String} params.summary - 报告摘要
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  try {
    // 参数校验
    if (!params.userId) {
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.reportDate) {
      return { code: 1002, msg: '体检日期不能为空' }
    }
    if (!params.hospital) {
      return { code: 1003, msg: '医院名称不能为空' }
    }
    if (!params.reportType) {
      return { code: 1004, msg: '报告类型不能为空' }
    }
    if (!params.reportFileId) {
      return { code: 1005, msg: '报告文件不能为空' }
    }

    // 构造数据
    const reportData = {
      userId: params.userId,
      reportDate: params.reportDate,
      hospital: params.hospital,
      reportType: params.reportType,
      reportItems: params.reportItems || [],
      reportFileId: params.reportFileId,
      summary: params.summary || '',
      createTime: db.serverDate()
    }

    // 写入数据库
    const result = await db.collection(reportCollection).add({
      data: reportData
    })

    return {
      code: 0,
      msg: '上传成功',
      data: {
        reportId: result._id
      }
    }
  } catch (err) {
    console.error('上传体检报告失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
} 