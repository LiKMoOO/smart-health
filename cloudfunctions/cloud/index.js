const application = require('./framework/core/application.js');
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-5gebdbgka7397db4' }) //修改为你的云环境ID

const TcbRouter = require('tcb-router');

// 云函数入口函数
exports.main = async (event, context) => {
	// 添加AI医生路由
	if (event.route == 'ai/doctor') {
		try {
			const AiController = require('./project/controller/ai_controller.js');
			// 从event中获取openId，如果没有则使用云函数默认的openId
			const wxContext = cloud.getWXContext();
			const openId = event.token || wxContext.OPENID || '';
			
			// 正确传递路由、用户ID和事件参数
			const aiController = new AiController('ai/doctor', openId, event);
			return await aiController.doctor();
		} catch (err) {
			console.error('AI医生路由处理错误:', err);
			return {
				code: -1,
				msg: '处理请求时出错',
				err: err.message
			};
		}
	}
	
	// 添加体检报告路由
	if (event.route == 'medicalReport') {
		try {
			const { action, params } = event;
			const wxContext = cloud.getWXContext();
			
			// 调用medicalReport云函数
			return await cloud.callFunction({
				name: 'medicalReport',
				data: {
					action,
					params: {
						...params,
						userId: event.token || wxContext.OPENID || ''
					}
				}
			}).then(res => res.result);
		} catch (err) {
			console.error('体检报告路由处理错误:', err);
			return {
				code: 500,
				msg: '服务器繁忙，请稍后再试',
				err: err.message
			};
		}
	}

	// 处理其他所有原有路由
	return await application.app(event, context);
}