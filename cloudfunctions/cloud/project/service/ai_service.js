/**
 * Notes: AI医生服务
 */

const BaseService = require('./base_service.js');
const cloudBase = require('../../framework/cloud/cloud_base.js');
const cloudUtil = require('../../framework/cloud/cloud_util.js');
const config = require('../../config/config.js');
const util = require('../../framework/utils/util.js');
const timeUtil = require('../../framework/utils/time_util.js');
const https = require('https');

class AiService extends BaseService {

	/**
	 * 获取AI医生回复
	 * @param {Array} messages 聊天消息数组
	 */
	async getAiDoctorResponse(messages) {
		// 配置DeepSeek API
		const apiKey = config.DEEPSEEK_API_KEY; // 从配置文件中获取API密钥
		const apiEndpoint = config.DEEPSEEK_API_ENDPOINT || 'https://api.deepseek.com';
		const model = config.DEEPSEEK_MODEL || 'deepseek-chat';
		
		// 如果没有配置API密钥，返回错误
		if (!apiKey) {
			console.error('DeepSeek API密钥未配置');
			// 返回一个默认响应，而不是抛出错误
			return {
				text: '系统暂时无法提供服务，请联系管理员。'
			};
		}

		try {
			// 准备请求数据
			const data = {
				model: model,
				messages: messages,
				temperature: 0.7,
				max_tokens: 2000
			};

			// 发送请求到DeepSeek API
			const response = await this._callDeepSeekAPI(apiEndpoint, apiKey, data);
			
			// 返回AI回复文本
			if (response && response.choices && response.choices.length > 0) {
				const message = response.choices[0].message;
				if (message && message.content) {
					return {
						text: message.content
					};
				}
			}
			
			// 如果无法获取有效响应，返回默认消息
			console.error('API响应格式无效或为空');
			return {
				text: '很抱歉，我暂时无法回答您的问题。请稍后再试。'
			};
		} catch (error) {
			console.error('调用DeepSeek API失败:', error);
			
			// 检查是否是用户询问疲劳相关问题，如果是则返回预设答案
			try {
				if (messages && messages.length > 0) {
					const lastMessage = messages[messages.length - 1];
					if (lastMessage.role === 'user') {
						const userQuestion = lastMessage.content || '';
						
						if (userQuestion.includes('疲劳')) {
							return {
								text: '疲劳可能由多种原因引起，包括：\n\n1. 睡眠不足或睡眠质量差\n2. 工作压力过大\n3. 饮食不均衡\n4. 缺乏运动\n5. 贫血或营养不良\n6. 甲状腺功能异常\n7. 慢性疾病如糖尿病\n\n建议您保持规律作息，均衡饮食，适当运动。如果疲劳症状持续或严重影响日常生活，建议及时就医检查，找出具体原因。'
							};
						}
					}
				}
			} catch (e) {
				console.error('处理备用回复时出错:', e);
			}
			
			// 返回友好的错误消息
			return {
				text: '很抱歉，医疗咨询服务暂时不可用。请稍后再试，或者寻求医生的专业建议。'
			};
		}
	}

	/**
	 * 调用DeepSeek API
	 * @param {string} endpoint API端点
	 * @param {string} apiKey API密钥
	 * @param {object} data 请求数据
	 */
	async _callDeepSeekAPI(endpoint, apiKey, data) {
		return new Promise((resolve, reject) => {
			// 将数据转换为JSON字符串
			const jsonData = JSON.stringify(data);
			
			// 确保URL包含完整路径
			let apiUrl = endpoint;
			if (!apiUrl.includes('/v1/chat/completions')) {
				apiUrl = apiUrl.endsWith('/') ? apiUrl + 'v1/chat/completions' : apiUrl + '/v1/chat/completions';
			}
			
			// 解析URL
			const urlObj = new URL(apiUrl);
			
			// 设置请求选项
			const options = {
				hostname: urlObj.hostname,
				path: urlObj.pathname,
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
					'Content-Length': Buffer.byteLength(jsonData)
				}
			};
			
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
						// 解析JSON响应
						const parsedData = JSON.parse(responseData);
						
						if (res.statusCode >= 200 && res.statusCode < 300) {
							resolve(parsedData);
						} else {
							reject(new Error(`API请求失败: ${parsedData.error?.message || '未知错误'}`));
						}
					} catch (error) {
						reject(new Error(`解析API响应失败: ${error.message}`));
					}
				});
			});
			
			// 处理请求错误
			req.on('error', (error) => {
				reject(new Error(`API请求出错: ${error.message}`));
			});
			
			// 发送请求数据
			req.write(jsonData);
			req.end();
		});
	}
}

module.exports = AiService; 