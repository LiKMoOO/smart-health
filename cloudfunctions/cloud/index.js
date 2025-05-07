const application = require('./framework/core/application.js');
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-5gebdbgka7397db4' }) //修改为你的云环境ID

const TcbRouter = require('tcb-router');

// 云函数入口函数
exports.main = async (event, context) => {
	console.log(event);
	
	// 处理cloud路由请求，从params中获取真正的路由
	if (event.route === 'cloud' && event.params && event.params.route) {
		// 修改event对象的route，使其指向真正的目标路由
		event.route = event.params.route;
		
		// 如果是medicalReport模块，将action和params提取到顶层
		if (event.params.route === 'medicalReport') {
			event.action = event.params.action;
			event.params = event.params.params || {};
		}
	}
	
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
	
	/**
	 * 体检报告模块路由处理
	 * 说明：该模块用于处理用户体检报告的上传、查询和AI分析功能
	 * 路由名称: medicalReport
	 * 支持的操作:
	 * 1. getReportList: 获取用户的体检报告列表
	 * 2. uploadReport: 上传新的体检报告
	 * 3. getReportDetail: 获取单个体检报告的详细信息
	 * 4. analyzeReportByAI: 对体检报告进行AI分析并提供健康建议
	 */
	if (event.route == 'medicalReport') {
		try {
			// 从请求中提取操作类型和参数
			const { action, params } = event;
			const wxContext = cloud.getWXContext();
			
			// 注入用户ID，确保每个请求都有用户标识
			// 优先使用params中的userId，如果没有则使用token或微信OPENID
			if (params && !params.userId) {
				params.userId = event.token || wxContext.OPENID || '';
			}
			
			// 根据不同操作类型分发到对应的控制器处理
			switch (action) {
				case 'getReportList':
					// 动态引入控制器，避免启动时加载错误
					// 该控制器负责获取用户的体检报告列表，支持分页
					const getReportList = require('./project/controller/medical_report/get_report_list');
					return await getReportList.main(params || {});
					
				case 'uploadReport':
					// 该控制器负责处理用户上传的体检报告
					// 包括保存报告基本信息和文件ID
					const uploadReport = require('./project/controller/medical_report/upload_report');
					return await uploadReport.main(params || {});
					
				case 'getReportDetail':
					// 该控制器负责获取单个体检报告的详细信息
					// 包括基本信息、检查项目和AI分析结果(如果有)
					const getReportDetail = require('./project/controller/medical_report/get_report_detail');
					return await getReportDetail.main(params || {});
					
				case 'analyzeReportByAI':
					// 该控制器负责对体检报告进行AI分析
					// 生成健康评估和建议
					const analyzeReportByAI = require('./project/controller/medical_report/analyze_report_by_ai');
					return await analyzeReportByAI.main(params || {});
					
				default:
					// 处理未知操作类型
					return { code: 404, msg: '未知操作' };
			}
		} catch (err) {
			// 统一错误处理，记录错误日志并返回用户友好的错误信息
			console.error('体检报告路由处理错误:', err);
			return {
				code: 500,
				msg: '服务器繁忙，请稍后重试',
				err: err.message
			};
		}
	}

	/**
	 * 健康管理模块路由处理
	 * 说明：该模块用于处理用户健康档案、健康指标和用药提醒相关功能
	 * 路由前缀: health/
	 * 支持的路由:
	 * 1. health/gethealthindex: 获取健康首页数据
	 * 2. health/gethealthmetrics: 获取健康指标数据
	 * 3. health/updatehealthdata: 更新健康数据
	 */
	if (event.route.startsWith('health/')) {
		try {
			const wxContext = cloud.getWXContext();
			// 始终使用微信OPENID作为用户标识，确保与ax_user中的USER_MINI_OPENID一致
			const openId = wxContext.OPENID;
			
			console.log('health路由处理, OPENID:', openId);
			
			// 确保params对象存在
			event.params = event.params || {};
			
			// 不再使用token，始终使用OPENID
			event.params.userId = openId;
			
			// 调用health云函数
			return await cloud.callFunction({
				name: 'health',
				data: {
					route: event.route,
					params: event.params
				}
			}).then(res => res.result);
		} catch (err) {
			console.error('健康管理路由处理错误:', err);
			return {
				code: 500,
				msg: '服务器繁忙，请稍后重试',
				err: err.message
			};
		}
	}

	// 处理其他所有原有路由
	return await application.app(event, context);
}