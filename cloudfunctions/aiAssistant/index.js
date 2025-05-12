/**
 * AI助手云函数入口
 */
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 引入OpenAI SDK
const importNotAvailableInServerless = (name) => 
  Promise.reject(new Error(`Cannot import ${name} in this environment. Please install the package in server environment.`));

let OpenAI;
try {
  OpenAI = require('openai');
} catch (e) {
  console.error('OpenAI SDK 加载失败:', e);
  OpenAI = { OpenAI: class MockOpenAI {} };
}

// AI接口密钥（实际使用请从环境变量或数据库获取，不要硬编码）
const AI_KEY = process.env.OPENAI_API_KEY || '您的API密钥';
const AI_MODEL = 'gpt-3.5-turbo';

// 初始化OpenAI API
let openai;
try {
  openai = new OpenAI({ apiKey: AI_KEY });
} catch (e) {
  console.error('OpenAI 初始化失败:', e);
  openai = {
    chat: {
      completions: {
        create: () => Promise.reject(new Error('OpenAI client not available'))
      }
    }
  };
}

/**
 * 生成健康建议
 * @param {Object} healthData 健康数据
 */
async function getHealthAdvice(healthData) {
  try {
    console.log('开始生成AI健康建议, 输入数据:', healthData);
    
    // 构建AI提示信息
    const prompt = buildHealthAdvicePrompt(healthData);
    
    // 调用OpenAI接口
    const response = await openai.chat.completions.create({
      model: AI_MODEL,
      messages: [
        { 
          role: 'system', 
          content: '你是一位专业的健康顾问AI助手，基于用户的健康数据提供个性化的健康建议。你的建议应当专业、全面、易于理解，并且针对用户的具体健康状况。请使用礼貌、关心的语气，但不要过度使用敬语。'
        },
        { 
          role: 'user', 
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 800
    });
    
    // 提取返回的AI健康建议
    const advice = response.choices[0]?.message?.content || '抱歉，暂时无法生成健康建议。';
    console.log('AI健康建议生成成功');
    
    return {
      code: 0,
      advice,
      msg: '获取AI健康建议成功'
    };
  } catch (error) {
    console.error('生成AI健康建议失败:', error);
    
    // 返回错误信息
    return {
      code: 500,
      msg: '生成AI健康建议失败: ' + (error.message || '未知错误'),
      error: error.message
    };
  }
}

/**
 * 构建健康建议提示信息
 */
function buildHealthAdvicePrompt(data) {
  try {
    const { healthData } = data;
    const profile = healthData.profile || {};
    const metrics = healthData.metrics || [];
    const score = healthData.score || 0;
    
    let prompt = `我需要你为一位用户提供个性化的健康建议。以下是用户的健康数据：\n\n`;
    
    // 添加用户基本信息
    prompt += `基本信息：\n`;
    prompt += `- 年龄：${profile.age || '未知'}\n`;
    prompt += `- 性别：${profile.gender || '未知'}\n`;
    prompt += `- 身高：${profile.height || '未知'} cm\n`;
    prompt += `- 体重：${profile.weight || '未知'} kg\n`;
    prompt += `- BMI：${profile.bmi || '未知'}\n\n`;
    
    // 添加健康指标信息
    if (metrics.length > 0) {
      prompt += `健康指标：\n`;
      metrics.forEach(metric => {
        prompt += `- ${metric.name}：${metric.value || '未知'}，状态：${metric.status || '未知'}\n`;
      });
      prompt += `\n`;
    }
    
    // 添加健康评分
    prompt += `健康评分：${score}/100\n\n`;
    
    // 添加请求内容
    prompt += `请基于以上数据，提供一段详细、个性化的健康建议。`;
    prompt += `建议应该包括：\n`;
    prompt += `1. 对当前健康状况的总体评价\n`;
    prompt += `2. 针对异常指标的具体改善建议\n`;
    prompt += `3. 适合此用户的日常健康管理建议（饮食、运动、作息等）\n`;
    prompt += `4. 需要特别关注的健康风险（如有）\n\n`;
    prompt += `请使用友好、专业的语气，并以第二人称（您）来撰写建议。最终输出控制在300字左右，简明扼要，易于理解。`;
    
    return prompt;
  } catch (error) {
    console.error('构建提示信息失败:', error);
    return `请为一位用户提供健康建议，基于健康评分${data.healthData?.score || 0}分。`; 
  }
}

// 云函数入口
exports.main = async (event, context) => {
  console.log('AI助手云函数收到请求:', event);
  const { action, data } = event;
  
  // 根据action调用不同的处理函数
  switch (action) {
    case 'getHealthAdvice':
      return await getHealthAdvice(data);
    default:
      return {
        code: 400,
        msg: '无效的action参数'
      };
  }
}; 