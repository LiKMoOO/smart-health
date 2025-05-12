/**
 * 健康管理云函数入口
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 引入控制器
const healthController = require('./controller/health');

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取微信上下文，优先使用测试脚本传入的模拟上下文
  const wxContext = context.wxContext || cloud.getWXContext();
  const openId = wxContext.OPENID; // 使用微信OPENID
  
  // 获取路由和参数
  const { route, params = {} } = event;
  
  // 打印请求信息，便于调试
  console.log('【Health Cloud Function】接收到请求:', {
    route: route,
    params: params,
    openId: openId
  });
  
  // 如果openId为空，尝试使用前端传入的userId
  if (!openId && params.userId) {
    console.log('【Health Cloud Function】使用前端传入的userId:', params.userId);
    params.userId = params.userId;
  } else {
    // 使用openId作为userId，确保数据一致性
    params.userId = openId;
  }
  
  console.log('【Health Cloud Function】处理请求，userId:', params.userId);
  
  // 判断是否有有效的userId
  if (!params.userId) {
    console.log('userId为空，无法查询健康数据');
    return {
      code: 400,
      msg: '无效的用户ID'
    };
  }
  
  // 尝试从数据库获取用户信息
  try {
    // 根据路由调用对应的处理函数
    switch (route) {
      case 'health/gethealthindex':
        console.log('【Health Cloud Function】调用getHealthIndex');
        return await healthController.getHealthIndex(params);
        
      case 'health/gethealthmetrics':
        console.log('【Health Cloud Function】调用getHealthMetrics');
        return await healthController.getHealthMetrics(params);
        
      case 'health/updatehealthdata':
        console.log('【Health Cloud Function】调用updateHealthData');
        return await healthController.updateHealthData(params);

      // 新增 case 用于删除健康指标记录
      case 'health/deletehealthmetric':
        console.log('【Health Cloud Function】调用deleteHealthMetricRecord');
        // 确保将 userId (从 openId 或前端传入) 传递给控制器函数
        // params 中应该已经包含了 recordId (由前端调用时传入)
        params.userId = params.userId; // 确保 userId 被正确传递 (在入口处已处理 openId 到 params.userId 的赋值)
        return await healthController.deleteHealthMetricRecord(params);
      
      // 新增 case 用于获取健康日志记录
      case 'health/gethealthjournal':
        console.log('【Health Cloud Function】调用getHealthJournal');
        return await healthController.getHealthJournal(params);
        
      // 新增 case 用于获取健康分析数据
      case 'health/gethealthanalysis':
        console.log('【Health Cloud Function】调用getHealthAnalysis');
        return await healthController.getHealthAnalysis(params);
      
      // 添加对驼峰命名的支持
      case 'health/getHealthAnalysis':
        console.log('【Health Cloud Function】调用getHealthAnalysis');
        return await healthController.getHealthAnalysis(params);
        
      default:
        console.log('【Health Cloud Function】未找到对应接口:', route);
        return {
          code: 404,
          msg: '未找到对应的接口'
        };
    }
  } catch (err) {
    console.error('健康管理云函数错误:', err);
    return {
      code: 500,
      msg: '服务器错误',
      error: err.message
    };
  }
} 