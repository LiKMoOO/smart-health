/**
 * OCR识别体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const axios = require('axios')

// TODO: 替换为实际的OCR API地址和密钥
const OCR_API_URL = 'https://api.ocr.space/parse/image'
const OCR_API_KEY = 'K89215860688957' // 请替换为实际密钥

/**
 * OCR识别体检报告
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {String} params.fileID - 文件云存储ID
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  try {
    // 参数校验
    if (!params.userId) {
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.fileID) {
      return { code: 1002, msg: '文件ID不能为空' }
    }

    // 获取文件临时下载链接
    const fileResult = await cloud.getTempFileURL({
      fileList: [params.fileID],
    })

    if (!fileResult.fileList || fileResult.fileList.length === 0) {
      return { code: 1003, msg: '文件不存在' }
    }

    const fileUrl = fileResult.fileList[0].tempFileURL
    if (!fileUrl) {
      return { code: 1004, msg: '获取文件链接失败' }
    }

    // 调用OCR API进行文字识别
    const ocrResult = await callOcrAPI(fileUrl)

    // 使用AI提取体检报告摘要
    const summary = await extractSummary(ocrResult.text)

    return {
      code: 0,
      msg: 'OCR识别成功',
      data: {
        text: ocrResult.text,
        summary: summary
      }
    }
  } catch (err) {
    console.error('OCR识别体检报告失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
}

/**
 * 调用OCR API
 * @param {String} imageUrl - 图片URL
 * @returns {Object} - OCR识别结果
 */
async function callOcrAPI(imageUrl) {
  try {
    // 构造请求参数
    const params = new URLSearchParams()
    params.append('apikey', OCR_API_KEY)
    params.append('url', imageUrl)
    params.append('language', 'chs') // 中文识别
    params.append('isOverlayRequired', 'false')
    params.append('detectOrientation', 'true')
    params.append('scale', 'true')

    // 调用OCR API
    const response = await axios.post(OCR_API_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    // 解析返回结果
    if (response.data && response.data.ParsedResults && response.data.ParsedResults.length > 0) {
      return {
        text: response.data.ParsedResults[0].ParsedText
      }
    } else {
      throw new Error('OCR识别结果格式错误')
    }
  } catch (err) {
    console.error('调用OCR API失败', err)
    throw err
  }
}

/**
 * 提取体检报告摘要
 * @param {String} text - OCR识别的文本
 * @returns {String} - 提取的摘要
 */
async function extractSummary(text) {
  try {
    // 处理常见的体检报告关键节点
    // 这里使用简单规则提取摘要，实际项目中可能需要更复杂的AI处理
    let summary = ''

    // 尝试提取标题
    const titleMatch = text.match(/(体检报告|健康体检|体检结果|体检总结)[\s\S]{0,50}/)
    if (titleMatch) {
      summary += titleMatch[0].trim() + '\n'
    }

    // 尝试提取结论部分
    const conclusionMatch = text.match(/(体检结论|检查结论|总体评价|健康建议)[\s\S]{0,200}?(。|；|$)/)
    if (conclusionMatch) {
      summary += conclusionMatch[0].trim()
    }

    // 提取异常项目
    const abnormalItems = []
    const abnormalMatches = text.match(/(\*|\[异常\]|\(异常\)|未在参考范围内)[\s\S]{0,50}?[：:]/g)
    if (abnormalMatches && abnormalMatches.length > 0) {
      abnormalMatches.forEach(item => {
        abnormalItems.push(item.trim())
      })
      
      if (abnormalItems.length > 0) {
        summary += '\n异常项目：\n' + abnormalItems.join('\n')
      }
    }

    return summary || '未能提取到有效摘要，请手动填写'
  } catch (err) {
    console.error('提取摘要失败', err)
    return '摘要提取失败，请手动填写'
  }
} 