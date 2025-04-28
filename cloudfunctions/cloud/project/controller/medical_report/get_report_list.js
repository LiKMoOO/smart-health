/**
 * 获取体检报告列表控制器
 * 
 * 功能说明：
 * 该控制器用于获取当前用户的所有体检报告列表，支持分页查询
 * 
 * 业务流程：
 * 1. 验证请求参数
 * 2. 根据用户ID查询该用户的体检报告列表
 * 3. 按照报告日期倒序排列（最新的报告排在前面）
 * 4. 返回报告列表数据
 * 
 * API接口：
 * - 请求参数：userId(用户ID)、page(页码)、size(每页条数)
 * - 返回结果：包含报告ID、医院名称、体检日期、报告类型等信息的数组
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
 * 
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID，必填，用于查询指定用户的报告
 * @param {Number} params.page - 分页页码，可选，默认为1
 * @param {Number} params.size - 每页条数，可选，默认为10
 * 
 * @returns {Object} 返回结果
 * @returns {Number} result.code - 状态码，0表示成功，其他表示失败
 * @returns {String} result.msg - 状态描述
 * @returns {Array} result.data - 报告列表数组
 * @returns {String} result.data[].\_id - 报告唯一标识
 * @returns {String} result.data[].userId - 用户ID
 * @returns {String} result.data[].reportDate - 体检日期
 * @returns {String} result.data[].hospital - 医院名称
 * @returns {String} result.data[].reportType - 报告类型
 * @returns {String} result.data[].summary - 报告摘要
 * @returns {Number} result.data[].createTime - 创建时间戳
 */
exports.main = async (params) => {
  try {
    // 参数校验 - 确保必要参数存在
    if (!params.userId) {
      return { code: 1001, msg: '用户ID不能为空' }
    }

    // 提取分页参数，设置默认值
    // const page = params.page || 1
    // const size = params.size || 10
    
    /**
     * TODO: 实际业务中应当从数据库查询
     * 示例查询代码:
     * const total = await db.collection(reportCollection)
     *   .where({ userId: params.userId })
     *   .count()
     *
     * const list = await db.collection(reportCollection)
     *   .where({ userId: params.userId })
     *   .orderBy('createTime', 'desc')
     *   .skip((page - 1) * size)
     *   .limit(size)
     *   .get()
     */

    // 对于临时测试，返回虚拟数据
    // 实际开发中，这里应该替换为真实的数据库查询
    return {
      code: 0,
      msg: '获取成功',
      data: [
        {
          _id: 'report1',
          userId: params.userId,
          reportDate: '2025-04-10',
          hospital: '市第一医院',
          reportType: '年度体检',
          summary: '整体健康状况良好',
          createTime: new Date().getTime() - 10*24*60*60*1000
        },
        {
          _id: 'report2',
          userId: params.userId,
          reportDate: '2025-03-15',
          hospital: '健康体检中心',
          reportType: '入职体检',
          summary: '未发现异常项目',
          createTime: new Date().getTime() - 30*24*60*60*1000
        }
      ]
    }
  } catch (err) {
    // 错误处理 - 捕获并记录错误，返回友好提示
    console.error('获取体检报告列表失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
} 