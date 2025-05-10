/**
 * 体检报告管理云函数入口
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 引入子函数
const uploadReport = require('./controller/uploadReport')
const getReportList = require('./controller/getReportList')
const getReportDetail = require('./controller/getReportDetail')
const analyzeReportByAI = require('./controller/analyzeReportByAI')
const ocrReport = require('./controller/ocrReport')

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()
  
  // 详细日志
  console.log('云函数入口 - 环境信息:', cloud.DYNAMIC_CURRENT_ENV)
  console.log('云函数入口 - 传入事件:', event)
  console.log('云函数入口 - 微信上下文:', wxContext)
  
  // 参数兼容性处理
  let actualParams = params || {}; // 确保params存在
  
  // 注入用户ID
  if (!actualParams.userId && wxContext.OPENID) {
    console.log('注入用户ID:', wxContext.OPENID)
    actualParams.userId = wxContext.OPENID
  } else if (!actualParams.userId) {
    console.warn('无法获取用户ID')
    return { code: 1001, msg: '用户ID不能为空' }
  }
  
  // 路由分发
  try {
    let result = null
    switch (action) {
      case 'uploadReport':
        result = await uploadReport.main(actualParams, wxContext)
        break
      case 'getReportList':
        result = await getReportList.main(actualParams, wxContext)
        break
      case 'getReportDetail':
        result = await getReportDetail.main(actualParams, wxContext)
        break
      case 'analyzeReportByAI':
        result = await analyzeReportByAI.main(actualParams, wxContext)
        break
      case 'ocrReport':
        result = await ocrReport.main(actualParams, wxContext)
        break
      default:
        result = { code: 404, msg: '未知操作' }
    }
    
    console.log('云函数执行结果:', result)
    return result
  } catch (error) {
    console.error('云函数执行出错:', error)
    return {
      code: 500,
      msg: '云函数执行出错',
      error: error.message || '未知错误'
    }
  }
} 