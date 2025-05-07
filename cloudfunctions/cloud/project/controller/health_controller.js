/**
 * Notes: 健康管理模块控制器
 * User: TCCare
 */

const BaseController = require('./base_controller.js');
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }); // 使用当前云环境

class HealthController extends BaseController {

	/** 
	 * 获取健康首页数据
	 */
	async getHealthIndex() {
		// 获取微信OPENID
		const wxContext = cloud.getWXContext();
		const openId = wxContext.OPENID;
		
		console.log('health_controller: getHealthIndex, OPENID =', openId);
		
		// 调用health云函数获取数据
		try {
			const result = await cloud.callFunction({
				name: 'health',
				data: {
					route: 'health/gethealthindex',
					params: {
						userId: openId // 使用OPENID作为userId
					}
				}
			});
			
			return result.result;
		} catch (err) {
			console.error('获取健康首页数据错误:', err);
			this.AppError('获取健康首页数据失败');
		}
	}

	/** 
	 * 获取健康指标数据
	 */
	async getHealthMetrics() {
		// 获取参数
		const params = this.getParams();
		
		// 获取微信OPENID
		const wxContext = cloud.getWXContext();
		const openId = wxContext.OPENID;
		
		console.log('health_controller: getHealthMetrics, OPENID =', openId);
		
		// 调用health云函数
		try {
			const result = await cloud.callFunction({
				name: 'health',
				data: {
					route: 'health/gethealthmetrics',
					params: {
						userId: openId, // 使用OPENID作为userId
						page: params.page || 1,
						size: params.size || 10,
						type: params.type || null
					}
				}
			});
			
			return result.result;
		} catch (err) {
			console.error('获取健康指标数据错误:', err);
			this.AppError('获取健康指标数据失败');
		}
	}

	/** 
	 * 更新健康数据
	 */
	async updateHealthData() {
		// 获取参数
		const params = this.getParams();
		
		// 获取微信OPENID
		const wxContext = cloud.getWXContext();
		const openId = wxContext.OPENID;
		
		console.log('health_controller: updateHealthData, OPENID =', openId);
		
		// 参数校验
		if (!params.dataType || !params.data) {
			this.AppError('参数错误');
		}
		
		// 调用health云函数
		try {
			const result = await cloud.callFunction({
				name: 'health',
				data: {
					route: 'health/updatehealthdata',
					params: {
						userId: openId, // 使用OPENID作为userId
						dataType: params.dataType,
						data: params.data
					}
				}
			});
			
			return result.result;
		} catch (err) {
			console.error('更新健康数据错误:', err);
			this.AppError('更新健康数据失败');
		}
	}
}

module.exports = HealthController;