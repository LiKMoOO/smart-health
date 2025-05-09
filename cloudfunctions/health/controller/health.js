/**
 * 健康管理控制器
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;
const $ = db.command.aggregate;

// 数据库集合名称常量
const HEALTH_PROFILE_COLLECTION = 'health_profiles';
const HEALTH_METRICS_COLLECTION = 'health_metrics';
const HEALTH_REMINDERS_COLLECTION = 'health_reminders';

/**
 * 获取健康首页数据
 * 包括：用户健康档案、最近健康指标记录、用药提醒
 */
async function getHealthIndex(params) {
  const { userId, page = 1, size = 10 } = params;
  console.log('开始获取健康首页数据，userId:', userId);
  
  try {
    // 查询健康档案
    const profilePromise = db.collection(HEALTH_PROFILE_COLLECTION)
      .where({ userId })
      .get();
    
    // 查询最近的健康指标记录，每种类型取最新的一条
    const metricsPromise = db.collection(HEALTH_METRICS_COLLECTION)
      .where({ userId })
      .orderBy('recordTime', 'desc')
      .get();
    
    // 查询用药提醒
    const remindersPromise = db.collection(HEALTH_REMINDERS_COLLECTION)
      .where({ 
        userId,
        nextReminder: _.gt(Date.now()) // 只获取未来的提醒
      })
      .orderBy('nextReminder', 'asc')
      .limit(5)
      .get();
    
    // 并行查询以提高效率
    const [profileResult, metricsResult, remindersResult] = await Promise.all([
      profilePromise, metricsPromise, remindersPromise
    ]);
    
    console.log('健康档案查询结果:', profileResult);
    console.log('健康指标查询结果:', metricsResult);
    console.log('用药提醒查询结果:', remindersResult);
    
    // 处理健康档案数据
    const profile = profileResult.data.length > 0 ? profileResult.data[0] : null;
    
    // 处理健康指标数据 (按类型分组只取最新)
    const metricsMap = {};
    if (metricsResult && metricsResult.data && metricsResult.data.length > 0) {
      metricsResult.data.forEach(item => {
        if (!metricsMap[item.type] || new Date(metricsMap[item.type].recordTime) < new Date(item.recordTime)) {
          metricsMap[item.type] = item;
        }
      });
    }
    
    const metrics = Object.values(metricsMap).sort((a, b) => {
      return new Date(b.recordTime) - new Date(a.recordTime);
    });
    
    // 整合数据，确保返回统一的数据结构
    return {
      code: 0,
      data: {
        profile: profile,
        metrics: metrics || [],
        reminders: remindersResult.data || []
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('获取健康首页数据失败:', err);
    // 即使出错也返回统一的数据结构
    return {
      code: 0,
      data: {
        profile: null,
        metrics: [],
        reminders: []
      },
      msg: '获取成功'
    };
  }
}

/**
 * 获取健康指标数据（分页）
 */
async function getHealthMetrics(params) {
  const { userId, page = 1, size = 10, type = null } = params;
  console.log('开始获取健康指标数据，userId:', userId, '类型:', type);
  
  try {
    // 构建查询条件
    const condition = { userId };
    if (type) {
      condition.type = type;
    }
    
    // 计算总数
    const countResult = await db.collection(HEALTH_METRICS_COLLECTION)
      .where(condition)
      .count();
    
    // 查询指定页的数据
    const offset = (page - 1) * size;
    const dataResult = await db.collection(HEALTH_METRICS_COLLECTION)
      .where(condition)
      .orderBy('recordTime', 'desc')
      .skip(offset)
      .limit(size)
      .get();
    
    console.log('健康指标查询结果:', dataResult);
    
    return {
      code: 0,
      data: {
        list: dataResult.data,
        total: countResult.total,
        page: parseInt(page),
        size: parseInt(size)
      },
      msg: '获取成功'
    };
  } catch (err) {
    console.error('获取健康指标数据失败:', err);
    return {
      code: 500,
      msg: '获取健康指标数据失败',
      error: err.message
    };
  }
}

/**
 * 更新健康数据
 */
async function updateHealthData(params) {
  const { userId, dataType, data } = params;
  console.log('更新健康数据，userId:', userId, '数据类型:', dataType);
  
  try {
    switch (dataType) {
      case 'profile':
        return await updateHealthProfile(userId, data);
      case 'metrics':
        return await addHealthMetric(userId, data);
      case 'reminder':
        return await updateHealthReminder(userId, data);
      default:
        return {
          code: 400,
          msg: '无效的数据类型'
        };
    }
  } catch (err) {
    console.error('更新健康数据失败:', err);
    return {
      code: 500,
      msg: '更新健康数据失败',
      error: err.message
    };
  }
}

/**
 * 更新健康档案
 */
async function updateHealthProfile(userId, data) {
  // 查询是否已有健康档案
  const profileResult = await db.collection(HEALTH_PROFILE_COLLECTION)
    .where({ userId })
    .get();
  
  // 在更新或新增前，确保从 data 对象中移除 _id 和其他不应由前端直接修改的字段
  const dataToUpdate = { ...data };
  delete dataToUpdate._id; // 删除 _id 字段
  // delete dataToUpdate.userId; // userId 应该由后端逻辑控制，而不是前端传入的data中的userId
  // delete dataToUpdate.createTime; // createTime 不应该被更新

  if (profileResult.data.length > 0) {
    // 已有档案，更新
    await db.collection(HEALTH_PROFILE_COLLECTION)
      .where({ userId })
      .update({
        data: {
          ...dataToUpdate, // 使用处理过的 dataToUpdate
          updateTime: Date.now()
        }
      });
  } else {
    // 新增档案
    await db.collection(HEALTH_PROFILE_COLLECTION)
      .add({
        data: {
          userId, // 确保使用函数参数传入的userId
          ...dataToUpdate, // 使用处理过的 dataToUpdate
          createTime: Date.now(),
          updateTime: Date.now()
        }
      });
  }
  
  return {
    code: 0,
    msg: '更新健康档案成功'
  };
}

/**
 * 添加健康指标记录
 */
async function addHealthMetric(userId, data) {
  // 处理异常标记
  let isAbnormal = false;
  let abnormalReason = '';
  
  // 根据不同类型检查是否异常
  if (data.type === 'blood_pressure') {
    // 血压异常判断
    const { systolic, diastolic } = data.value;
    if (systolic > 130 || diastolic > 85) {
      isAbnormal = true;
      abnormalReason = systolic > 130 ? '收缩压偏高' : '舒张压偏高';
    }
  } else if (data.type === 'blood_sugar') {
    // 血糖异常判断 (空腹)
    if (data.value > 6.1) {
      isAbnormal = true;
      abnormalReason = '血糖偏高';
    }
  } else if (data.type === 'heart_rate') {
    // 心率异常判断
    if (data.value > 90 || data.value < 60) {
      isAbnormal = true;
      abnormalReason = data.value > 90 ? '心率偏快' : '心率偏慢';
    }
  }
  
  // 添加记录
  await db.collection(HEALTH_METRICS_COLLECTION)
    .add({
      data: {
        userId,
        ...data,
        isAbnormal,
        abnormalReason: isAbnormal ? abnormalReason : '',
        createTime: Date.now()
      }
    });
  
  return {
    code: 0,
    msg: '添加健康指标成功',
    data: {
      isAbnormal,
      abnormalReason
    }
  };
}

/**
 * 更新用药提醒
 */
async function updateHealthReminder(userId, data) {
  if (data._id) {
    // 更新已有提醒
    await db.collection(HEALTH_REMINDERS_COLLECTION)
      .doc(data._id)
      .update({
        data: {
          medicationName: data.medicationName,
          dosage: data.dosage,
          frequency: data.frequency,
          nextReminder: data.nextReminder,
          updateTime: Date.now()
        }
      });
  } else {
    // 添加新提醒
    await db.collection(HEALTH_REMINDERS_COLLECTION)
      .add({
        data: {
          userId,
          medicationName: data.medicationName,
          dosage: data.dosage,
          frequency: data.frequency,
          startDate: data.startDate || Date.now(),
          endDate: data.endDate || null,
          nextReminder: data.nextReminder,
          createTime: Date.now(),
          updateTime: Date.now()
        }
      });
  }
  
  return {
    code: 0,
    msg: '更新用药提醒成功'
  };
}

// 新增函数：删除单条健康指标记录
async function deleteHealthMetricRecord(params) {
  const { userId, recordId } = params;
  console.log('开始删除健康指标记录，userId:', userId, 'recordId:', recordId);

  if (!userId || !recordId) {
    return {
      code: 400,
      msg: '参数错误，缺少userId或recordId'
    };
  }

  try {
    const result = await db.collection(HEALTH_METRICS_COLLECTION)
      .where({
        _id: recordId,
        userId: userId // 确保只能删除自己的记录
      })
      .remove();

    if (result.stats.removed > 0) {
      console.log('健康指标记录删除成功', result);
      return {
        code: 0,
        msg: '删除成功'
      };
    } else {
      console.log('未找到要删除的记录或无权限删除', result);
      return {
        code: 404, // 或者 403 如果是权限问题，但 remove 本身不会区分
        msg: '未找到记录或删除失败'
      };
    }
  } catch (err) {
    console.error('删除健康指标记录失败:', err);
    return {
      code: 500,
      msg: '删除失败',
      error: err.message
    };
  }
}

// 导出模块
module.exports = {
  getHealthIndex,
  getHealthMetrics,
  updateHealthData,
  deleteHealthMetricRecord
}; 