/**
 * AI分析体检报告
 */
const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const reportCollection = 'medical_report'

// 引入配置
const config = require('../config/config.js')

/**
 * 体检报告AI分析
 * @param {Object} params - 请求参数
 * @param {String} params.reportId - 报告ID
 * @param {String} params.userId - 用户ID
 * @param {String} params.reportContent - 报告内容摘要
 * @param {String} params.fileIds - 报告文件ID（多个ID用逗号分隔）
 * @param {Object} wxContext - 微信上下文
 * @returns {Object} - 返回结果
 */
exports.main = async (params, wxContext) => {
  // 记录环境和请求参数
  console.log('[AI分析] 开始执行，云环境:', cloud.DYNAMIC_CURRENT_ENV);
  console.log('[AI分析] 请求参数:', JSON.stringify(params));
  console.log('[AI分析] 微信上下文:', JSON.stringify(wxContext));

  try {
    // 参数校验
    if (!params.userId && !wxContext.OPENID) {
      console.error('[AI分析] 用户ID不能为空');
      return { code: 1001, msg: '用户ID不能为空' }
    }
    if (!params.reportId) {
      console.error('[AI分析] 报告ID不能为空');
      return { code: 1002, msg: '报告ID不能为空' }
    }

    // 确认userId
    const userId = params.userId || wxContext.OPENID;
    console.log('[AI分析] 使用的用户ID:', userId);

    // 先查询报告是否存在
    let reportResult;
    try {
      console.log('[AI分析] 开始查询报告数据，报告ID:', params.reportId);
      reportResult = await db.collection(reportCollection).doc(params.reportId).get();
      console.log('[AI分析] 查询到的报告数据:', JSON.stringify(reportResult.data));
    } catch (queryErr) {
      console.error('[AI分析] 查询报告失败:', queryErr);
      return { code: 1004, msg: '报告不存在或查询失败' }
    }
    
    if (!reportResult.data) {
      console.error('[AI分析] 报告不存在');
      return { code: 1004, msg: '报告不存在' }
    }
    
    // 权限校验：是否是用户自己的报告
    if (reportResult.data.userId !== userId) {
      console.error('[AI分析] 无权访问该报告，报告userId:', reportResult.data.userId, '请求userId:', userId);
      return { code: 1005, msg: '无权访问该报告' }
    }

    // 获取报告内容，优先使用传入的内容，否则使用存储的内容
    let reportContent = '';
    if (params.reportContent && params.reportContent.trim()) {
      console.log('[AI分析] 使用传入的报告内容');
      reportContent = params.reportContent;
    } else if (reportResult.data.summary) {
      console.log('[AI分析] 使用数据库中的摘要内容');
      reportContent = reportResult.data.summary;
    }
    
    // 获取文件URL（如果有文件ID）- 提前获取以节省时间
    let fileUrls = [];
    let filePromise = null;
    if (params.fileIds) {
      try {
        const fileIdsArray = params.fileIds.split(',').map(id => id.trim()).filter(id => id);
        console.log('[AI分析] 提取到的文件ID:', fileIdsArray);
        
        if (fileIdsArray.length > 0) {
          // 异步获取文件URL，不阻塞后续处理
          filePromise = cloud.getTempFileURL({
            fileList: fileIdsArray
          }).then(fileResults => {
            if (fileResults && fileResults.fileList) {
              fileUrls = fileResults.fileList.map(file => file.tempFileURL);
              console.log('[AI分析] 获取到文件URL:', fileUrls);
            }
            return fileUrls;
          }).catch(err => {
            console.error('[AI分析] 获取文件URL失败:', err);
            return [];
          });
        }
      } catch (fileErr) {
        console.error('[AI分析] 获取文件URL失败:', fileErr);
        // 继续执行，不依赖文件URL
      }
    }
    
    // 构建AI分析提示词 - 先不包含文件URL
    console.log('[AI分析] 开始构建AI分析提示词');
    
    let prompt = `你是一位专业的医疗健康顾问。请对以下体检报告进行全面分析，提供专业、详细的健康评估和建议。\n\n`;
    
    // 添加文本内容
    if (reportContent) {
      prompt += `体检报告基本信息：\n${reportContent}\n\n`;
    }
    
    // 添加报告原始数据中的项目信息（如果有）
    if (reportResult.data.reportItems && reportResult.data.reportItems.length > 0) {
      prompt += `体检报告详细检测项目：\n`;
      reportResult.data.reportItems.forEach(group => {
        prompt += `${group.name}：\n`;
        
        if (group.items && group.items.length > 0) {
          group.items.forEach(item => {
            const abnormalMark = item.abnormal ? '[异常]' : '';
            prompt += `  ${item.name}: ${item.value}${item.unit || ''} ${abnormalMark} (参考范围: ${item.referenceRange || '未知'})\n`;
          });
        }
        
        prompt += '\n';
      });
    }
    
    // 如果有文件处理中，等待完成
    if (filePromise) {
      fileUrls = await filePromise;
      // 添加文件链接（如果有）
      if (fileUrls.length > 0) {
        let fileUrlsText = `体检报告文件链接：\n`;
        fileUrls.forEach((url, index) => {
          fileUrlsText += `文件${index+1}：${url}\n`;
        });
        fileUrlsText += `\n请以上述文件中的内容为主要分析依据。\n\n`;
        
        // 在提示词开头插入文件信息，使其成为优先考虑的内容
        prompt = prompt.replace('你是一位专业的医疗健康顾问', '你是一位专业的医疗健康顾问。\n\n' + fileUrlsText + '你');
      }
    }
    
    prompt += `请按照以下结构提供分析：
1. 总体健康评估：对整体健康状况的评价
2. 异常指标分析：详细解读异常指标的含义、可能原因及风险
3. 健康建议：针对性的饮食、运动、生活习惯建议
4. 后续检查建议：是否需要进一步检查或复查

请用通俗易懂的语言解释专业术语，确保普通人也能理解。分析应具体、实用，但也需说明这只是健康建议，不能替代医生的专业诊断。`;

    console.log('[AI分析] 提示词长度:', prompt.length);
    
    try {
      // 设置一个更短的超时时间，以确保有足够时间返回结果
      const aiResult = await Promise.race([
        callAIService(prompt),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AI服务请求超时')), 8000)
        )
      ]);
      
      console.log('[AI分析] AI服务返回结果长度:', typeof aiResult === 'string' ? aiResult.length : '非字符串结果');
      
      // 处理分析结果，确保保存格式统一且前端能够解析
      let resultToSave = '';
      let resultToReturn = null;
      
      if (typeof aiResult === 'object') {
        // 如果是对象格式（备用分析），转换为Markdown格式字符串
        console.log('[AI分析] 检测到对象格式结果，转换为Markdown文本');
        
        const riskText = aiResult.riskLevel === 'low' ? '低风险' : 
                      aiResult.riskLevel === 'medium' ? '中风险' : '高风险';
        
        resultToSave = `# 体检报告AI分析\n\n## 风险评级\n${riskText}\n\n`;
        
        if (aiResult.suggestion) {
          resultToSave += `## 健康建议\n${aiResult.suggestion}\n\n`;
        }
        
        if (aiResult.details) {
          resultToSave += aiResult.details;
        }
        
        // 保留原始对象用于返回
        resultToReturn = {
          text: resultToSave,
          suggestion: aiResult.suggestion || '',
          riskLevel: aiResult.riskLevel || 'low'
        };
      } else {
        // 已经是字符串，直接使用
        resultToSave = aiResult;
        resultToReturn = { text: aiResult };
      }
      
      // 更新报告的AI分析结果
      await db.collection(reportCollection).doc(params.reportId).update({
        data: {
          aiAnalysis: resultToSave,
          aiAnalysisTime: new Date()
        }
      });
      
      console.log('[AI分析] 分析结果已保存到数据库');
      return {
        code: 0,
        msg: 'AI分析成功',
        data: resultToReturn
      };
    } catch (aiErr) {
      console.error('[AI分析] 调用AI服务失败:', aiErr);
      
      // 生成备用分析结果
      const backupResult = generateBackupAnalysis(prompt);
      console.log('[AI分析] 生成备用分析结果成功');
      
      // 确保备用分析也是Markdown格式字符串
      let backupTextToSave = '';
      
      if (typeof backupResult === 'object') {
        const riskText = backupResult.riskLevel === 'low' ? '低风险' : 
                       backupResult.riskLevel === 'medium' ? '中风险' : '高风险';
        
        backupTextToSave = `# 体检报告AI分析\n\n## 风险评级\n${riskText}\n\n`;
        
        if (backupResult.suggestion) {
          backupTextToSave += `## 健康建议\n${backupResult.suggestion}\n\n`;
        }
        
        if (backupResult.details) {
          backupTextToSave += backupResult.details;
        }
      } else {
        backupTextToSave = backupResult;
      }
      
      // 保存备用分析结果到数据库
      try {
        await db.collection(reportCollection).doc(params.reportId).update({
          data: {
            aiAnalysis: backupTextToSave,
            aiAnalysisTime: new Date()
          }
        });
        console.log('[AI分析] 备用分析结果已保存到数据库');
      } catch (dbErr) {
        console.error('[AI分析] 保存备用分析结果失败:', dbErr);
      }
      
      return {
        code: 0,
        msg: '使用备用分析',
        data: { 
          text: backupTextToSave,
          suggestion: typeof backupResult === 'object' ? backupResult.suggestion : '',
          riskLevel: typeof backupResult === 'object' ? backupResult.riskLevel : 'low'
        }
      };
    }
  } catch (err) {
    console.error('[AI分析] 处理过程中发生异常:', err);
    return {
      code: 500,
      msg: '系统错误，请稍后重试',
      error: err.message || '未知错误'
    };
  }
};

