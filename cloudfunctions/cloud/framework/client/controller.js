 /**
  * Notes: 基础控制器
  * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
  * Date: 2020-09-05 04:00:00 
  */
 class Controller {

 	constructor(route, openId, event) {
 		this._route = route; // 路由
 		this._openId = openId; //用户身份
		this._event = event; // 所有参数   
		
		// 支持两种方式获取参数：直接从event中获取或从event.params中获取
		if (event.params && typeof event.params === 'object') {
			this._request = event.params; // 数据参数
		} else {
			// 兼容旧的方式，从event中直接获取参数
			this._request = {};
			for (let key in event) {
				// 排除一些非参数字段
				if (key !== 'route' && key !== 'token' && key !== 'PID' && key !== 'tcbContext' && key !== 'userInfo') {
					this._request[key] = event[key];
				}
			}
		}
 	}

	/**
	 * 返回成功
	 * @param {*} data 
	 */
	success(data) {
		return {
			code: 0,
			msg: 'ok',
			data
		}
	}

	/**
	 * 返回失败
	 * @param {*} msg 
	 * @param {*} code 
	 */
	error(msg, code = 1) {
		return {
			code,
			msg
		}
	}
 }

 module.exports = Controller;