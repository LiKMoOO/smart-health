// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()
const _ = db.command
const MAX_LIMIT = 100

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // 获取操作类型和参数
  const { action, params } = event

  // 验证用户ID
  if (!openId) {
    return {
      code: 1,
      msg: '用户未授权',
      data: null
    }
  }

  // 根据操作类型执行相应的功能
  try {
    switch (action) {
      case 'getMedicationList': // 获取用药提醒列表
        return await getMedicationList(openId, params)
      
      case 'addMedication': // 添加用药提醒
        return await addMedication(openId, params)
      
      case 'updateMedication': // 更新用药提醒
        return await updateMedication(openId, params)
      
      case 'deleteMedication': // 删除用药提醒
        return await deleteMedication(openId, params)
      
      case 'getMedicationDetail': // 获取用药提醒详情
        return await getMedicationDetail(openId, params)
      
      default:
        return {
          code: 1,
          msg: '未知的操作类型',
          data: null
        }
    }
  } catch (err) {
    console.error('操作失败：', err)
    return {
      code: 1,
      msg: '操作失败：' + err.message,
      data: null
    }
  }
}

/**
 * 获取用户的用药提醒列表
 * @param {string} userId - 用户ID
 * @param {object} params - 查询参数
 * @returns {object} 结果对象
 */
async function getMedicationList(userId, params = {}) {
  try {
    // 构建查询条件
    const queryCondition = {
      userId: userId,
      isDeleted: false
    }
    
    // 如果有查询关键词，添加模糊搜索条件
    if (params.keyword) {
      queryCondition.medicationName = db.RegExp({
        regexp: params.keyword,
        options: 'i', // 不区分大小写
      })
    }
    
    // 如果有状态筛选
    if (params.status !== undefined) {
      queryCondition.status = params.status
    }
    
    // 查询总数
    const countResult = await db.collection('medication_reminders')
      .where(queryCondition)
      .count()
      
    const total = countResult.total
    
    // 分页参数
    const page = params.page || 1
    const size = params.size || 10
    const skip = (page - 1) * size
    
    // 查询数据
    let medications = []
    if (total > 0) {
      // 构建排序
      let orderBy = params.orderBy || 'nextReminderTime'
      let orderDir = params.orderDir || 'asc'
      
      const query = db.collection('medication_reminders')
        .where(queryCondition)
        .skip(skip)
        .limit(size)
      
      // 应用排序
      if (orderDir === 'asc') {
        query.orderBy(orderBy, 'asc')
      } else {
        query.orderBy(orderBy, 'desc')
      }
      
      const result = await query.get()
      medications = result.data
    }
    
    return {
      code: 0,
      msg: '获取成功',
      data: {
        list: medications,
        page: page,
        size: size,
        total: total,
        count: Math.ceil(total / size)
      }
    }
  } catch (err) {
    console.error('获取用药提醒列表失败：', err)
    return {
      code: 1,
      msg: '获取用药提醒列表失败',
      data: null
    }
  }
}

/**
 * 添加用药提醒
 * @param {string} userId - 用户ID
 * @param {object} params - 用药提醒信息
 * @returns {object} 结果对象
 */
async function addMedication(userId, params) {
  try {
    // 验证必要参数
    if (!params.medicationName) {
      return {
        code: 1,
        msg: '药品名称不能为空',
        data: null
      }
    }
    
    // 创建新的用药提醒记录
    const medicationData = {
      userId: userId,
      medicationName: params.medicationName,
      dosage: params.dosage || '',
      unit: params.unit || '片',
      frequency: params.frequency || '每日一次',
      reminderTime: params.reminderTime || [],
      startDate: params.startDate || new Date(),
      endDate: params.endDate || null, // 可以为空，表示长期服药
      notes: params.notes || '',
      status: 1, // 1: 进行中, 0: 已完成, 2: 已暂停
      isDeleted: false,
      beforeMeal: params.beforeMeal === true, // 是否饭前服用
      createdAt: new Date(),
      updatedAt: new Date(),
      // 计算下次提醒时间
      nextReminderTime: calculateNextReminderTime(params.reminderTime)
    }
    
    // 存入数据库
    const result = await db.collection('medication_reminders').add({
      data: medicationData
    })
    
    return {
      code: 0,
      msg: '添加成功',
      data: {
        id: result._id
      }
    }
  } catch (err) {
    console.error('添加用药提醒失败：', err)
    return {
      code: 1,
      msg: '添加用药提醒失败',
      data: null
    }
  }
}

/**
 * 更新用药提醒
 * @param {string} userId - 用户ID
 * @param {object} params - 更新的用药提醒信息
 * @returns {object} 结果对象
 */
