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
const HEALTH_JOURNAL_COLLECTION = 'health_journals';

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
 * 获取健康日志数据（分页）
 */
async function getHealthJournal(params) {
  const { userId, page = 1, size = 10, startDate, endDate } = params;
  console.log('开始获取健康日志数据，userId:', userId);
  
  try {
    // 构建查询条件
    const condition = { userId };
    
    // 如果有日期筛选条件
    if (startDate || endDate) {
      condition.date = {};
      if (startDate) condition.date = _.gte(startDate);
      if (endDate) condition.date = Object.assign(condition.date, _.lte(endDate));
    }
    
    // 计算总数
    const countResult = await db.collection(HEALTH_JOURNAL_COLLECTION)
      .where(condition)
      .count();
    
    // 查询指定页的数据
    const offset = (page - 1) * size;
    const dataResult = await db.collection(HEALTH_JOURNAL_COLLECTION)
      .where(condition)
      .orderBy('date', 'desc') // 按日期倒序排列
      .skip(offset)
      .limit(size)
      .get();
    
    console.log('健康日志查询结果:', dataResult);
    
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
    console.error('获取健康日志数据失败:', err);
    return {
      code: 500,
      msg: '获取健康日志数据失败',
      error: err.message
    };
  }
}

/**
 * 更新健康数据
 */
