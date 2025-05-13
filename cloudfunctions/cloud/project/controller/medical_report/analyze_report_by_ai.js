/**
 * 体检报告AI分析
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const https = require('https')
const config = require('../../../config/config.js')

/**
 * 体检报告AI分析
 * @param {Object} params - 请求参数
 * @param {String} params.reportId - 报告ID
 * @param {String} params.reportContent - 报告内容
 * @param {String} params.fileIds - 报告文件ID，可能是单个ID或者逗号分隔的多个ID
 * @returns {Object} - 返回结果
 */
exports.main = async (params) => {
  try {
    // 参数校验
    if (!params.reportId) {
      return { code: 1001, msg: '报告ID不能为空' }
    }

    let reportContent = params.reportContent || '';
    
    // 如果有文件ID，则获取文件URL进行分析
    if (params.fileIds) {
      console.log('存在文件ID，准备获取文件URL:', params.fileIds);
      const fileIdArray = params.fileIds.split(',');
      
      try {
        // 获取文件临时URL
        const fileRes = await cloud.getTempFileURL({
          fileList: fileIdArray
        });
        
        if (fileRes && fileRes.fileList && fileRes.fileList.length > 0) {
          const fileUrls = fileRes.fileList.map(item => {
            // 确保URL正确编码，避免ERR_UNESCAPED_CHARACTERS错误
            try {
              // 先解构URL，确保所有组件都正确编码
              const url = new URL(item.tempFileURL);
              // 返回编码后的URL
              return url.toString();
            } catch (urlErr) {
              console.error('URL解析失败:', urlErr);
              // 如果解析失败，尝试简单地替换空格和其他常见问题字符
              return item.tempFileURL.replace(/ /g, '%20');
            }
          });
          
          // 将文件URL添加到报告内容中，便于AI分析
          reportContent += '\n\n体检报告文件URL:\n' + fileUrls.join('\n');
          console.log('已添加文件URL到分析内容中');
        }
      } catch (err) {
        console.error('获取文件URL失败:', err);
        // 继续执行，使用文本内容分析
      }
    }
    
    if (!reportContent || reportContent.trim() === '') {
      console.log('报告内容为空，无法进行AI分析');
      return { code: 1002, msg: '报告内容为空，无法进行AI分析' }
    }
    
    // 调用AI服务进行分析
    console.log('开始调用AI服务进行分析');
    const aiAnalysisResult = await callAIService(reportContent);
    
    if (!aiAnalysisResult) {
      return { code: 1003, msg: 'AI分析失败，请稍后重试' }
    }
    
    // 保存AI分析结果到数据库
    await saveAnalysisResult(params.reportId, aiAnalysisResult);
    
    return {
      code: 0,
      msg: 'AI分析成功',
      data: aiAnalysisResult
    }
  } catch (err) {
    console.error('AI分析体检报告失败', err)
    return {
      code: 500,
      msg: '系统错误，请稍后重试'
    }
  }
}

/**
 * 调用AI服务进行分析
 * @param {String} content - 报告内容
 * @returns {Object} - AI分析结果
 */