async function updateMedication(userId, params) {
  try {
    // 验证必要参数
    if (!params.id) {
      return {
        code: 1,
        msg: '缺少用药提醒ID',
        data: null
      }
    }
    
    // 检查记录是否存在且属于当前用户
    const medication = await db.collection('medication_reminders')
      .doc(params.id)
      .get()
    
    if (!medication.data || medication.data.userId !== userId) {
      return {
        code: 1,
        msg: '未找到相关记录或无权操作',
        data: null
      }
    }
    
    // 更新数据
    const updateData = {
      updatedAt: new Date()
    }
    
    // 只更新有变化的字段
    if (params.medicationName !== undefined) updateData.medicationName = params.medicationName
    if (params.dosage !== undefined) updateData.dosage = params.dosage
    if (params.unit !== undefined) updateData.unit = params.unit
    if (params.frequency !== undefined) updateData.frequency = params.frequency
    if (params.reminderTime !== undefined) {
      updateData.reminderTime = params.reminderTime
      // 更新下次提醒时间
      updateData.nextReminderTime = calculateNextReminderTime(params.reminderTime)
    }
    if (params.startDate !== undefined) updateData.startDate = params.startDate
    if (params.endDate !== undefined) updateData.endDate = params.endDate
    if (params.notes !== undefined) updateData.notes = params.notes
    if (params.status !== undefined) updateData.status = params.status
    if (params.beforeMeal !== undefined) updateData.beforeMeal = params.beforeMeal
    
    // 更新记录
    await db.collection('medication_reminders')
      .doc(params.id)
      .update({
        data: updateData
      })
    
    return {
      code: 0,
      msg: '更新成功',
      data: null
    }
  } catch (err) {
    console.error('更新用药提醒失败：', err)
    return {
      code: 1,
      msg: '更新用药提醒失败',
      data: null
    }
  }
}

/**
 * 删除用药提醒（软删除）
 * @param {string} userId - 用户ID
 * @param {object} params - 包含ID的参数对象
 * @returns {object} 结果对象
 */
async function deleteMedication(userId, params) {
  try {
    // 验证必要参数
    if (!params.id) {
      return {
        code: 1,
        msg: '缺少用药提醒ID',
        data: null
      }
    }
    
    // 检查记录是否存在且属于当前用户
    const medication = await db.collection('medication_reminders')
      .doc(params.id)
      .get()
    
    if (!medication.data || medication.data.userId !== userId) {
      return {
        code: 1,
        msg: '未找到相关记录或无权操作',
        data: null
      }
    }
    
    // 软删除记录
    await db.collection('medication_reminders')
      .doc(params.id)
      .update({
        data: {
          isDeleted: true,
          updatedAt: new Date()
        }
      })
    
    return {
      code: 0,
      msg: '删除成功',
      data: null
    }
  } catch (err) {
    console.error('删除用药提醒失败：', err)
    return {
      code: 1,
      msg: '删除用药提醒失败',
      data: null
    }
  }
}

/**
 * 获取用药提醒详情
 * @param {string} userId - 用户ID
 * @param {object} params - 包含ID的参数对象
 * @returns {object} 结果对象
 */
async function getMedicationDetail(userId, params) {
  try {
    // 验证必要参数
    if (!params.id) {
      return {
        code: 1,
        msg: '缺少用药提醒ID',
        data: null
      }
    }
    
    // 查询记录
    const medication = await db.collection('medication_reminders')
      .doc(params.id)
      .get()
    
    // 检查记录是否存在且属于当前用户
    if (!medication.data || medication.data.userId !== userId || medication.data.isDeleted) {
      return {
        code: 1,
        msg: '未找到相关记录或无权查看',
        data: null
      }
    }
    
    return {
      code: 0,
      msg: '获取成功',
      data: medication.data
    }
  } catch (err) {
    console.error('获取用药提醒详情失败：', err)
    return {
      code: 1,
      msg: '获取用药提醒详情失败',
      data: null
    }
  }
}

/**
 * 计算下次提醒时间
 * @param {Array} reminderTimes - 提醒时间数组
 * @returns {Date} 下次提醒时间
 */
function calculateNextReminderTime(reminderTimes) {
  if (!reminderTimes || reminderTimes.length === 0) {
    return null
  }
  
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // 今天的提醒时间点
  let nextTimes = reminderTimes.map(time => {
    // 解析时间字符串 "HH:MM"
    const [hours, minutes] = time.split(':').map(Number)
    const reminderTime = new Date(today)
    reminderTime.setHours(hours, minutes, 0, 0)
    return reminderTime
  })
  
  // 找出今天剩余的最近提醒时间
  let nextTime = nextTimes.find(time => time > now)
  
  // 如果今天没有剩余提醒，则取明天第一个提醒
  if (!nextTime) {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    nextTime = new Date(tomorrow)
    const [hours, minutes] = reminderTimes[0].split(':').map(Number)
    nextTime.setHours(hours, minutes, 0, 0)
  }
  
  return nextTime
} 