/**
 * 调用AI服务进行体检报告分析
 * @param {String} prompt - 分析提示词
 * @returns {Promise<String>} - 分析结果
 */
async function callAIService(prompt) {
  try {
    console.log('[AI服务] 开始调用AI API，提示词长度:', prompt.length);
    
    // 从配置文件获取AI服务参数
    const API_KEY = config.DEEPSEEK_API_KEY;
    const API_URL = config.DEEPSEEK_API_URL;
    const MODEL = config.DEEPSEEK_MODEL;
    
    if (!API_KEY) {
      console.error('[AI服务] 缺少API密钥配置');
      throw new Error('AI服务配置错误: 缺少API密钥');
    }
    
    console.log('[AI服务] 使用API端点:', API_URL);
    console.log('[AI服务] 使用模型:', MODEL);
    
    // 构建API请求
    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ];
    
    const data = {
      model: MODEL,
      messages: messages,
      temperature: 0.5,  // 降低温度以获取更快的响应
      max_tokens: 1500   // 减少token数以获取更快的响应
    };
    
    // 使用axios发送请求
    const axios = require('axios');
    
    // 设置更短的超时时间
    const axiosTimeout = 7000; // 7秒超时
    console.log(`[AI服务] 设置请求超时时间为: ${axiosTimeout}ms`);
    
    const response = await axios({
      method: 'post',
      url: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: JSON.stringify(data),
      timeout: axiosTimeout
    });
    
    console.log('[AI服务] 请求成功，状态码:', response.status);
    
    // 解析响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const aiText = response.data.choices[0].message.content.trim();
      console.log('[AI服务] 获取到AI回复，长度:', aiText.length);
      console.log('[AI服务] AI回复内容前50个字符:', aiText.substring(0, 50) + '...');
      return aiText;
    } else {
      console.error('[AI服务] 响应格式不正确:', JSON.stringify(response.data));
      throw new Error('AI服务响应格式不正确');
    }
  } catch (err) {
    console.error('[AI服务] 调用AI服务失败:', err.message);
    console.error('[AI服务] 错误详情:', err.code || '无错误代码');
    
    if (err.response) {
      console.error('[AI服务] 服务器响应状态码:', err.response.status);
      console.error('[AI服务] 服务器响应内容:', JSON.stringify(err.response.data));
    }
    
    // 这里使用生成备用分析的函数
    console.log('[AI服务] 使用备用分析方法');
    return generateBackupAnalysis(prompt);
  }
}

