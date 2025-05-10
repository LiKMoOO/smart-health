const setting = require('./setting/setting.js');

App({
	onLaunch: function (options) {

		if (!wx.cloud) {
			console.error('请使用 2.2.3 或以上的基础库以使用云能力')
		} else {
			wx.cloud.init({
				// env 参数说明：
				//   env 参数决定接下来小程序发起的云开发调用（wx.cloud.xxx）会默认请求到哪个云环境的资源
				//   此处请填入环境 ID, 环境 ID 可打开云控制台查看
				//   如不填则使用默认环境（第一个创建的环境）
				// env: 'my-env-id',
				env: setting.CLOUD_ID,
				traceUser: true,
			})
		}

		this.globalData = {};

		// 用于自定义导航栏
		wx.getSystemInfo({
			success: e => {
				this.globalData.statusBar = e.statusBarHeight;
				let capsule = wx.getMenuButtonBoundingClientRect();
				if (capsule) {
					this.globalData.custom = capsule;
					this.globalData.customBar = capsule.bottom + capsule.top - e.statusBarHeight;
				} else {
					this.globalData.customBar = e.statusBarHeight + 50;
				} 
			}
		});
		
		// 获取用户OpenID并保存到本地存储
		this._getOpenID();
	},

	// 获取用户OpenID并保存到本地存储
	_getOpenID: function() {
		// 直接调用云函数获取OpenID
		wx.cloud.callFunction({
			name: 'cloud', // 使用主云函数
			data: {},      // 无需传参，云函数会自动获取调用者的openId
			success: res => {
				console.log('获取OpenID成功', res);
				if (res.result && res.result.openId) {
					let openId = res.result.openId;
					// 存储到本地
					wx.setStorageSync('OPENID', openId);
					console.log('用户OpenID已保存', openId);
				} else if (res.result && res.result.event && res.result.event.userInfo && res.result.event.userInfo.openId) {
					// 从event中获取
					let openId = res.result.event.userInfo.openId;
					wx.setStorageSync('OPENID', openId);
					console.log('用户OpenID已保存(从event获取)', openId);
				}
			},
			fail: err => {
				console.error('获取OpenID失败', err);
			}
		});
	},

	/*
	onShow: function (options) {
		// 启动，或者从后台进入前台
		//GroupBiz.initGroupShareTicket(options);
	},
	onHide: function () {
		// 小程序从前台进入后台
		//GroupBiz.clearGroupShareTicket();
	}*/
})