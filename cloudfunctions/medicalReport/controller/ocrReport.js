/**
 * OCR智能识别体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

/**
 * OCR识别体检报告
 * @param {Object} params - 请求参数
 * @param {String} params.userId - 用户ID
 * @param {String} params.fileID - 文件云存储ID
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  console.log('OCR识别体检报告开始执行, 参数:', params);
  try {
    // 参数校验
    if (!params.userId) {
      console.log('用户ID不能为空');
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.fileID) {
      console.log('文件ID不能为空');
      return { code: 1002, msg: '文件ID不能为空' }
    }

    console.log('开始OCR识别，文件ID:', params.fileID);

    // 获取文件临时下载链接
    const fileResult = await cloud.getTempFileURL({
      fileList: [params.fileID],
    });
    console.log('获取临时下载链接结果:', fileResult);

    if (!fileResult.fileList || fileResult.fileList.length === 0) {
      console.log('文件不存在');
      return { code: 1003, msg: '文件不存在' }
    }

    const fileUrl = fileResult.fileList[0].tempFileURL
    if (!fileUrl) {
      console.log('获取文件链接失败');
      return { code: 1004, msg: '获取文件链接失败' }
    }

    console.log('文件临时链接:', fileUrl);

    // 直接调用微信OCR API进行文字识别，跳过下载文件步骤
    const ocrResult = await callWeixinOCRDirectly(fileUrl);
    console.log('OCR识别完成，开始提取结构化信息');
    
    // 提取体检报告结构化信息
    const extractedInfo = await extractReportInfo(ocrResult.text);
    console.log('结构化信息提取完成');

    return {
      code: 0,
      msg: 'OCR识别成功',
      data: {
        text: ocrResult.text,
        ...extractedInfo
      }
    }
  } catch (err) {
    console.error('OCR识别体检报告失败', err);
    return {
      code: 500,
      msg: err.message || '系统错误，请稍后重试',
      error: err.message
    }
  }
}

/**
 * 直接调用微信OCR API
 * @param {String} fileUrl - 文件URL
 * @returns {Object} - OCR识别结果
 */
async function callWeixinOCRDirectly(fileUrl) {
  try {
    console.log('开始调用微信OCR API');
    
    // 直接使用文件URL调用OCR接口
    const result = await cloud.openapi.ocr.printedText({
      type: 'url',
      imgUrl: fileUrl
    });
    
    console.log('微信OCR API调用成功:', result);
    
    if (result && result.items && result.items.length > 0) {
      // 合并所有文本内容
      const textContent = result.items.map(item => item.text).join('\n');
      return { text: textContent }
    } else {
      console.log('未识别到文本内容');
      throw new Error('未识别到文本内容')
    }
  } catch (err) {
    console.error('调用微信OCR API失败', err);
    
    if (err.errCode === -1) {
      throw new Error('OCR服务繁忙，请稍后重试');
    } else if (err.errMsg && err.errMsg.includes('url not in domain list')) {
      throw new Error('图片链接不在安全域名中，请联系管理员');
    } else {
      throw new Error('OCR识别失败: ' + (err.errMsg || err.message || '未知错误'));
    }
  }
}

/**
 * 下载文件到临时目录 (备用方法，目前未使用)
 * @param {String} fileUrl - 文件URL
 * @returns {String} - 本地临时文件路径
 */
async function downloadFile(fileUrl) {
  const fs = require('fs');
  const path = require('path');
  const request = require('request');
  
  return new Promise((resolve, reject) => {
    const tmpPath = path.join('/tmp', `image_${Date.now()}.jpg`);
    const writeStream = fs.createWriteStream(tmpPath);
    
    request(fileUrl)
      .pipe(writeStream)
      .on('close', () => {
        resolve(tmpPath);
      })
      .on('error', (err) => {
        reject(err);
      });
  });
}

/**
 * 调用微信OCR API (备用方法，目前未使用)
 * @param {String} filePath - 本地文件路径
 * @returns {Object} - OCR识别结果
 */
async function callWeixinOCR(filePath) {
  try {
    const fs = require('fs');
    
    // 读取文件并转为base64
    const fileContent = fs.readFileSync(filePath);
    const fileBase64 = fileContent.toString('base64');
    
    // 调用微信云调用OCR接口
    const result = await cloud.openapi.ocr.printedText({
      img: {
        contentType: 'image/jpeg',
        value: fileBase64
      }
    });
    
    if (result && result.items && result.items.length > 0) {
      // 合并所有文本内容
      const textContent = result.items.map(item => item.text).join('\n');
      return { text: textContent }
    } else {
      throw new Error('未识别到文本内容');
    }
  } catch (err) {
    console.error('调用微信OCR API失败', err);
    throw err;
  }
}

/**
 * 提取体检报告信息
 * @param {String} text - OCR识别的文本
 * @returns {Object} - 提取的结构化信息
 */
