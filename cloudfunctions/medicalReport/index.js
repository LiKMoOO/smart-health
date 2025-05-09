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
  
  // 注入用户ID
  if (!params.userId) {
    params.userId = wxContext.OPENID
  }
  
  switch (action) {
    case 'uploadReport':
      return await uploadReport.main(params, wxContext)
    case 'getReportList':
      return await getReportList.main(params, wxContext)
    case 'getReportDetail':
      return await getReportDetail.main(params, wxContext)
    case 'analyzeReportByAI':
      return await analyzeReportByAI.main(params, wxContext)
    case 'ocrReport':
      return await ocrReport.main(params, wxContext)
    default:
      return { code: 404, msg: '未知操作' }
  }
} 