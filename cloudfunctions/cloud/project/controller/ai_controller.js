/**
 * Notes: AI医生模块控制器
 */

const BaseController = require('./base_controller.js');
const AiService = require('../service/ai_service.js');

class AiController extends BaseController {

	/** 与AI医生对话 */
	async doctor() {
		// 数据校验
		let rules = {
			messages: 'array|name=聊天记录',
		};

		try {
			// 取得数据
			let input = this.validateData(rules);
			
			let service = new AiService();
			
			try {
				const result = await service.getAiDoctorResponse(input.messages);
				
				// 确保返回数据格式一致
				if (result && result.text) {
					return {
						code: 200,
						msg: '调用成功',
						data: result
					};
				} else if (typeof result === 'string') {
					return {
						code: 200,
						msg: '调用成功',
						data: {
							text: result
						}
					};
				} else {
					return {
						code: 200,
						msg: '调用成功',
						data: {
							text: '对不起，无法生成回复'
						}
					};
				}
			} catch (serviceError) {
				console.error('AI服务响应出错:', serviceError);
				return {
					code: 200, // 改为200，确保前端能接收到消息
					msg: '请求成功，但处理出错',
					data: {
						text: '对不起，我暂时无法回答您的问题。医疗服务暂时不可用，请稍后再试。'
					}
				};
			}
		} catch (error) {
			console.error('AI医生回复出错:', error);
			return {
				code: 200, // 改为200，确保前端能接收到消息
				msg: '请求成功，但处理出错',
				data: {
					text: '对不起，我暂时无法回答您的问题。请稍后再试。'
				}
			};
		}
	}

}

module.exports = AiController; 