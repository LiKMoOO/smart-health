/**
 * 健康管理测试数据初始化脚本
 * 用于向数据库中插入测试数据
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 测试用户ID
const TEST_USER_ID = 'oU8vA62GI1e4iVrDxZQNrjI7-ypc';

// 清空并重新创建健康数据集合
async function initCollections() {
  console.log('开始初始化健康管理集合...');
  
  try {
    // 创建健康档案测试数据
    await createHealthProfile();
    // 创建健康指标测试数据
    await createHealthMetrics();
    // 创建用药提醒测试数据
    await createHealthReminders();
    
    console.log('健康管理集合初始化完成！');
  } catch (err) {
    console.error('初始化集合失败:', err);
  }
}

// 创建健康档案测试数据
async function createHealthProfile() {
  try {
    // 先查询是否已存在该用户的健康档案
    const profileResult = await db.collection('health_profiles').where({
      userId: TEST_USER_ID
    }).get();
    
    // 如果已存在档案，则更新
    if (profileResult.data.length > 0) {
      console.log('更新已存在的健康档案...');
      await db.collection('health_profiles').where({
        userId: TEST_USER_ID
      }).update({
        data: {
          basicInfo: {
            height: 175,
            weight: 68,
            gender: '男',
            age: 35,
            bloodType: 'A型'
          },
          healthHistory: {
            allergies: ['花粉', '海鲜'],
            surgeries: ['阑尾切除(2019年)'],
            chronicDiseases: ['高血压']
          },
          lifestyleInfo: {
            smokingStatus: '不吸烟',
            drinkingStatus: '偶尔饮酒',
            exerciseFrequency: '每周3-4次'
          },
          emergencyContact: {
            name: '张三',
            relationship: '家人',
            phone: '13800138000'
          },
          updateTime: Date.now()
        }
      });
    } else {
      // 不存在则新建
      console.log('创建新的健康档案...');
      await db.collection('health_profiles').add({
        data: {
          userId: TEST_USER_ID,
          basicInfo: {
            height: 175,
            weight: 68,
            gender: '男',
            age: 35,
            bloodType: 'A型'
          },
          healthHistory: {
            allergies: ['花粉', '海鲜'],
            surgeries: ['阑尾切除(2019年)'],
            chronicDiseases: ['高血压']
          },
          lifestyleInfo: {
            smokingStatus: '不吸烟',
            drinkingStatus: '偶尔饮酒',
            exerciseFrequency: '每周3-4次'
          },
          emergencyContact: {
            name: '张三',
            relationship: '家人',
            phone: '13800138000'
          },
          createTime: Date.now(),
          updateTime: Date.now()
        }
      });
    }
    console.log('健康档案数据创建成功');
  } catch (err) {
    console.error('创建健康档案失败:', err);
    throw err;
  }
}

// 创建健康指标测试数据
async function createHealthMetrics() {
  try {
    // 清空该用户的所有健康指标数据
    const deleteResult = await db.collection('health_metrics').where({
      userId: TEST_USER_ID
    }).remove();
    console.log('已清空原有健康指标数据:', deleteResult);
    
    // 添加血压测试数据
    const bloodPressureData = [
      {
        userId: TEST_USER_ID,
        type: 'blood_pressure',
        value: { systolic: 120, diastolic: 80 },
        isAbnormal: false,
        recordTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 一周前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'blood_pressure',
        value: { systolic: 135, diastolic: 85 },
        isAbnormal: true,
        abnormalReason: '收缩压偏高',
        recordTime: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'blood_pressure',
        value: { systolic: 125, diastolic: 82 },
        isAbnormal: false,
        recordTime: Date.now() - 24 * 60 * 60 * 1000, // 1天前
        createTime: Date.now()
      }
    ];
    
    // 添加血糖测试数据
    const bloodSugarData = [
      {
        userId: TEST_USER_ID,
        type: 'blood_sugar',
        value: 5.2,
        isAbnormal: false,
        recordTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 一周前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'blood_sugar',
        value: 7.1,
        isAbnormal: true,
        abnormalReason: '血糖偏高',
        recordTime: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'blood_sugar',
        value: 5.6,
        isAbnormal: false,
        recordTime: Date.now() - 24 * 60 * 60 * 1000, // 1天前
        createTime: Date.now()
      }
    ];
    
    // 添加心率测试数据
    const heartRateData = [
      {
        userId: TEST_USER_ID,
        type: 'heart_rate',
        value: 75,
        isAbnormal: false,
        recordTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 一周前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'heart_rate',
        value: 92,
        isAbnormal: true,
        abnormalReason: '心率偏快',
        recordTime: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3天前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'heart_rate',
        value: 78,
        isAbnormal: false,
        recordTime: Date.now() - 24 * 60 * 60 * 1000, // 1天前
        createTime: Date.now()
      }
    ];
    
    // 添加体重测试数据
    const weightData = [
      {
        userId: TEST_USER_ID,
        type: 'weight',
        value: 68.5,
        isAbnormal: false,
        recordTime: Date.now() - 14 * 24 * 60 * 60 * 1000, // 两周前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'weight',
        value: 67.8,
        isAbnormal: false,
        recordTime: Date.now() - 7 * 24 * 60 * 60 * 1000, // 一周前
        createTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        type: 'weight',
        value: 67.2,
        isAbnormal: false,
        recordTime: Date.now() - 24 * 60 * 60 * 1000, // 1天前
        createTime: Date.now()
      }
    ];
    
    // 合并所有测试数据
    const allMetricsData = [
      ...bloodPressureData,
      ...bloodSugarData,
      ...heartRateData,
      ...weightData
    ];
    
    // 批量添加所有健康指标数据
    for (const data of allMetricsData) {
      await db.collection('health_metrics').add({
        data
      });
    }
    
    console.log('健康指标数据创建成功，共添加记录:', allMetricsData.length);
  } catch (err) {
    console.error('创建健康指标数据失败:', err);
    throw err;
  }
}

// 创建用药提醒测试数据
async function createHealthReminders() {
  try {
    // 清空该用户的所有用药提醒数据
    const deleteResult = await db.collection('health_reminders').where({
      userId: TEST_USER_ID
    }).remove();
    console.log('已清空原有用药提醒数据:', deleteResult);
    
    // 添加用药提醒测试数据
    const reminderData = [
      {
        userId: TEST_USER_ID,
        medicationName: '阿司匹林',
        dosage: '100mg',
        frequency: '每日一次',
        startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30天前开始
        endDate: Date.now() + 60 * 24 * 60 * 60 * 1000, // 60天后结束
        nextReminder: Date.now() + 12 * 60 * 60 * 1000, // 12小时后提醒
        createTime: Date.now(),
        updateTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        medicationName: '降压药',
        dosage: '5mg',
        frequency: '每日两次',
        startDate: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15天前开始
        endDate: Date.now() + 90 * 24 * 60 * 60 * 1000, // 90天后结束
        nextReminder: Date.now() + 4 * 60 * 60 * 1000, // 4小时后提醒
        createTime: Date.now(),
        updateTime: Date.now()
      },
      {
        userId: TEST_USER_ID,
        medicationName: '维生素C',
        dosage: '1000mg',
        frequency: '每日一次',
        startDate: Date.now() - 60 * 24 * 60 * 60 * 1000, // 60天前开始
        endDate: null, // 长期服用
        nextReminder: Date.now() + 20 * 60 * 60 * 1000, // 20小时后提醒
        createTime: Date.now(),
        updateTime: Date.now()
      }
    ];
    
    // 批量添加所有用药提醒数据
    for (const data of reminderData) {
      await db.collection('health_reminders').add({
        data
      });
    }
    
    console.log('用药提醒数据创建成功，共添加记录:', reminderData.length);
  } catch (err) {
    console.error('创建用药提醒数据失败:', err);
    throw err;
  }
}

// 执行初始化
initCollections(); 