async function updateHealthData(params) {
  const { userId, dataType, data, action, journalId } = params;
  console.log('更新健康数据，userId:', userId, '数据类型:', dataType, '操作类型:', action);
  
  try {
    switch (dataType) {
      case 'profile':
        return await updateHealthProfile(userId, data);
      case 'metrics':
        return await addHealthMetric(userId, data);
      case 'reminder':
        return await updateHealthReminder(userId, data);
      case 'journal':
        if (action === 'delete') {
          return await deleteHealthJournal(userId, journalId);
        } else if (journalId) {
          return await updateHealthJournal(userId, journalId, data);
        } else {
          return await addHealthJournal(userId, data);
        }
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

/**
 * 添加健康日志
 */
async function addHealthJournal(userId, data) {
  console.log('添加健康日志，userId:', userId);
  
  try {
    // 构建要保存的日志数据
    const journalData = {
      userId,
      date: data.date,
      mood: data.mood,
      sleepHours: data.sleepHours,
      activityLevel: data.activityLevel,
      symptoms: data.symptoms || [],
      notes: data.notes || '',
      createTime: Date.now()
    };
    
    // 添加到数据库
    const result = await db.collection(HEALTH_JOURNAL_COLLECTION).add({
      data: journalData
    });
    
    console.log('健康日志添加成功，_id:', result._id);
    
    return {
      code: 0,
      data: {
        _id: result._id
      },
      msg: '添加成功'
    };
  } catch (err) {
    console.error('添加健康日志失败:', err);
    return {
      code: 500,
      msg: '添加健康日志失败',
      error: err.message
    };
  }
}

/**
 * 更新健康日志
 */
async function updateHealthJournal(userId, journalId, data) {
  console.log('更新健康日志，userId:', userId, 'journalId:', journalId);
  
  try {
    // 确保用户只能更新自己的日志
    const journal = await db.collection(HEALTH_JOURNAL_COLLECTION)
      .where({
        _id: journalId,
        userId
      })
      .get();
    
    if (journal.data.length === 0) {
      return {
        code: 403,
        msg: '无权限更新此日志或日志不存在'
      };
    }
    
    // 构建要更新的日志数据
    const journalData = {
      date: data.date,
      mood: data.mood,
      sleepHours: data.sleepHours,
      activityLevel: data.activityLevel,
      symptoms: data.symptoms || [],
      notes: data.notes || '',
      updateTime: Date.now()
    };
    
    // 更新数据库
    await db.collection(HEALTH_JOURNAL_COLLECTION)
      .doc(journalId)
      .update({
        data: journalData
      });
    
    console.log('健康日志更新成功，journalId:', journalId);
    
    return {
      code: 0,
      msg: '更新成功'
    };
  } catch (err) {
    console.error('更新健康日志失败:', err);
    return {
      code: 500,
      msg: '更新健康日志失败',
      error: err.message
    };
  }
}

/**
 * 删除健康日志
 */
async function deleteHealthJournal(userId, journalId) {
  console.log('删除健康日志，userId:', userId, 'journalId:', journalId);
  
  try {
    // 确保用户只能删除自己的日志
    const journal = await db.collection(HEALTH_JOURNAL_COLLECTION)
      .where({
        _id: journalId,
        userId
      })
      .get();
    
    if (journal.data.length === 0) {
      return {
        code: 403,
        msg: '无权限删除此日志或日志不存在'
      };
    }
    
    // 从数据库删除
    await db.collection(HEALTH_JOURNAL_COLLECTION)
      .doc(journalId)
      .remove();
    
    console.log('健康日志删除成功，journalId:', journalId);
    
    return {
      code: 0,
      msg: '删除成功'
    };
  } catch (err) {
    console.error('删除健康日志失败:', err);
    return {
      code: 500,
      msg: '删除健康日志失败',
      error: err.message
    };
  }
}

/**
 * 获取健康分析数据
 * 支持不同类型健康指标的趋势分析
 */
async function getHealthAnalysis(params) {
  const { userId, period = 'month', metricTypes = [] } = params;
  console.log('开始获取健康分析数据，userId:', userId, '周期:', period);
  
  try {
    // 计算日期范围
    const now = new Date();
    let startDate = new Date();
    
    switch(period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1); // 默认一个月
    }
    
    // 查询条件
    const condition = { 
      userId,
      recordTime: _.gte(startDate.getTime()) 
    };
    
    // 如果指定了特定的指标类型
    if (metricTypes && metricTypes.length > 0) {
      condition.type = _.in(metricTypes);
    }
    
    console.log('构建的查询条件:', JSON.stringify(condition));
    
    // 获取健康指标数据
    const metricsResult = await db.collection(HEALTH_METRICS_COLLECTION)
      .where(condition)
      .orderBy('recordTime', 'asc')
      .get();
    
    console.log('健康指标数据获取结果:', metricsResult);
    
    // 处理数据，按类型分组并生成趋势数据
    const trendData = {};
    
    if (metricsResult && metricsResult.data && metricsResult.data.length > 0) {
      // 按类型分组
      metricsResult.data.forEach(item => {
        if (!trendData[item.type]) {
          trendData[item.type] = [];
        }
        trendData[item.type].push({
          recordTime: item.recordTime,
          value: item.value,
          unit: item.unit
        });
      });
      
      // 对每种类型的数据进行处理，按时间排序
      Object.keys(trendData).forEach(type => {
        trendData[type].sort((a, b) => {
          return new Date(a.recordTime) - new Date(b.recordTime);
        });
      });
    }
    
    // 获取健康评估
    const healthAssessment = await generateHealthAssessment(userId, trendData);
    
    // 准备返回的数据结构
    const response = {
      code: 0,
      data: {
        trendData,
        healthAssessment,
        period
      },
      msg: '获取成功'
    };
    
    console.log('【Health Cloud Function】准备返回健康分析数据:', JSON.stringify(response)); // 添加日志
    
    return response; // 返回准备好的数据
  } catch (err) {
    console.error('获取健康分析数据失败:', err);
    return {
      code: 500,
      msg: '获取健康分析数据失败',
      error: err.message
    };
  }
}

/**
 * 生成健康评估数据
 * 基于用户的健康指标数据进行分析和评估
 */
async function generateHealthAssessment(userId, trendData) {
  try {
    // 获取用户健康档案
    const profileResult = await db.collection(HEALTH_PROFILE_COLLECTION)
      .where({ userId })
      .get();
    
    const profile = profileResult.data.length > 0 ? profileResult.data[0] : null;
    
    // 评估结果
    const assessment = {
      overallScore: 0,
      items: [],
      suggestions: []
    };
    
    // 如果没有健康档案，提供基础评估
    if (!profile) {
      assessment.items.push({
        name: '健康档案',
        score: 0,
        status: 'warning',
        description: '未创建健康档案，无法进行全面分析'
      });
      
      assessment.suggestions.push('请填写您的健康档案基本信息，以便获得更准确的健康评估');
      assessment.overallScore = 60;
      return assessment;
    }
    
    // 计算BMI指数（如果有身高体重数据）
    if (profile.basicInfo && profile.basicInfo.height && profile.basicInfo.weight) {
      const height = profile.basicInfo.height / 100; // 转换为米
      const weight = profile.basicInfo.weight;
      const bmi = weight / (height * height);
      
      let bmiStatus = 'normal';
      let bmiScore = 100;
      let bmiDescription = '';
      
      if (bmi < 18.5) {
        bmiStatus = 'warning';
        bmiScore = 70;
        bmiDescription = '体重偏轻';
      } else if (bmi >= 18.5 && bmi < 24) {
        bmiStatus = 'normal';
        bmiScore = 100;
        bmiDescription = '体重正常';
      } else if (bmi >= 24 && bmi < 28) {
        bmiStatus = 'warning';
        bmiScore = 60;
        bmiDescription = '超重';
      } else {
        bmiStatus = 'danger';
        bmiScore = 40;
        bmiDescription = '肥胖';
      }
      
      assessment.items.push({
        name: 'BMI指数',
        value: bmi.toFixed(1),
        score: bmiScore,
        status: bmiStatus,
        description: bmiDescription
      });
      
      if (bmiStatus === 'warning' || bmiStatus === 'danger') {
        if (bmi < 18.5) {
          assessment.suggestions.push('您的体重偏轻，建议适当增加营养摄入，保持健康饮食');
        } else {
          assessment.suggestions.push('您的BMI指数偏高，建议控制饮食，适量增加运动');
        }
      }
    }
    
    // 分析血压趋势（如果有血压数据）
    if (trendData['blood_pressure'] && trendData['blood_pressure'].length > 0) {
      const bpRecords = trendData['blood_pressure'];
      const latestBp = bpRecords[bpRecords.length - 1];
      
      if (latestBp && latestBp.value) {
        const systolic = latestBp.value.systolic; // 收缩压
        const diastolic = latestBp.value.diastolic; // 舒张压
        
        let bpStatus = 'normal';
        let bpScore = 100;
        let bpDescription = '';
        
        if (systolic < 90 || diastolic < 60) {
          bpStatus = 'warning';
          bpScore = 70;
          bpDescription = '血压偏低';
        } else if ((systolic >= 90 && systolic < 120) && (diastolic >= 60 && diastolic < 80)) {
          bpStatus = 'normal';
          bpScore = 100;
          bpDescription = '血压正常';
        } else if ((systolic >= 120 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) {
          bpStatus = 'warning';
          bpScore = 70;
          bpDescription = '血压偏高';
        } else {
          bpStatus = 'danger';
          bpScore = 40;
          bpDescription = '高血压';
        }
        
        assessment.items.push({
          name: '血压',
          value: `${systolic}/${diastolic} mmHg`,
          score: bpScore,
          status: bpStatus,
          description: bpDescription
        });
        
        if (bpStatus === 'warning' || bpStatus === 'danger') {
          if (systolic < 90 || diastolic < 60) {
            assessment.suggestions.push('您的血压偏低，建议多注意休息，适当增加盐分摄入，必要时咨询医生');
          } else {
            assessment.suggestions.push('您的血压偏高，建议减少盐分摄入，保持良好作息，必要时咨询医生');
          }
        }
      }
    }
    
    // 分析血糖趋势（如果有血糖数据）
    if (trendData['blood_sugar'] && trendData['blood_sugar'].length > 0) {
      const bsRecords = trendData['blood_sugar'];
      const latestBs = bsRecords[bsRecords.length - 1];
      
      if (latestBs && latestBs.value) {
        const bloodSugar = latestBs.value;
        
        let bsStatus = 'normal';
        let bsScore = 100;
        let bsDescription = '';
        
        if (bloodSugar < 3.9) {
          bsStatus = 'danger';
          bsScore = 40;
          bsDescription = '血糖过低';
        } else if (bloodSugar >= 3.9 && bloodSugar < 6.1) {
          bsStatus = 'normal';
          bsScore = 100;
          bsDescription = '血糖正常';
        } else if (bloodSugar >= 6.1 && bloodSugar < 7.0) {
          bsStatus = 'warning';
          bsScore = 70;
          bsDescription = '血糖偏高';
        } else {
          bsStatus = 'danger';
          bsScore = 40;
          bsDescription = '血糖过高';
        }
        
        assessment.items.push({
          name: '血糖',
          value: `${bloodSugar} mmol/L`,
          score: bsScore,
          status: bsStatus,
          description: bsDescription
        });
        
        if (bsStatus === 'warning' || bsStatus === 'danger') {
          if (bloodSugar < 3.9) {
            assessment.suggestions.push('您的血糖偏低，建议随身携带含糖食物，必要时咨询医生');
          } else {
            assessment.suggestions.push('您的血糖偏高，建议控制碳水化合物摄入，保持适当运动，必要时咨询医生');
          }
        }
      }
    }
    
    // 计算总体健康评分
    if (assessment.items.length > 0) {
      const totalScore = assessment.items.reduce((sum, item) => sum + item.score, 0);
      assessment.overallScore = Math.round(totalScore / assessment.items.length);
    } else {
      assessment.overallScore = 60; // 默认分数
      assessment.suggestions.push('数据不足，建议记录更多健康指标以获得更准确的评估');
    }
    
    // 根据总体得分提供总结建议
    if (assessment.overallScore >= 90) {
      assessment.summary = '您的健康状况非常好，请继续保持健康的生活方式';
    } else if (assessment.overallScore >= 70) {
      assessment.summary = '您的健康状况良好，有部分指标需要注意';
    } else if (assessment.overallScore >= 50) {
      assessment.summary = '您的健康状况一般，需要关注多个健康指标';
    } else {
      assessment.summary = '您的健康状况需要改善，建议咨询医生获取专业建议';
    }
    
    return assessment;
  } catch (err) {
    console.error('生成健康评估失败:', err);
    return {
      overallScore: 60,
      items: [],
      suggestions: ['健康评估生成失败，请稍后再试']
    };
  }
}

// 导出模块
module.exports = {
  getHealthIndex,
  getHealthMetrics,
  updateHealthData,
  deleteHealthMetricRecord,
  getHealthJournal,
  getHealthAnalysis
}; 