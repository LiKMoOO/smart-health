/**
 * 健康管理API测试脚本
 * 用于测试健康管理云函数的API接口
 */

// 模拟调用云函数入口
const healthFunction = require('./index');

// 模拟微信环境上下文
const mockWXContext = {
  OPENID: 'oU8vA62GI1e4iVrDxZQNrjI7-ypc' // 测试用户ID
};

// 手动注入OPENID的云函数调用
async function callWithMockOpenId(route, params = {}) {
  return await healthFunction.main({
    route,
    params
  }, {
    // 手动构造context对象并注入wxContext
    wxContext: mockWXContext
  });
}

// 测试用例：获取健康首页数据
async function testGetHealthIndex() {
  console.log('=====================================');
  console.log('测试用例1: 获取健康首页数据');
  console.log('=====================================');
  
  const result = await callWithMockOpenId('health/gethealthindex', {
    page: 1,
    size: 10
  });
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：获取健康指标数据(全部)
async function testGetAllHealthMetrics() {
  console.log('=====================================');
  console.log('测试用例2: 获取所有健康指标数据');
  console.log('=====================================');
  
  const result = await callWithMockOpenId('health/gethealthmetrics', {
    page: 1,
    size: 10
  });
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：获取血压指标数据
async function testGetBloodPressureMetrics() {
  console.log('=====================================');
  console.log('测试用例3: 获取血压指标数据');
  console.log('=====================================');
  
  const result = await callWithMockOpenId('health/gethealthmetrics', {
    page: 1,
    size: 10,
    type: 'blood_pressure'
  });
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：添加血压记录
async function testAddBloodPressureRecord() {
  console.log('=====================================');
  console.log('测试用例4: 添加血压记录');
  console.log('=====================================');
  
  const result = await callWithMockOpenId('health/updatehealthdata', {
    dataType: 'metrics',
    data: {
      type: 'blood_pressure',
      value: { systolic: 118, diastolic: 78 },
      recordTime: Date.now()
    }
  });
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：添加用药提醒
async function testAddMedicationReminder() {
  console.log('=====================================');
  console.log('测试用例5: 添加用药提醒');
  console.log('=====================================');
  
  const result = await callWithMockOpenId('health/updatehealthdata', {
    dataType: 'reminder',
    data: {
      medicationName: '布洛芬',
      dosage: '200mg',
      frequency: '需要时服用',
      nextReminder: Date.now() + 8 * 60 * 60 * 1000 // 8小时后提醒
    }
  });
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：更新健康档案
async function testUpdateHealthProfile() {
  console.log('=====================================');
  console.log('测试用例6: 更新健康档案');
  console.log('=====================================');
  
  const result = await callWithMockOpenId('health/updatehealthdata', {
    dataType: 'profile',
    data: {
      basicInfo: {
        height: 176, // 更新身高
        weight: 67,  // 更新体重
        gender: '男',
        age: 36,     // 更新年龄
        bloodType: 'A型'
      }
    }
  });
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 运行测试
async function runTests() {
  try {
    await testGetHealthIndex();
    await testGetAllHealthMetrics();
    await testGetBloodPressureMetrics();
    await testAddBloodPressureRecord();
    await testAddMedicationReminder();
    await testUpdateHealthProfile();
    
    console.log('=====================================');
    console.log('所有测试完成');
    console.log('=====================================');
  } catch (err) {
    console.error('测试出错:', err);
  }
}

// 执行测试
runTests(); 