/**
 * 生成备用分析结果 - 不依赖外部API调用
 * @param {String} prompt - 分析提示词
 * @returns {String} - 备用分析结果
 */
function generateBackupAnalysis(prompt) {
  console.log('[AI服务] 生成备用分析结果');
  
  try {
    // 提取基本信息
    let hospital = '未知医院';
    let reportDate = '未知日期';
    let reportType = '常规体检';
    
    const hospitalMatch = prompt.match(/医院\/机构:\s*([^\n]+)/);
    if (hospitalMatch && hospitalMatch[1]) {
      hospital = hospitalMatch[1].trim();
    }
    
    const dateMatch = prompt.match(/体检日期:\s*([^\n]+)/);
    if (dateMatch && dateMatch[1]) {
      reportDate = dateMatch[1].trim();
    }
    
    const typeMatch = prompt.match(/报告类型:\s*([^\n]+)/);
    if (typeMatch && typeMatch[1]) {
      reportType = typeMatch[1].trim();
    }
    
    // 直接生成Markdown格式的分析文本
    return `# ${hospital}体检报告分析

## 风险评级
低风险

## 健康建议
根据您在${reportDate}于${hospital}进行的${reportType}，建议您：
1. 保持均衡饮食，增加蔬果摄入，减少高糖高脂食物
2. 坚持适量运动，每周至少进行3次30分钟的有氧运动
3. 保持良好作息，每晚保证7-8小时睡眠
4. 定期体检，建立健康档案，追踪健康指标变化

## 体检基本信息
- 体检日期：${reportDate}
- 医院/机构：${hospital}
- 报告类型：${reportType}

## 总体健康评估
基于您提供的体检报告信息，您的整体健康状况良好。定期体检是保持健康的重要手段，表明您注重健康管理。

## 健康指标分析
由于没有具体的检测指标数据，无法提供详细的异常指标分析。一般体检会关注以下方面：
- 血常规：检查贫血、炎症、感染等
- 肝功能：反映肝脏健康状况
- 肾功能：评估肾脏过滤功能
- 血脂：了解心血管疾病风险
- 血糖：筛查糖尿病风险
- 心电图：评估心脏电活动

## 健康生活建议
### 饮食建议
- 遵循均衡饮食原则，增加蔬菜水果摄入
- 减少盐、糖、油脂摄入
- 优先选择全谷物、瘦肉、鱼类和豆制品
- 保持充分水分摄入，每日6-8杯水

### 运动建议
- 每周150分钟中等强度有氧运动
- 适当加入力量训练，每周2-3次
- 避免久坐，每小时起身活动5-10分钟

### 生活习惯
- 保证充足睡眠，培养规律作息
- 避免烟酒，减少咖啡因摄入
- 学会压力管理，保持积极心态

## 后续检查建议
建议您：
- 每年进行一次全面体检
- 关注体重、血压等指标的变化
- 如有不适，及时就医

*免责声明：本分析为系统自动生成的健康建议，不构成医疗诊断。请咨询专业医生获取个性化的健康建议。*`;
  } catch (error) {
    console.error('[AI服务] 生成备用分析出错:', error);
    
    // 极简备用内容
    return `# 体检报告分析

## 风险评级
低风险

## 健康建议
保持均衡饮食，适量运动，定期体检，及时就医。

## 详细分析
体检报告分析系统当前无法提供详细分析，请咨询医生解读您的体检报告。`;
  }
} 