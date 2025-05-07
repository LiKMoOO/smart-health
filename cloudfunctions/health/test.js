/**
 * 健康管理云函数测试脚本
 * 用于模拟前端通过wx.cloud.callFunction直接调用health云函数
 */

// 模拟调用云函数入口
const healthFunction = require('./index');

// 默认测试用户ID
const TEST_USER_ID = 'oU8vA62GI1e4iVrDxZQNrjI7-ypc';

// 测试用例：获取健康首页数据
async function testGetHealthIndex() {
  console.log('=====================================');
  console.log('测试用例1: 获取健康首页数据');
  console.log('=====================================');
  
  const result = await healthFunction.main(
    {
      route: 'health/gethealthindex',
      params: {
        page: 1,
        size: 10,
        userId: TEST_USER_ID
      }
    },
    {}
  );
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：获取健康指标数据
async function testGetHealthMetrics() {
  console.log('=====================================');
  console.log('测试用例2: 获取健康指标数据');
  console.log('=====================================');
  
  const result = await healthFunction.main(
    {
      route: 'health/gethealthmetrics',
      params: {
        page: 1,
        size: 10,
        type: null,
        userId: TEST_USER_ID
      }
    },
    {}
  );
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：未提供route参数
async function testNoRoute() {
  console.log('=====================================');
  console.log('测试用例3: 未提供route参数');
  console.log('=====================================');
  
  const result = await healthFunction.main(
    {
      params: {
        page: 1,
        size: 10,
        userId: TEST_USER_ID
      }
    },
    {}
  );
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 测试用例：更新健康数据
async function testUpdateHealthData() {
  console.log('=====================================');
  console.log('测试用例4: 更新健康数据');
  console.log('=====================================');
  
  const result = await healthFunction.main(
    {
      route: 'health/updatehealthdata',
      params: {
        dataType: 'profile',
        userId: TEST_USER_ID,
        data: {
          basicInfo: {
            height: 175,
            weight: 68,
            gender: '男',
            age: 35
          }
        }
      }
    },
    {}
  );
  
  console.log('返回结果:', JSON.stringify(result, null, 2));
  return result;
}

// 运行测试
async function runTests() {
  try {
    await testGetHealthIndex();
    await testGetHealthMetrics();
    await testNoRoute();
    await testUpdateHealthData();
    
    console.log('=====================================');
    console.log('所有测试完成');
    console.log('=====================================');
  } catch (err) {
    console.error('测试出错:', err);
  }
}

// 执行测试
runTests(); 