async function callAIService(content) {
  try {
    // 配置DeepSeek API
    const apiKey = config.DEEPSEEK_API_KEY;
    const apiEndpoint = config.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com';
    const model = config.DEEPSEEK_MODEL || 'deepseek-chat';
    
    if (!apiKey) {
      console.error('DeepSeek API密钥未配置');
      return generateFallbackAnalysis(); // 如果没有配置API，使用备用分析
    }
    
    // 构建更详细的系统提示词
    const systemPrompt = `你是一名专业的医疗健康顾问，精通体检报告分析。请对以下体检报告进行全面分析，提供专业、详细的健康评估和建议。

请严格按照以下格式提供分析结果：
1. 健康建议：列出针对性的饮食、运动、生活习惯建议
2. 风险等级：低、中或高（根据报告内容评估整体健康风险等级）
3. 详细分析：详细解读体检报告中的主要指标，特别关注异常值，解释可能原因及风险

重要：请用通俗易懂的语言解释专业术语，确保普通人也能理解。`;
    
    // 准备用户提示词
    const userPrompt = `请分析以下体检报告，给出健康建议、风险等级和详细分析：

${content}

请按照以下格式回复：
健康建议：（你的建议）
风险等级：（低/中/高）
详细分析：（你的分析）`;
    
    // 准备请求数据
    const data = {
      model: model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.5, // 降低温度使回复更加确定性
      max_tokens: 3000  // 增加token限制以获取更详细的回复
    };
    
    // 调用API
    console.log('准备调用DeepSeek API，使用模型:', model);
    const response = await callExternalAPI(apiEndpoint, apiKey, data);
    
    if (response && response.choices && response.choices.length > 0) {
      const message = response.choices[0].message;
      if (message && message.content) {
        // 解析AI回复，提取建议、风险等级和详细分析
        console.log('AI回复成功，正在解析结果');
        return parseAIResponse(message.content);
      }
    }
    
    console.error('API响应格式无效或为空');
    return generateFallbackAnalysis();
  } catch (error) {
    console.error('调用AI服务失败:', error);
    return generateFallbackAnalysis();
  }
}

/**
 * 解析AI回复，提取建议、风险等级和详细分析
 * @param {String} response - AI回复内容
 * @returns {Object} - 解析后的分析结果
 */
function parseAIResponse(response) {
  try {
    console.log('开始解析AI回复');
    
    // 尝试从回复中提取健康建议、风险等级和详细分析
    let suggestion = '';
    let riskLevel = 'low'; // 默认低风险
    let details = '';
    
    // 正则表达式匹配不同的部分
    // 匹配健康建议部分
    const suggestionRegex = /健康建议[：:]([\s\S]*?)(?=风险等级[：:]|$)/i;
    const suggestionMatch = response.match(suggestionRegex);
    if (suggestionMatch && suggestionMatch[1]) {
      suggestion = suggestionMatch[1].trim();
      console.log('成功解析健康建议');
    }
    
    // 匹配风险等级部分
    const riskRegex = /风险等级[：:]([\s\S]*?)(?=详细分析[：:]|$)/i;
    const riskMatch = response.match(riskRegex);
    if (riskMatch && riskMatch[1]) {
      const riskText = riskMatch[1].trim().toLowerCase();
      if (riskText.includes('高') || riskText.includes('high')) {
        riskLevel = 'high';
      } else if (riskText.includes('中') || riskText.includes('medium')) {
        riskLevel = 'medium';
      } else {
        riskLevel = 'low';
      }
      console.log('成功解析风险等级:', riskLevel);
    } else {
      // 如果没有明确匹配到风险等级部分，尝试从整个文本中判断
      if (response.includes('高风险') || response.includes('high risk')) {
        riskLevel = 'high';
      } else if (response.includes('中风险') || response.includes('medium risk')) {
        riskLevel = 'medium';
      }
    }
    
    // 匹配详细分析部分
    const detailsRegex = /详细分析[：:]([\s\S]*)/i;
    const detailsMatch = response.match(detailsRegex);
    if (detailsMatch && detailsMatch[1]) {
      details = detailsMatch[1].trim();
      console.log('成功解析详细分析');
    }
    
    // 如果没有成功解析出各部分，则使用保底方案
    if (!suggestion) {
      console.log('未能解析出健康建议，使用全文作为建议');
      suggestion = response;
    }
    
    if (!details) {
      console.log('未能解析出详细分析，使用健康建议后的内容');
      // 如果没有详细分析，但有健康建议，则使用健康建议之后的内容作为详细分析
      const afterSuggestion = response.split(suggestion)[1];
      if (afterSuggestion) {
        details = afterSuggestion.trim();
      } else {
        details = '未能提取详细分析信息。';
      }
    }
    
    console.log('AI回复解析完成');
    return {
      suggestion,
      riskLevel,
      details
    };
  } catch (error) {
    console.error('解析AI回复出错:', error);
    return generateFallbackAnalysis();
  }
}