async function extractReportInfo(text) {
  try {
    console.log('开始提取报告信息');
    
    const reportInfo = {
      hospital: '',
      reportDate: '',
      reportType: '',
      summary: ''
    };
    
    // 提取医院名称
    const hospitalPatterns = [
      /(.{2,20}医院)/,
      /(医院名称[：:]\s*(.{2,20}))/,
      /(体检机构[：:]\s*(.{2,20}))/
    ];
    
    for (const pattern of hospitalPatterns) {
      const match = text.match(pattern);
      if (match) {
        reportInfo.hospital = match[1].replace(/医院名称[：:]\s*/, '').replace(/体检机构[：:]\s*/, '').trim();
        break;
      }
    }
    
    // 提取体检日期
    const datePatterns = [
      /体检日期[：:]\s*(20\d{2}[-\/\.][01]?\d[-\/\.][0-3]?\d)/,
      /(20\d{2}[-\/\.][01]?\d[-\/\.][0-3]?\d)\s*体检/,
      /检查日期[：:]\s*(20\d{2}[-\/\.][01]?\d[-\/\.][0-3]?\d)/,
      /报告日期[：:]\s*(20\d{2}[-\/\.][01]?\d[-\/\.][0-3]?\d)/
    ];
    
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        // 格式化日期为YYYY-MM-DD
        const dateStr = match[1].replace(/[\/\.]/g, '-');
        const parts = dateStr.split('-').map(p => p.padStart(2, '0'));
        if (parts.length === 3) {
          reportInfo.reportDate = `${parts[0]}-${parts[1]}-${parts[2]}`;
        }
        break;
      }
    }
    
    // 提取报告类型
    const typePatterns = [
      /体检类型[：:]\s*(.{2,10})/,
      /([^。，；]+体检)\s/,
      /([^。，；]*健康证)/,
      /([^。，；]*体检报告)/
    ];
    
    const reportTypeMap = {
      '常规': '常规体检',
      '健康证': '健康证体检',
      '入职': '入职体检',
      '年度': '年度体检',
      '婚前': '婚前体检',
      '套餐': '体检套餐'
    };
    
    for (const pattern of typePatterns) {
      const match = text.match(pattern);
      if (match) {
        const typeText = match[1].replace(/体检类型[：:]\s*/, '').trim();
        
        // 匹配标准报告类型
        let foundType = false;
        for (const [key, value] of Object.entries(reportTypeMap)) {
          if (typeText.includes(key)) {
            reportInfo.reportType = value;
            foundType = true;
            break;
          }
        }
        
        // 如果没有匹配到标准类型，使用原始文本
        if (!foundType) {
          reportInfo.reportType = typeText.length <= 10 ? typeText : '';
        }
        
        break;
      }
    }
    
    // 提取体检结论/摘要
    const summaryPatterns = [
      /体检结论[：:]([\s\S]{10,200}?)(?=[\n]{2}|$)/,
      /总体评价[：:]([\s\S]{10,200}?)(?=[\n]{2}|$)/,
      /检查结论[：:]([\s\S]{10,200}?)(?=[\n]{2}|$)/,
      /健康建议[：:]([\s\S]{10,200}?)(?=[\n]{2}|$)/
    ];
    
    for (const pattern of summaryPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        reportInfo.summary = match[1].trim();
        break;
      }
    }
    
    // 如果没有找到明确的结论，提取关键异常项目
    if (!reportInfo.summary) {
      const abnormalItems = [];
      const abnormalMatches = text.match(/(\*|\[异常\]|\(异常\)|未在参考范围内)[\s\S]{0,50}?[：:]/g);
      if (abnormalMatches && abnormalMatches.length > 0) {
        abnormalMatches.slice(0, 3).forEach(item => {
          abnormalItems.push(item.trim());
        });
        
        if (abnormalItems.length > 0) {
          reportInfo.summary = '异常项目：' + abnormalItems.join('；');
        }
      }
    }
    
    // 调用更简化的信息提取，减少处理时间
    enhanceExtractedInfoSimple(text, reportInfo);
    console.log('报告信息提取完成:', reportInfo);
    
    return reportInfo;
  } catch (err) {
    console.error('提取报告信息失败', err);
    return {
      hospital: '',
      reportDate: '',
      reportType: '',
      summary: ''
    };
  }
}

/**
 * 增强信息提取能力(简化版)
 * @param {String} text - 完整文本
 * @param {Object} reportInfo - 已提取的报告信息
 */
function enhanceExtractedInfoSimple(text, reportInfo) {
  try {
    // 如果医院名称为空，查找前10行中包含"医院"、"体检中心"等关键词的行
    if (!reportInfo.hospital) {
      const lines = text.split('\n').slice(0, 10);
      for (const line of lines) {
        if (line.includes('医院') || line.includes('体检中心')) {
          reportInfo.hospital = line.trim();
          break;
        }
      }
    }
    
    // 如果日期为空，尝试匹配任何形式的日期
    if (!reportInfo.reportDate) {
      const dateMatch = text.match(/(\d{4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})/);
      if (dateMatch) {
        const year = dateMatch[1];
        const month = dateMatch[2].padStart(2, '0');
        const day = dateMatch[3].padStart(2, '0');
        reportInfo.reportDate = `${year}-${month}-${day}`;
      }
    }
    
    // 如果没有报告类型，设置为默认类型
    if (!reportInfo.reportType) {
      reportInfo.reportType = '常规体检';
    }
    
    // 如果摘要为空，尝试提取包含"建议"的内容
    if (!reportInfo.summary) {
      const adviceMatch = text.match(/[^。]*建议[^。]*。/);
      if (adviceMatch) {
        reportInfo.summary = adviceMatch[0].trim();
      } else {
        // 使用文本的前100个字符作为摘要
        reportInfo.summary = text.substring(0, 100).trim() + '...';
      }
    }
  } catch (err) {
    console.error('增强信息提取失败', err);
  }
} 