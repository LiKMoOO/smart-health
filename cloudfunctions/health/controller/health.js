/**
 * 健康管理控制器
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 初始化数据库
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 集合名称
const HEALTH_PROFILE_COLLECTION = 'health_profiles';
const HEALTH_METRICS_COLLECTION = 'health_metrics';
const HEALTH_REMINDERS_COLLECTION = 'health_reminders';

/**
 * 获取健康首页数据
 * 包括：用户健康档案、最近健康指标记录、用药提醒
 */
async function getHealthIndex(params) {
  const { userId, page = 1, size = 10 } = params;

  // 确保userId有值
  if (!userId) {
    console.error('userId为空，无法查询健康数据');
    return {
      code: 400,
      msg: '无效的用户ID'
    };
  }

  try {
    console.log('开始获取健康首页数据，userId:', userId);

    // 1. 获取用户健康档案
    const profileRes = await db.collection(HEALTH_PROFILE_COLLECTION)
      .where({
        userId: userId
      })
      .limit(1)
      .get();

    console.log('健康档案查询结果:', profileRes);

    let profile = null;
    if (profileRes.data && profileRes.data.length > 0) {
      profile = profileRes.data[0];
    }

    // 2. 获取最近健康指标记录
    const metricsRes = await db.collection(HEALTH_METRICS_COLLECTION)
      .where({
        userId: userId
      })
      .orderBy('recordTime', 'desc')
      .limit(size)
      .skip((page - 1) * size)
      .get();

    console.log('健康指标查询结果:', metricsRes);

    // 3. 获取用药提醒
    const currentTime = new Date().getTime();
    const remindersRes = await db.collection(HEALTH_REMINDERS_COLLECTION)
      .where({
        userId: userId,
        nextReminder: _.gte(currentTime)
      })
      .orderBy('nextReminder', 'asc')
      .limit(5)
      .get();

    console.log('用药提醒查询结果:', remindersRes);

    // 处理健康指标，标记异常项
    const metrics = metricsRes.data.map(metric => {
      let isAbnormal = false;
      
      switch (metric.type) {
        case 'blood_pressure':
          if (metric.value && (metric.value.systolic > 140 || metric.value.diastolic > 90)) {
            isAbnormal = true;
          }
          break;
        case 'blood_sugar':
          if (metric.value > 7.8) {
            isAbnormal = true;
          }
          break;
        case 'heart_rate':
          if (metric.value > 100 || metric.value < 60) {
            isAbnormal = true;
          }
          break;
      }
      
      return {
        ...metric,
        isAbnormal
      };
    });

    return {
      code: 0,
      data: {
        profile,
        metrics,
        reminders: remindersRes.data
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('获取健康首页数据失败：', err);
    throw new Error('获取健康首页数据失败');
  }
}

/**
 * 获取健康指标数据（分页）
 */
async function getHealthMetrics(params) {
  const { userId, page = 1, size = 10, type = null } = params;

  // 确保userId有值
  if (!userId) {
    console.error('userId为空，无法查询健康指标数据');
    return {
      code: 400,
      msg: '无效的用户ID'
    };
  }

  try {
    // 查询条件
    const query = { userId };
    if (type) {
      query.type = type;
    }

    // 获取总数
    const countResult = await db.collection(HEALTH_METRICS_COLLECTION)
      .where(query)
      .count();

    // 获取指标数据
    let metricsQuery = db.collection(HEALTH_METRICS_COLLECTION)
      .where(query)
      .orderBy('recordTime', 'desc')
      .skip((page - 1) * size)
      .limit(size);

    const metricsRes = await metricsQuery.get();

    // 处理健康指标，标记异常项
    const metrics = metricsRes.data.map(metric => {
      let isAbnormal = false;
      
      switch (metric.type) {
        case 'blood_pressure':
          if (metric.value && (metric.value.systolic > 140 || metric.value.diastolic > 90)) {
            isAbnormal = true;
          }
          break;
        case 'blood_sugar':
          if (metric.value > 7.8) {
            isAbnormal = true;
          }
          break;
        case 'heart_rate':
          if (metric.value > 100 || metric.value < 60) {
            isAbnormal = true;
          }
          break;
      }
      
      return {
        ...metric,
        isAbnormal
      };
    });

    return {
      code: 0,
      data: {
        list: metrics,
        total: countResult.total,
        page: page,
        size: size
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('获取健康指标数据失败：', err);
    throw new Error('获取健康指标数据失败');
  }
}

/**
 * 更新健康数据
 */
async function updateHealthData(params) {
  const { userId, dataType, data } = params;

  // 确保userId有值
  if (!userId) {
    console.error('userId为空，无法更新健康数据');
    return {
      code: 400,
      msg: '无效的用户ID'
    };
  }

  if (!dataType || !data) {
    return {
      code: 400,
      msg: '参数错误'
    };
  }

  try {
    let result = null;

    switch (dataType) {
      case 'profile':
        // 更新健康档案
        result = await updateHealthProfile(userId, data);
        break;
      case 'metrics':
        // 添加健康指标记录
        result = await addHealthMetric(userId, data);
        break;
      case 'reminder':
        // 添加或更新用药提醒
        result = await updateMedicationReminder(userId, data);
        break;
      default:
        return {
          code: 400,
          msg: '不支持的数据类型'
        };
    }

    return {
      code: 0,
      data: result,
      msg: '更新成功'
    };
  } catch (err) {
    console.error('更新健康数据失败：', err);
    throw new Error('更新健康数据失败');
  }
}

/**
 * 更新健康档案
 */
async function updateHealthProfile(userId, profileData) {
  // 检查是否已存在档案
  const profileRes = await db.collection(HEALTH_PROFILE_COLLECTION)
    .where({
      userId: userId
    })
    .get();

  // 处理基本信息
  let basicInfoData = profileData.basicInfo || {};
  if (typeof basicInfoData === 'string') {
    try {
      basicInfoData = JSON.parse(basicInfoData);
    } catch (e) {
      console.error('解析基本信息失败:', e);
      basicInfoData = {};
    }
  }

  const updateData = {
    ...profileData,
    HEALTH_PROFILE_BASIC: basicInfoData,
    updateTime: new Date().getTime()
  };

  if (profileRes.data && profileRes.data.length > 0) {
    // 更新现有档案
    await db.collection(HEALTH_PROFILE_COLLECTION)
      .doc(profileRes.data[0]._id)
      .update({
        data: updateData
      });
    
    return { ...profileRes.data[0], ...updateData };
  } else {
    // 创建新档案
    const newProfileData = {
      userId,
      ...updateData,
      createTime: new Date().getTime()
    };
    
    const addRes = await db.collection(HEALTH_PROFILE_COLLECTION)
      .add({
        data: newProfileData
      });
    
    return { _id: addRes._id, ...newProfileData };
  }
}

/**
 * 添加健康指标记录
 */
async function addHealthMetric(userId, metricData) {
  // 添加记录时间
  const recordTime = metricData.recordTime || new Date().getTime();
  
  const newMetricData = {
    userId,
    ...metricData,
    recordTime,
    createTime: new Date().getTime()
  };
  
  const addRes = await db.collection(HEALTH_METRICS_COLLECTION)
    .add({
      data: newMetricData
    });
  
  return { _id: addRes._id, ...newMetricData };
}

/**
 * 添加或更新用药提醒
 */
async function updateMedicationReminder(userId, reminderData) {
  const { _id } = reminderData;
  
  if (_id) {
    // 更新现有提醒
    await db.collection(HEALTH_REMINDERS_COLLECTION)
      .doc(_id)
      .update({
        data: {
          ...reminderData,
          updateTime: new Date().getTime()
        }
      });
    
    return { ...reminderData };
  } else {
    // 创建新提醒
    const newReminderData = {
      userId,
      ...reminderData,
      createTime: new Date().getTime(),
      updateTime: new Date().getTime()
    };
    
    const addRes = await db.collection(HEALTH_REMINDERS_COLLECTION)
      .add({
        data: newReminderData
      });
    
    return { _id: addRes._id, ...newReminderData };
  }
}

// 导出模块
module.exports = {
  getHealthIndex,
  getHealthMetrics,
  updateHealthData
}; 