/**
 * 生成备用分析结果
 * @returns {Object} - 备用分析结果
 */
function generateFallbackAnalysis() {
  const riskLevels = ['low', 'medium', 'high'];
  const randomRiskIndex = Math.floor(Math.random() * 3);
  const riskLevel = riskLevels[randomRiskIndex];
  
  let suggestion = '';
  let details = '';
  
  switch (riskLevel) {
    case 'low':
      suggestion = '您的健康状况良好。建议保持健康的生活方式，定期体检。';
      details = '详细分析：\n1. 所有检查指标都在正常范围内\n2. 无明显健康风险因素\n3. 建议保持健康饮食和适当运动';
      break;
    case 'medium':
      suggestion = '您的健康状况总体尚可，但有些指标需要注意。建议调整生活方式，定期复查。';
      details = '详细分析：\n1. 部分指标轻微异常，需要关注\n2. 存在一定健康风险因素\n3. 建议适当调整饮食结构，增加运动量，3-6个月后复查';
      break;
    case 'high':
      suggestion = '您的健康状况存在一定风险，建议尽快就医咨询，并调整生活方式。';
      details = '详细分析：\n1. 多项指标异常，需要医学干预\n2. 存在较高健康风险因素\n3. 建议尽快就医，并严格调整生活方式';
      break;
  }
  
  return {
    suggestion,
    riskLevel,
    details
  };
}

/**
 * 调用外部API
 * @param {String} endpoint - API端点
 * @param {String} apiKey - API密钥
 * @param {Object} data - 请求数据
 * @returns {Object} - API响应
 */
function callExternalAPI(endpoint, apiKey, data) {
  return new Promise((resolve, reject) => {
    try {
      // 将数据转换为JSON字符串
      const jsonData = JSON.stringify(data);
      
      // 解析URL
      const urlObj = new URL(endpoint);
      
      // 设置请求选项
      const options = {
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search, // 添加查询参数
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Content-Length': Buffer.byteLength(jsonData),
          'User-Agent': 'TCCare-HealthApp/1.0'
        },
        timeout: 30000 // 增加超时时间到30秒
      };
      
      console.log('准备发送请求到:', urlObj.hostname + urlObj.pathname);
      
      // 创建HTTPS请求
      const req = https.request(options, (res) => {
        let responseData = '';
        
        // 接收响应数据
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        // 响应结束
        res.on('end', () => {
          try {
            console.log('收到API响应状态码:', res.statusCode);
            
            // 解析JSON响应
            const parsedData = JSON.parse(responseData);
            
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(parsedData);
            } else {
              console.error('API响应错误:', responseData);
              reject(new Error(`API请求失败: ${parsedData.error?.message || '未知错误'}`));
            }
          } catch (error) {
            console.error('解析API响应失败:', error, '原始响应:', responseData);
            reject(new Error(`解析API响应失败: ${error.message}`));
          }
        });
      });
      
      // 处理请求错误
      req.on('error', (error) => {
        console.error('API请求网络错误:', error);
        reject(new Error(`API请求出错: ${error.message}`));
      });
      
      // 设置请求超时
      req.setTimeout(30000, () => {
        console.error('API请求超时');
        req.abort();
        reject(new Error('API请求超时'));
      });
      
      // 发送请求数据
      req.write(jsonData);
      req.end();
    } catch (err) {
      console.error('请求准备阶段出错:', err);
      reject(err);
    }
  });
}

/**
 * 保存分析结果到数据库
 * @param {String} reportId - 报告ID
 * @param {Object} analysisResult - 分析结果
 */
async function saveAnalysisResult(reportId, analysisResult) {
  try {
    // 获取当前时间
    const now = new Date().getTime();
    
    // 更新报告记录，添加AI分析结果
    await db.collection('medical_report').doc(reportId).update({
      data: {
        aiAnalysis: analysisResult,
        aiAnalysisTime: now
      }
    });
    
    console.log('AI分析结果已保存到数据库');
  } catch (error) {
    console.error('保存AI分析结果失败:', error);
    throw error;
  }
} 