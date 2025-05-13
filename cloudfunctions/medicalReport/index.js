/**
 * 体检报告管理云函数入口
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 引入配置
const config = require('./config/config')

// 引入子函数
const uploadReport = require('./controller/uploadReport')
const getReportList = require('./controller/getReportList')
const getReportDetail = require('./controller/getReportDetail')
const analyzeReportByAI = require('./controller/analyzeReportByAI')
const ocrReport = require('./controller/ocrReport')
const testAIConnection = require('./controller/testAIConnection')
const saveAnalysisResult = require('./controller/saveAnalysisResult')

/**
 * 包装函数执行，添加超时控制
 * @param {Function} func - 要执行的函数
 * @param {Object} params - 函数参数
 * @param {Object} wxContext - 微信上下文
 * @param {Number} timeout - 超时时间（毫秒）
 * @returns {Promise} - 函数执行结果或超时错误
 */
async function executeWithTimeout(func, params, wxContext, timeout = 10000) {
  let timer;
  
  // 创建一个超时Promise
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('函数执行超时'));
    }, timeout);
  });
  
  // 创建执行函数的Promise
  const executionPromise = func.main(params, wxContext);
  
  try {
    // 使用race，哪个先完成就返回哪个
    const result = await Promise.race([executionPromise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const { action, params } = event
  const wxContext = cloud.getWXContext()
  
  // 详细日志
  console.log('云函数入口 - 环境信息:', cloud.DYNAMIC_CURRENT_ENV)
  console.log('云函数入口 - 传入事件:', JSON.stringify(event))
  console.log('云函数入口 - 微信上下文:', JSON.stringify(wxContext))
  const startTime = Date.now()
  
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
        // AI分析使用特殊的超时处理
        try {
          console.log('执行AI分析，应用超时控制')
          result = await executeWithTimeout(analyzeReportByAI, actualParams, wxContext, 15000)
        } catch (timeoutErr) {
          console.error('AI分析执行超时:', timeoutErr)
          // 如果是超时，调用saveAnalysisResult保存备用分析结果
          const backupAnalysis = {
            suggestion: '保持均衡饮食，适量运动，定期体检，及时就医。',
            riskLevel: 'low',
            details: '体检报告分析系统当前繁忙，请稍后重试。'
          }
          
          try {
            await saveAnalysisResult.main({
              reportId: actualParams.reportId,
              aiAnalysis: JSON.stringify(backupAnalysis),
              aiAnalysisTime: new Date().getTime()
            }, wxContext)
            
            console.log('已保存备用分析结果')
          } catch (saveErr) {
            console.error('保存备用分析失败:', saveErr)
          }
          
          result = {
            code: 0,
            msg: '分析过程超时，已使用备用分析',
            data: { text: backupAnalysis }
          }
        }
        break
      case 'ocrReport':
        result = await ocrReport.main(actualParams, wxContext)
        break
      case 'testAIConnection':
        result = await testAIConnection.main()
        break
      case 'saveAnalysisResult':
        result = await saveAnalysisResult.main(actualParams, wxContext)
        break
      default:
        result = { code: 404, msg: '未知操作' }
    }
    
    const endTime = Date.now()
    const executionTime = endTime - startTime
    console.log(`云函数执行完成：${action}，耗时: ${executionTime}ms`)
    console.log('云函数执行结果:', result ? JSON.stringify(result).substring(0, 300) + '...' : 'null')
    return result
  } catch (error) {
    const endTime = Date.now()
    const executionTime = endTime - startTime
    console.error(`云函数执行出错：${action}，耗时: ${executionTime}ms，错误:`, error)
    return {
      code: 500,
      msg: '云函数执行出错：' + (error.message || '未知错误'),
      error: error.message || '未知错误'
    }
  }
} 