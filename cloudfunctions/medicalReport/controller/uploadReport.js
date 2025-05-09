/**
 * 上传体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'

/**
 * 上传体检报告
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {String} params.reportDate - 体检日期
 * @param {String} params.hospital - 医院名称
 * @param {String} params.reportType - 报告类型
 * @param {String} params.summary - 报告摘要
 * @param {String} params.reportFileId - 报告文件云存储ID（可能是单个ID或以逗号分隔的多个ID）
 * @param {Boolean} params.isMultipleFiles - 是否为多文件上传
 * @param {String} params.reportFileName - 报告文件名称（可选，多文件时以分号分隔）
 * @param {Array} params.reportItems - 报告项目数组（可选）
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  // 记录环境信息
  console.log('当前云环境：', cloud.DYNAMIC_CURRENT_ENV);
  console.log('请求参数：', params);
  console.log('微信上下文：', wxContext);

  try {
    // 检查集合是否存在
    try {
      const collections = await db.listCollections().get();
      const collectionNames = collections.data.map(collection => collection.name);
      
      console.log('现有集合列表：', collectionNames);
      
      if (!collectionNames.includes(reportCollection)) {
        console.log(`集合 ${reportCollection} 不存在，尝试创建`);
        await db.createCollection(reportCollection);
        console.log(`集合 ${reportCollection} 创建成功`);
      } else {
        console.log(`集合 ${reportCollection} 已存在`);
      }
    } catch (collectionErr) {
      console.error('检查/创建集合出错：', collectionErr);
    }

    // 参数校验
    if (!params.userId && !wxContext.OPENID) {
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.reportDate) {
      return { code: 1002, msg: '体检日期不能为空' }
    }
    if (!params.hospital) {
      return { code: 1003, msg: '医院名称不能为空' }
    }
    if (!params.reportType) {
      return { code: 1004, msg: '报告类型不能为空' }
    }
    if (!params.reportFileId) {
      return { code: 1005, msg: '报告文件不能为空' }
    }

    // 构造数据
    const reportData = {
      userId: params.userId || wxContext.OPENID, // 确保有用户ID
      reportDate: params.reportDate,
      hospital: params.hospital,
      reportType: params.reportType,
      summary: params.summary || '',
      reportFileId: params.reportFileId,
      reportFileName: params.reportFileName || '',
      isMultipleFiles: params.isMultipleFiles || false,
      reportItems: params.reportItems || [],
      createTime: db.serverDate(),
      status: 0, // 0: 正常, 1: 异常/需关注
      _openid: wxContext.OPENID // 添加openid字段，确保权限
    }

    // 如果是多文件，检查文件ID格式
    if (params.isMultipleFiles) {
      const fileIds = params.reportFileId.split(',')
      if (fileIds.length === 0) {
        return { code: 1006, msg: '文件ID格式错误' }
      }
      
      // 验证每个文件ID
      for (const fileId of fileIds) {
        if (!fileId || fileId.trim() === '') {
          return { code: 1007, msg: '文件ID不能为空' }
        }
      }
    }

    console.log('准备写入数据：', reportData);

    // 写入数据库
    try {
      const result = await db.collection(reportCollection).add({
        data: reportData
      });
      
      console.log('数据库写入结果：', result);
      
      // 尝试查询刚写入的数据以验证
      try {
        const checkResult = await db.collection(reportCollection).doc(result._id).get();
        console.log('验证写入结果：', checkResult);
      } catch (verifyErr) {
        console.error('验证数据写入时出错：', verifyErr);
      }
      
      // 查询集合中的文档总数
      try {
        const countResult = await db.collection(reportCollection).count();
        console.log(`集合${reportCollection}中共有${countResult.total}条数据`);
      } catch (countErr) {
        console.error('查询文档总数出错：', countErr);
      }

      return {
        code: 0,
        msg: '上传成功',
        data: {
          reportId: result._id,
          _id: result._id // 返回文档ID
        }
      }
    } catch (dbErr) {
      console.error('数据库写入失败：', dbErr);
      return {
        code: 5001,
        msg: '数据库写入失败：' + (dbErr.message || '未知错误')
      }
    }
  } catch (err) {
    console.error('上传体检报告失败，详细错误：', err);
    return {
      code: 500,
      msg: '系统错误，请稍后重试',
      error: err.message || '未知错误'
    }
  }
} 